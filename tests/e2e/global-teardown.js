async function globalTeardown() {
  console.log('🧹 Starting E2E test global teardown...');
  
  try {
    // Cleanup any test data or resources
    console.log('🗑️ Cleaning up test data...');
    
    // Clear test databases or external services if used
    // Reset any modified configurations
    
    console.log('✅ Global teardown completed successfully');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error to avoid masking test failures
  }
}

export default globalTeardown;