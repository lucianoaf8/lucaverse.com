#!/usr/bin/env node

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../');

console.log('🚀 Deploying development Cloudflare Workers...');

try {
  // Deploy development auth worker
  console.log('\n📡 Deploying lucaverse-auth-dev worker...');
  execSync('npx wrangler deploy --config wrangler.dev.toml', {
    cwd: path.join(projectRoot, 'lucaverse-auth'),
    stdio: 'inherit'
  });
  
  console.log('✅ Development workers deployed successfully!');
  console.log('\n🔧 Development URLs:');
  console.log('   Auth Worker: https://lucaverse-auth-dev.lucianoaf8.workers.dev');
  console.log('   Frontend: http://localhost:5155');
  
  console.log('\n⚠️  Remember to:');
  console.log('   1. Update Google OAuth settings in Google Cloud Console');
  console.log('   2. Add http://localhost:5155 to Authorized JavaScript origins');
  console.log('   3. Ensure your KV namespaces are properly configured');
  
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}