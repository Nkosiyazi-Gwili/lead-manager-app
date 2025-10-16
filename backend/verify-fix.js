const axios = require('axios');

async function verifyFix() {
  const DEPLOYED_URL = 'https://lead-manager-backend-app-piyv.vercel.app/api';
  
  console.log('✅ Verifying Database Connection Fix\n');
  
  try {
    const health = await axios.get(`${DEPLOYED_URL}/health`);
    console.log('🏠 Server Status:', health.data.status);
    console.log('📊 Database:', health.data.database);
    
    if (health.data.database === 'connected') {
      console.log('🎉 SUCCESS! Database is now connected!');
      
      // Test login
      const login = await axios.post(`${DEPLOYED_URL}/auth/login`, {
        email: 'admin@leadsmanager.com',
        password: 'password123'
      });
      console.log('🔐 Login test:', login.data.success ? 'SUCCESS' : 'FAILED');
      
    } else {
      console.log('❌ Database still disconnected');
      console.log('💡 Check Vercel environment variables and MongoDB Atlas IP whitelist');
    }
  } catch (error) {
    console.log('❌ Verification failed:', error.message);
  }
}

verifyFix();