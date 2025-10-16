const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testEndpoints() {
  console.log('🧪 Testing API Endpoints...\n');
  
  try {
    // Test health endpoint
    console.log('1. Testing /api/health...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health:', healthResponse.data);
    
    // Test simple login endpoint
    console.log('\n2. Testing /api/auth/simple-login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/simple-login`, {
      email: 'test@test.com',
      password: 'test123'
    });
    console.log('✅ Simple Login:', loginResponse.data);
    
    // Test real login endpoint
    console.log('\n3. Testing /api/auth/login...');
    try {
      const realLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'admin@leadsmanager.com',
        password: 'password123'
      });
      console.log('✅ Real Login:', realLoginResponse.data);
    } catch (error) {
      console.log('❌ Real Login failed:', error.response?.data || error.message);
    }
    
    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.log('💥 Test failed:', error.message);
  }
}

testEndpoints();