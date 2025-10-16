const axios = require('axios');

async function testDeployedEndpoints() {
  const DEPLOYED_URL = 'https://lead-manager-backend-app-piyv.vercel.app/api';
  
  console.log('🧪 Testing Deployed Backend Endpoints...\n');
  
  const endpoints = [
    '/health',
    '/debug-db',
    '/auth/login',
    '/auth/register', 
    '/auth/me',
    '/leads',
    '/users/role/sales_agent'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const url = `${DEPLOYED_URL}${endpoint}`;
      console.log(`Testing: ${endpoint}`);
      
      if (endpoint === '/auth/login' || endpoint === '/auth/register') {
        // POST requests
        const response = await axios.post(url, {
          email: 'test@test.com',
          password: 'test123'
        }, { timeout: 10000 });
        console.log(`✅ ${endpoint}: ${response.status} - ${response.data.success ? 'Success' : 'Failed'}`);
      } else {
        // GET requests  
        const response = await axios.get(url, { timeout: 10000 });
        console.log(`✅ ${endpoint}: ${response.status} - ${response.data.success ? 'Success' : 'Failed'}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint}: ${error.response?.status || error.code} - ${error.response?.data?.message || error.message}`);
    }
    console.log('---');
  }
}

testDeployedEndpoints();