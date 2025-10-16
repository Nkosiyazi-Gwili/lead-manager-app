const axios = require('axios');

async function deploymentChecklist() {
  const DEPLOYED_URL = 'https://lead-manager-backend-app-piyv.vercel.app/api';
  
  console.log('📋 DEPLOYMENT CHECKLIST\n');
  console.log('========================================');
  
  // 1. Check basic server
  try {
    const health = await axios.get(`${DEPLOYED_URL}/health`);
    console.log('✅ 1. Server is running');
    console.log('   Database:', health.data.database);
    console.log('   Environment:', health.data.environment);
  } catch (error) {
    console.log('❌ 1. Server is NOT running');
  }
  
  console.log('========================================');
  
  // 2. Check database connection
  try {
    const debug = await axios.get(`${DEPLOYED_URL}/debug-db`);
    console.log('✅ 2. Debug endpoint accessible');
    console.log('   MONGODB_URI set:', debug.data.hasMongoURI);
    console.log('   Database state:', debug.data.mongooseState);
  } catch (error) {
    console.log('❌ 2. Debug endpoint failed - routes might be missing');
  }
  
  console.log('========================================');
  
  // 3. Check authentication
  try {
    const login = await axios.post(`${DEPLOYED_URL}/auth/login`, {
      email: 'admin@leadsmanager.com',
      password: 'password123'
    });
    console.log('✅ 3. Authentication working');
    console.log('   Login:', login.data.success ? 'Success' : 'Failed');
  } catch (error) {
    console.log('❌ 3. Authentication failed');
    console.log('   Error:', error.response?.data?.message || error.message);
  }
  
  console.log('========================================');
  
  // 4. Summary
  console.log('\n🎯 DEPLOYMENT STATUS:');
  console.log('   The main issue is likely:');
  console.log('   • Missing MONGODB_URI in Vercel environment variables');
  console.log('   • MongoDB Atlas IP whitelist');
  console.log('   • Old code deployed to Vercel');
  console.log('\n🔧 NEXT STEPS:');
  console.log('   1. Check Vercel environment variables');
  console.log('   2. Whitelist Vercel IPs in MongoDB Atlas');
  console.log('   3. Redeploy with latest code');
  console.log('========================================\n');
}

deploymentChecklist();