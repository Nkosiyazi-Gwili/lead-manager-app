const mongoose = require('mongoose');
require('dotenv').config();

async function diagnoseMongoDB() {
  console.log('🔍 Diagnosing MongoDB Connection Issues...\n');
  
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://gwilinkosiyazi1:LeadsManager123@cluster0.1ccukxh.mongodb.net/leadmanager?retryWrites=true&w=majority';
  
  console.log('📋 Connection Details:');
  console.log('   URI:', MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
  
  try {
    console.log('\n🔗 Attempting connection...');
    
    // Set a timeout to catch hanging connections
    const connectionPromise = mongoose.connect(MONGODB_URI);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout after 30 seconds')), 30000)
    );
    
    await Promise.race([connectionPromise, timeoutPromise]);
    
    console.log('✅ MongoDB Connected Successfully!');
    console.log('   Database:', mongoose.connection.db.databaseName);
    console.log('   Host:', mongoose.connection.host);
    console.log('   Ready State:', mongoose.connection.readyState);
    
    // Test a simple query
    console.log('\n🧪 Testing database query...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`   Collections found: ${collections.length}`);
    
    await mongoose.connection.close();
    console.log('\n🎉 All tests passed! Database is working correctly.');
    
  } catch (error) {
    console.log('\n❌ CONNECTION FAILED:');
    console.log('   Error Name:', error.name);
    console.log('   Error Code:', error.code);
    console.log('   Error Message:', error.message);
    
    // Specific troubleshooting
    if (error.name === 'MongoServerSelectionError') {
      console.log('\n🔍 This means MongoDB Atlas cannot be reached:');
      console.log('   1. Check if cluster is paused → Resume it');
      console.log('   2. Check IP whitelist → Add current IP');
      console.log('   3. Check database user → Verify password');
    } else if (error.name === 'MongoNetworkError') {
      console.log('\n🔍 Network connectivity issue:');
      console.log('   1. Check your internet connection');
      console.log('   2. Check MongoDB Atlas status page');
    } else if (error.message.includes('timeout')) {
      console.log('\n🔍 Connection timeout:');
      console.log('   1. Cluster might be starting up');
      console.log('   2. Network latency issues');
    } else if (error.message.includes('auth failed')) {
      console.log('\n🔍 Authentication failed:');
      console.log('   1. Check username/password');
      console.log('   2. Check database user permissions');
    }
  }
}

diagnoseMongoDB();