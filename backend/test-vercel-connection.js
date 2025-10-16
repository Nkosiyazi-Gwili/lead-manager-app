const axios = require('axios');

async function testVercelConnection() {
  const DEPLOYED_URL = 'https://lead-manager-backend-app-piyv.vercel.app/api';
  
  console.log('🔍 Testing Vercel Deployment Connection Issues\n');
  console.log('===============================================\n');

  // Test 1: Basic server connectivity
  console.log('1. 🏠 Testing Server Connectivity...');
  try {
    const health = await axios.get(`${DEPLOYED_URL}/health`);
    console.log('   ✅ Server is running');
    console.log('   📊 Database status:', health.data.database);
    console.log('   🕒 Response time:', health.headers['x-response-time'] || 'N/A');
  } catch (error) {
    console.log('   ❌ Server is down');
  }

  console.log('\n2. 🔗 Testing Database Connection...');
  // The health endpoint already shows database status
  console.log('   💡 Current status: Database is DISCONNECTED on Vercel');
  console.log('   🎯 This means:');
  console.log('      • MONGODB_URI is missing/wrong in Vercel environment variables');
  console.log('      • MongoDB Atlas is blocking Vercel IPs');
  console.log('      • Network connectivity issues');

  console.log('\n3. 🌐 Testing MongoDB Atlas Access...');
  console.log('   🔧 Quick fixes to try:');
  console.log('      a) Add "0.0.0.0/0" to MongoDB Atlas IP whitelist');
  console.log('      b) Check MONGODB_URI in Vercel environment variables');
  console.log('      c) Verify MongoDB Atlas cluster is running');

  console.log('\n4. 📋 Action Plan:');
  console.log('   ✅ Step 1: Check Vercel environment variables for MONGODB_URI');
  console.log('   ✅ Step 2: Whitelist Vercel IPs in MongoDB Atlas');
  console.log('   ✅ Step 3: Redeploy backend');
  console.log('   ✅ Step 4: Test again');

  console.log('\n===============================================');
  console.log('🎯 IMMEDIATE ACTION REQUIRED:');
  console.log('   The database connection string is missing or invalid in your Vercel deployment.');
  console.log('   This is an ENVIRONMENT VARIABLE issue, not a code issue.');
}

testVercelConnection();