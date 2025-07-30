#!/usr/bin/env node

/**
 * Lucaverse.com Deployment Workflow
 * 
 * This script handles the complete deployment workflow:
 * 1. Builds the project locally
 * 2. Commits and pushes to main branch
 * 3. Monitors Cloudflare Pages build status
 * 4. Handles errors and retries if needed
 */

const { execSync, spawn } = require('child_process');
const https = require('https');

class DeploymentWorkflow {
  constructor() {
    this.accountId = '96046731d13e851830b647b287048172';
    this.projectName = 'lucaverse-com';
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN;
    this.maxRetries = 3;
    this.pollInterval = 30000; // 30 seconds
    this.maxWaitTime = 600000; // 10 minutes
  }

  log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  error(message) {
    console.error(`[${new Date().toISOString()}] ERROR: ${message}`);
  }

  async executeCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      this.log(`Executing: ${command}`);
      try {
        const result = execSync(command, { 
          encoding: 'utf8',
          stdio: 'inherit',
          ...options 
        });
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  async buildProject() {
    this.log('Building project locally...');
    try {
      await this.executeCommand('powershell.exe -Command "npm run build"');
      this.log('✅ Build completed successfully');
      return true;
    } catch (error) {
      this.error('❌ Build failed');
      throw error;
    }
  }

  async commitAndPush(commitMessage) {
    this.log('Committing and pushing changes...');
    try {
      await this.executeCommand('git add .');
      await this.executeCommand(`git commit -m "${commitMessage}"`);
      await this.executeCommand('git push origin main');
      this.log('✅ Changes pushed to main branch');
      return true;
    } catch (error) {
      this.error('❌ Git operations failed');
      throw error;
    }
  }

  async makeApiRequest(endpoint) {
    return new Promise((resolve, reject) => {
      const url = `https://api.cloudflare.com/client/v4${endpoint}`;
      const options = {
        method: 'GET', // Read-only monitoring
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

    return response.result[0]; // Latest deployment
  }

  async getBuildLogs(deploymentId) {
    try {
      const endpoint = `/accounts/${this.accountId}/pages/projects/${this.projectName}/deployments/${deploymentId}/history/logs`;
      const response = await this.makeApiRequest(endpoint);
      return response.result || [];
    } catch (error) {
      this.log(`Could not fetch build logs: ${error.message}`);
      return [];
    }
  }

  async monitorDeployment() {
    this.log('Monitoring Cloudflare Pages deployment...');
    const startTime = Date.now();
    let lastLoggedStage = null;
    let hasShownLogs = false;

    while (Date.now() - startTime < this.maxWaitTime) {
      try {
        const deployment = await this.getLatestDeployment();
        const status = deployment.latest_stage?.status || 'unknown';
        const stage = deployment.latest_stage?.name || 'unknown';
        const deploymentId = deployment.id;

        // Only log status changes to reduce noise
        if (stage !== lastLoggedStage) {
          this.log(`📊 Deployment status: ${status} (${stage})`);
          
          // Show build logs once when build starts
          if ((stage === 'build' || stage === 'deploy') && !hasShownLogs) {
            this.log('📋 Fetching build logs...');
            const logs = await this.getBuildLogs(deploymentId);
            if (logs.length > 0) {
              this.log('🔍 Recent build logs:');
              logs.slice(-10).forEach(log => {
                this.log(`   ${log.ts}: ${log.line}`);
              });
            }
            hasShownLogs = true;
          }
          lastLoggedStage = stage;
        }

        switch (status) {
          case 'success':
            this.log('✅ Deployment completed successfully!');
            this.log(`🌐 Site URL: ${deployment.url}`);
            this.log(`🚀 Deployment ID: ${deploymentId}`);
            
            // Show final logs
            const finalLogs = await this.getBuildLogs(deploymentId);
            if (finalLogs.length > 0) {
              this.log('📋 Final build summary:');
              finalLogs.slice(-5).forEach(log => {
                this.log(`   ${log.ts}: ${log.line}`);
              });
            }
            
            return { success: true, deployment };

          case 'failure':
            this.error('❌ Deployment failed');
            this.error(`🚨 Stage that failed: ${stage}`);
            
            // Show error logs
            const errorLogs = await this.getBuildLogs(deploymentId);
            if (errorLogs.length > 0) {
              this.error('📋 Error logs:');
              errorLogs.slice(-10).forEach(log => {
                this.error(`   ${log.ts}: ${log.line}`);
              });
            }
            
            return { success: false, error: `Deployment failed at ${stage}`, deployment, logs: errorLogs };

          case 'active':
          case 'idle':
            // Just continue monitoring, status already logged above
            break;

          default:
            this.log(`🔄 Status: ${status} (${stage})`);
        }

        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, this.pollInterval));

      } catch (error) {
        this.error(`Error checking deployment status: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, this.pollInterval));
      }
    }

    throw new Error('Deployment monitoring timed out');
  }

  async runWorkflow(commitMessage) {
    let retryCount = 0;

    while (retryCount < this.maxRetries) {
      try {
        this.log(`🚀 Starting deployment workflow (attempt ${retryCount + 1}/${this.maxRetries})`);
        
        // Step 1: Build project
        await this.buildProject();
        
        // Step 2: Commit and push
        await this.commitAndPush(commitMessage);
        
        // Step 3: Monitor deployment
        const result = await this.monitorDeployment();
        
        if (result.success) {
          this.log('🎉 Deployment workflow completed successfully!');
          return result;
        } else {
          throw new Error(result.error);
        }
        
      } catch (error) {
        retryCount++;
        this.error(`Workflow failed: ${error.message}`);
        
        if (retryCount < this.maxRetries) {
          this.log(`⏳ Retrying in 30 seconds... (${retryCount}/${this.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 30000));
        } else {
          this.error('❌ Maximum retries reached. Workflow failed.');
          throw error;
        }
      }
    }
  }
}

// CLI Usage
if (require.main === module) {
  const commitMessage = process.argv[2] || `feat: automated deployment ${new Date().toISOString()}`;
  
  if (!process.env.CLOUDFLARE_API_TOKEN) {
    console.error('❌ CLOUDFLARE_API_TOKEN environment variable is required');
    process.exit(1);
  }

  const workflow = new DeploymentWorkflow();
  
  workflow.runWorkflow(commitMessage)
    .then(() => {
      console.log('✅ Workflow completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Workflow failed:', error.message);
      process.exit(1);
    });
}

module.exports = DeploymentWorkflow;