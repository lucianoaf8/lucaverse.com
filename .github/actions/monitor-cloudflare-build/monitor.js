const core = require('@actions/core');
const https = require('https');

class CloudflareMonitor {
  constructor() {
    this.accountId = core.getInput('account-id');
    this.projectName = core.getInput('project-name');
    this.apiToken = core.getInput('api-token');
    this.maxWaitMinutes = parseInt(core.getInput('max-wait-minutes')) || 10;
    this.pollIntervalSeconds = parseInt(core.getInput('poll-interval-seconds')) || 30;
    this.maxWaitTime = this.maxWaitMinutes * 60 * 1000;
    this.pollInterval = this.pollIntervalSeconds * 1000;
  }

  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  async makeApiRequest(endpoint) {
    return new Promise((resolve, reject) => {
      const url = `https://api.cloudflare.com/client/v4${endpoint}`;
      const options = {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (!parsed.success) {
              reject(new Error(`API Error: ${parsed.errors?.[0]?.message || 'Unknown error'}`));
            } else {
              resolve(parsed);
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  async getLatestDeployment() {
    const endpoint = `/accounts/${this.accountId}/pages/projects/${this.projectName}/deployments`;
    const response = await this.makeApiRequest(endpoint);
    
    if (!response.success || !response.result || response.result.length === 0) {
      throw new Error('No deployments found');
    }

    return response.result[0];
  }

  async getBuildLogs(deploymentId) {
    try {
      const endpoint = `/accounts/${this.accountId}/pages/projects/${this.projectName}/deployments/${deploymentId}/history/logs`;
      const response = await this.makeApiRequest(endpoint);
      return response.result || [];
    } catch (error) {
      this.log(`⚠️ Could not fetch build logs: ${error.message}`);
      return [];
    }
  }

  async monitor() {
    this.log('🚀 Starting Cloudflare Pages build monitoring...');
    this.log(`📊 Account: ${this.accountId}`);
    this.log(`📦 Project: ${this.projectName}`);
    this.log(`⏱️ Max wait time: ${this.maxWaitMinutes} minutes`);
    this.log(`🔄 Poll interval: ${this.pollIntervalSeconds} seconds`);

    const startTime = Date.now();
    let lastLoggedStage = null;
    let hasShownInitialLogs = false;

    while (Date.now() - startTime < this.maxWaitTime) {
      try {
        const deployment = await this.getLatestDeployment();
        const status = deployment.latest_stage?.status || 'unknown';
        const stage = deployment.latest_stage?.name || 'unknown';
        const deploymentId = deployment.id;
        const deploymentUrl = deployment.url;

        // Log status changes
        if (stage !== lastLoggedStage) {
          this.log(`📊 Status: ${status} | Stage: ${stage} | ID: ${deploymentId}`);
          
          // Show logs when build starts
          if ((stage === 'build' || stage === 'deploy') && !hasShownInitialLogs) {
            this.log('📋 Fetching build logs...');
            const logs = await this.getBuildLogs(deploymentId);
            if (logs.length > 0) {
              this.log('🔍 Recent build activity:');
              logs.slice(-8).forEach(log => {
                this.log(`   ${log.ts}: ${log.line}`);
              });
            }
            hasShownInitialLogs = true;
          }
          lastLoggedStage = stage;
        }

        // Check final status
        switch (status) {
          case 'success':
            this.log('✅ Deployment completed successfully!');
            this.log(`🌐 Live URL: ${deploymentUrl}`);
            
            // Show final logs
            const finalLogs = await this.getBuildLogs(deploymentId);
            if (finalLogs.length > 0) {
              this.log('📋 Build completion summary:');
              finalLogs.slice(-5).forEach(log => {
                this.log(`   ${log.ts}: ${log.line}`);
              });
            }
            
            // Set outputs
            core.setOutput('status', 'success');
            core.setOutput('url', deploymentUrl);
            core.setOutput('deployment-id', deploymentId);
            
            return { success: true, deployment };

          case 'failure':
            this.log('❌ Deployment failed!');
            this.log(`🚨 Failed stage: ${stage}`);
            
            // Show error logs
            const errorLogs = await this.getBuildLogs(deploymentId);
            if (errorLogs.length > 0) {
              this.log('📋 Error logs:');
              errorLogs.slice(-10).forEach(log => {
                core.error(`   ${log.ts}: ${log.line}`);
              });
            }
            
            // Set outputs
            core.setOutput('status', 'failure');
            core.setOutput('deployment-id', deploymentId);
            
            throw new Error(`Deployment failed at stage: ${stage}`);

          case 'active':
          case 'idle':
            // Continue monitoring
            break;

          default:
            this.log(`🔄 Monitoring... Status: ${status} (${stage})`);
        }

        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, this.pollInterval));

      } catch (error) {
        if (error.message.includes('Deployment failed')) {
          throw error; // Re-throw deployment failures
        }
        this.log(`⚠️ Error checking status: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, this.pollInterval));
      }
    }

    throw new Error(`⏰ Monitoring timed out after ${this.maxWaitMinutes} minutes`);
  }
}

async function run() {
  try {
    const monitor = new CloudflareMonitor();
    await monitor.monitor();
  } catch (error) {
    core.setFailed(error.message);
    console.error('❌ Monitoring failed:', error.message);
  }
}

run();