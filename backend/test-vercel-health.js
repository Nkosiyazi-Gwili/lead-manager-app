const axios = require('axios');

async function testVercelHealth() {
  const vercelURL = 'https://lead-manager-backend-app-piyv.vercel.app/api/health';
  
  console.log('🔍 Testing Vercel Backend Health...\n');
  
  try {
    const response = await axios.get(vercelURL);
    console.log('✅ Vercel Backend Response:');
    console.log('   Status:', response.data.status);
    console.log('   Database:', response.data.database);
    console.log('   Message:', response.data.message);
    
    if (response.data.database === 'disconnected') {
      console.log('\n🚨 PROBLEM: Vercel cannot connect to MongoDB');
      console.log('💡 Solution: Check MONGODB_URI in Vercel environment variables');
    }
    
  } catch (error) {
    console.log('❌ Vercel Backend is DOWN:');
    console.log('   Error:', error.message);
  }
}

testVercelHealth();