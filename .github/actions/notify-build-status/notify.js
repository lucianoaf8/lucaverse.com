const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    const buildStatus = core.getInput('build-status');
    const commitSha = core.getInput('commit-sha');
    const commitMessage = core.getInput('commit-message');
    const author = core.getInput('author');

    const timestamp = new Date().toISOString();
    const shortSha = commitSha.substring(0, 7);
    
    // Determine status emoji and message
    const statusEmoji = buildStatus === 'success' ? '✅' : '❌';
    const statusText = buildStatus === 'success' ? 'SUCCESS' : 'FAILED';
    const statusColor = buildStatus === 'success' ? 'green' : 'red';

    // Create detailed job summary
    const summary = `
# ${statusEmoji} Cloudflare Pages Build ${statusText}

## Commit Information
- **SHA:** \`${shortSha}\`
- **Author:** ${author}
- **Message:** ${commitMessage}
- **Timestamp:** ${timestamp}

## Build Details
- **Status:** ${statusText}
- **Project:** lucaverse-com
- **Branch:** main
- **Trigger:** Auto-commit monitoring

## Actions Taken
${buildStatus === 'success' 
  ? '- ✅ Local build verification passed\n- ✅ Cloudflare Pages deployment monitored\n- ✅ Build completed successfully\n- 🌐 Site is live and updated'
  : '- ❌ Build monitoring detected failure\n- 📋 Error logs captured\n- 🚨 Deployment requires attention'
}

---
*Automated monitoring triggered by commit to main branch*
`;

    // Set the job summary
    await core.summary.addRaw(summary).write();

    // Log status
    console.log(`${statusEmoji} Build ${statusText}: ${commitMessage} (${shortSha})`);
    console.log(`👤 Author: ${author}`);
    console.log(`🕐 Time: ${timestamp}`);

    if (buildStatus === 'success') {
      console.log('🎉 Automatic build monitoring completed successfully!');
      console.log('🌐 Lucaverse.com has been updated and is live');
    } else {
      console.log('⚠️ Build monitoring detected issues');
      console.log('🔍 Check the logs above for details');
      core.setFailed('Build monitoring detected deployment failure');
    }

  } catch (error) {
    core.setFailed(`Notification failed: ${error.message}`);
  }
}

run();