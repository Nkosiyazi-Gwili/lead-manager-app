const axios = require('axios');

async function testDeployedBackend() {
  const DEPLOYED_URL = 'https://lead-manager-backend-app-piyv.vercel.app/api';
  
  console.log('🧪 Testing Deployed Backend...\n');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${DEPLOYED_URL}/health`);
    console.log('✅ Health:', healthResponse.data);
    
    // Test simple login
    console.log('\n2. Testing simple login endpoint...');
    const simpleLogin = await axios.post(`${DEPLOYED_URL}/auth/simple-login`, {
      email: 'test@test.com',
      password: 'test123'
    });
    console.log('✅ Simple Login:', simpleLogin.data.success);
    
    // Test real login
    console.log('\n3. Testing real login endpoint...');
    const realLogin = await axios.post(`${DEPLOYED_URL}/auth/login`, {
      email: 'admin@leadsmanager.com',
      password: 'password123'
    });
    console.log('✅ Real Login:', realLogin.data.success);
    console.log('   User:', realLogin.data.user.email);
    
  } catch (error) {
    console.log('❌ TEST FAILED!');
    console.log('URL:', error.config?.url);
    console.log('Status:', error.response?.status);
    console.log('Response:', error.response?.data);
    console.log('Error:', error.message);
  }
}

testDeployedBackend();