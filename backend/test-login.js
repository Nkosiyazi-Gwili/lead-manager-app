const axios = require('axios');

async function testLogin() {
  const BASE_URL = 'http://localhost:5000/api';
  
  console.log('🧪 Testing Real Login...\n');
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@leadsmanager.com',
      password: 'password123'
    });
    
    console.log('✅ LOGIN SUCCESS!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ LOGIN FAILED!');
    console.log('Status:', error.response?.status);
    console.log('Response:', error.response?.data);
    console.log('Error message:', error.message);
  }
}

testLogin();