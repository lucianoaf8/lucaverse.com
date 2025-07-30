# Lucaverse.com Deployment Workflow

This directory contains automated deployment scripts for the lucaverse.com project.

## Overview

The deployment workflow handles:
1. **Local Build** - Runs `npm run build` to ensure the project builds successfully
2. **Git Operations** - Commits changes and pushes to the main branch
3. **Build Monitoring** - Monitors Cloudflare Pages build status via API
4. **Error Handling** - Automatically retries on failures and provides detailed logging
5. **Success Confirmation** - Only completes when Cloudflare Pages build succeeds

## Prerequisites

### 1. Cloudflare API Token
You need a Cloudflare API token with **read-only** Pages permissions:

1. Go to [Cloudflare Dashboard > My Profile > API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Create custom token with:
   - **Cloudflare Pages** permission with **Read** access
   - **Account** permission with **Read** access
4. Set the token as an environment variable:

```bash
# Windows PowerShell
$env:CLOUDFLARE_API_TOKEN = "your_token_here"

# Linux/macOS
export CLOUDFLARE_API_TOKEN="your_token_here"
```

### 2. Project Configuration
The scripts are configured for:
- **Account ID**: `96046731d13e851830b647b287048172`
- **Project Name**: `lucaverse-com`
- **Branch**: `main`

## Usage

### npm script (Recommended)
```bash
# Build, commit, push, and monitor deployment
npm run deploy:monitor

# With custom commit message
npm run deploy:monitor "feat: add new feature"
```

### Direct script execution
```bash
# Node.js with auto-generated commit message
node scripts/deploy-workflow.js

# Node.js with custom commit message
node scripts/deploy-workflow.js "feat: add new feature"
```

## Workflow Steps

1. **Pre-flight Checks**
   - Validates environment variables
   - Checks for required files

2. **Local Build**
   - Runs `npm run build`
   - Fails fast if build errors occur

3. **Git Operations**
   - `git add .`
   - `git commit -m "message"`
   - `git push origin main`

4. **Cloudflare Pages Monitoring**
   - Polls deployment status every 30 seconds
   - Monitors for up to 10 minutes
   - **Fetches and displays build logs** in real-time
   - Tracks deployment stages: `active`, `success`, `failure`
   - Shows error logs when builds fail

5. **Error Handling**
   - Retries up to 3 times on failure
   - 30-second delay between retries
   - Detailed error logging

## Configuration

### Environment Variables
- `CLOUDFLARE_API_TOKEN` - Required Cloudflare API token

### Workflow Settings (in deploy-workflow.js)
```javascript
{
  accountId: '96046731d13e851830b647b287048172',
  projectName: 'lucaverse-com',
  maxRetries: 3,
  pollInterval: 30000,  // 30 seconds
  maxWaitTime: 600000   // 10 minutes
}
```

## API Endpoints Used (Read-Only)

- **Get Deployments**: `GET /accounts/{account_id}/pages/projects/{project_name}/deployments`
- **Get Build Logs**: `GET /accounts/{account_id}/pages/projects/{project_name}/deployments/{deployment_id}/history/logs`
- **Deployment Status**: Monitors `latest_stage.status` field

## Deployment Status Types

- `active` - Build/deployment in progress
- `success` - Deployment completed successfully ✅
- `failure` - Deployment failed ❌
- `idle` - Waiting for next stage

## Troubleshooting

### Common Issues

1. **API Token Error**
   ```
   Error: Unauthorized
   ```
   - Verify `CLOUDFLARE_API_TOKEN` is set correctly
   - Check token has Pages permissions

2. **Project Not Found**
   ```
   Error: No deployments found
   ```
   - Verify project name is `lucaverse-com`
   - Check project exists in Cloudflare Pages dashboard

3. **Build Failures**
   - Review Cloudflare Pages build logs in dashboard
   - Check local build works: `npm run build`
   - Verify all dependencies are committed

4. **Git Push Errors**
   - Ensure you have push permissions to main branch
   - Check for uncommitted changes
   - Verify remote origin is set correctly

### Debug Mode
Add detailed logging by modifying the log level in the scripts or running with verbose npm:
```bash
npm run deploy --verbose
```

## Files

- `deploy-workflow.js` - Main Node.js monitoring workflow script
- `README.md` - This documentation

## Integration with CI/CD

This workflow can be integrated with GitHub Actions or other CI/CD systems:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run deploy:monitor
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```