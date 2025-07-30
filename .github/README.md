# GitHub Actions & Automation

This directory contains the complete automation system for lucaverse.com that ensures **every commit to main automatically triggers build monitoring**.

## 🎯 Non-Negotiable Rule

**EVERY COMMIT TO MAIN → AUTOMATIC BUILD MONITORING**

## 📁 Directory Structure

```
.github/
├── workflows/
│   ├── auto-monitor.yml          # Primary automatic monitoring workflow
│   └── monitor-build.yml         # Advanced monitoring with custom actions
│
├── actions/                      # Custom GitHub Actions
│   ├── monitor-cloudflare-build/ # Direct Cloudflare API monitoring
│   ├── notify-build-status/      # Build status notifications
│   └── claude-mcp-monitor/       # Claude MCP integration
│
└── README.md                     # This file
```

## 🚀 Primary Workflow: `auto-monitor.yml`

**Triggers**: Every push to `main` branch

**What it does**:
1. ✅ Verifies local build works
2. 📊 Monitors Cloudflare Pages deployment in real-time  
3. 📋 Creates detailed job summaries
4. 🤖 Prepares Claude MCP integration data
5. 📢 Reports final build status

## 🔧 Custom Actions

### `monitor-cloudflare-build`
- Direct Cloudflare Pages API integration
- Real-time deployment status monitoring
- Build log extraction and display
- Comprehensive error handling

### `notify-build-status`
- Creates GitHub Actions job summaries
- Sends build status notifications
- Generates detailed reporting

### `claude-mcp-monitor`  
- Prepares monitoring data for Claude Code
- Integrates with Cloudflare MCP servers
- Enables automated Claude monitoring

## ⚙️ Setup Requirements

### 1. Repository Secret
Add to **Settings > Secrets and variables > Actions**:
```
CLOUDFLARE_API_TOKEN=your_token_here
```

### 2. API Token Permissions
- **Cloudflare Pages**: Read access
- **Account**: Read access

### 3. Project Configuration
Pre-configured for:
- Account ID: `96046731d13e851830b647b287048172`
- Project: `lucaverse-com`
- Branch: `main`

## 🎛️ How It Works

1. **Developer commits to main** → Automatic trigger
2. **GitHub Actions starts** → Workflow begins immediately
3. **Local build verification** → Ensures code quality
4. **Cloudflare monitoring** → Real-time deployment tracking
5. **Status reporting** → Comprehensive results
6. **Claude integration** → MCP server data prepared

## 📊 What You'll See

### GitHub Actions Tab
- Workflow runs automatically on every main commit
- Real-time build progress and logs
- Success/failure status with detailed summaries

### Job Summary Example
```
🎯 AUTOMATIC BUILD MONITORING COMPLETE

Commit Information:
- SHA: abc1234
- Author: Developer Name  
- Message: fix: resolve OAuth issue
- Timestamp: 2024-XX-XX XX:XX:XX UTC

Monitoring Result:
✅ Status: Build monitoring completed successfully
🌐 Result: Lucaverse.com has been updated and is live
```

## 🔄 Manual Triggers

### GitHub UI
1. Go to **Actions** tab
2. Select **Auto Monitor Every Main Commit**
3. Click **Run workflow**

### CLI
```bash
gh workflow run auto-monitor.yml
```

## 🚨 Troubleshooting

### Common Issues
- **No trigger**: Check branch name is `main`
- **API errors**: Verify `CLOUDFLARE_API_TOKEN` secret
- **Timeouts**: Check Cloudflare Pages dashboard
- **Build failures**: Review deployment logs

### Debug Steps
1. Check GitHub Actions logs
2. Verify Cloudflare Pages status
3. Test API token permissions
4. Review workflow file syntax

## 📈 Success Metrics

### ✅ Working Correctly When:
- Every main commit triggers monitoring
- Build status is detected within 15 minutes
- Detailed logs and summaries are generated
- Success/failure is accurately reported

### ❌ Needs Attention When:
- Commits don't trigger workflows
- Monitoring times out
- API authentication fails
- Build status isn't detected

## 🤖 Claude MCP Integration

The system automatically prepares monitoring data for Claude Code to use with MCP servers:

- **cloudflare-observability**: Real-time build logs
- **cloudflare-builds**: Deployment status tracking  
- **cloudflare-graphql**: Analytics and metrics

## 📝 Maintenance

### Regular Tasks
- Monthly: Check API token expiration
- Quarterly: Update dependencies
- As needed: Adjust timeout values

### Configuration Updates
- Modify workflow files for settings changes
- Update secrets for API token rotation
- Adjust monitoring intervals based on performance

---

## 🚀 Quick Start

1. **Add API Token**: `CLOUDFLARE_API_TOKEN` in repository secrets
2. **Commit to Main**: Push any change to main branch
3. **Watch Magic**: Go to Actions tab and see automatic monitoring
4. **Verify Success**: Check job summary for detailed results

**The system is now fully automated - every commit to main will trigger comprehensive build monitoring without any manual intervention!**