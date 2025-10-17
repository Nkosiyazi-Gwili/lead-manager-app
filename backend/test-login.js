const axios = require('axios');

async function testBackendLogin() {
  const backendURL = 'https://lead-manager-back-end-app-xdi1.vercel.app/api';
  
  console.log('🧪 Testing Backend Login...\n');
  
  // Test credentials from your seed
  const testCredentials = [
    { email: 'admin@leadsmanager.com', password: 'password123' },
    { email: 'salesmanager@leadsmanager.com', password: 'password123' },
    { email: 'salesagent1@leadsmanager.com', password: 'password123' }
  ];
  
  for (const creds of testCredentials) {
    try {
      console.log(`🔐 Testing: ${creds.email}`);
      
      const response = await axios.post(`${backendURL}/auth/login`, creds, {
        timeout: 10000
      });
      
      console.log(`✅ SUCCESS: Login successful`);
      console.log(`   User: ${response.data.user.name}`);
      console.log(`   Role: ${response.data.user.role}`);
      console.log(`   Token received: ${response.data.token ? 'Yes' : 'No'}`);
      
    } catch (error) {
      console.log(`❌ FAILED: ${error.response?.status}`);
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
      
      if (error.response?.data) {
        console.log(`   Response:`, JSON.stringify(error.response.data, null, 2));
      }
    }
    console.log('---');
  }
}

testBackendLogin();