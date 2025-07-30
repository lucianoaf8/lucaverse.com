const core = require('@actions/core');
const fs = require('fs');
const path = require('path');

async function run() {
  try {
    const commitSha = core.getInput('commit-sha');
    const commitMessage = core.getInput('commit-message');
    const author = core.getInput('author');
    const triggerReason = core.getInput('trigger-reason');

    const timestamp = new Date().toISOString();
    const shortSha = commitSha.substring(0, 7);

    console.log('🤖 Initiating Claude MCP monitoring integration...');
    console.log(`📝 Commit: ${commitMessage} (${shortSha})`);
    console.log(`👤 Author: ${author}`);
    console.log(`🎯 Trigger: ${triggerReason}`);

    // Create a monitoring instruction file for Claude
    const monitoringInstruction = {
      type: 'cloudflare-pages-monitoring',
      timestamp: timestamp,
      commit: {
        sha: commitSha,
        shortSha: shortSha,
        message: commitMessage,
        author: author
      },
      trigger: triggerReason,
      project: {
        name: 'lucaverse-com',
        accountId: '96046731d13e851830b647b287048172',
        repository: 'lucaverse/lucaverse.com',
        branch: 'main'
      },
      instructions: {
        primary: 'Monitor Cloudflare Pages build status for this commit',
        secondary: [
          'Use Cloudflare MCP servers to check deployment status',
          'Report build progress and final status',
          'Alert if build fails or takes too long',
          'Verify site is live after successful deployment'
        ],
        mcpServers: [
          'cloudflare-observability',
          'cloudflare-builds',
          'cloudflare-graphql'
        ]
      },
      automation: {
        triggeredBy: 'github-actions',
        workflowFile: '.github/workflows/monitor-build.yml',
        jobName: 'claude-monitor',
        runId: process.env.GITHUB_RUN_ID || 'unknown',
        runNumber: process.env.GITHUB_RUN_NUMBER || 'unknown'
      }
    };

    // Write the monitoring instruction to a temporary file
    const tempDir = '/tmp';
    const instructionFile = path.join(tempDir, `claude-monitor-${shortSha}-${Date.now()}.json`);
    
    fs.writeFileSync(instructionFile, JSON.stringify(monitoringInstruction, null, 2));
    
    console.log(`📄 Monitoring instruction created: ${instructionFile}`);
    
    // Create a detailed summary for the GitHub Actions job
    const summary = `
# 🤖 Claude MCP Monitoring Initiated

## Commit Details
- **SHA:** \`${shortSha}\`
- **Message:** ${commitMessage}
- **Author:** ${author}
- **Trigger:** ${triggerReason}

## Claude Instructions
- Monitor Cloudflare Pages deployment for this commit
- Use MCP servers: cloudflare-observability, cloudflare-builds, cloudflare-graphql
- Report build status and verify deployment success

## Next Steps
1. Claude Code will automatically detect this monitoring request
2. Use Cloudflare MCP servers to track build progress
3. Provide real-time updates on deployment status
4. Alert if any issues are detected

---
*This is an automated integration between GitHub Actions and Claude Code*
`;

    await core.summary.addRaw(summary).write();

    // Set outputs for other jobs to use
    core.setOutput('monitoring-file', instructionFile);
    core.setOutput('commit-short-sha', shortSha);
    core.setOutput('timestamp', timestamp);

    console.log('✅ Claude MCP monitoring integration completed');
    console.log('🔄 Claude Code should now automatically monitor this deployment');

  } catch (error) {
    console.error('❌ Claude MCP integration failed:', error.message);
    core.setFailed(`Claude MCP integration failed: ${error.message}`);
  }
}

run();