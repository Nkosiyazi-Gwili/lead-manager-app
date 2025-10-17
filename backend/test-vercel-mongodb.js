const mongoose = require('mongoose');

async function testVercelMongoDB() {
  console.log('🔐 Testing Vercel MongoDB Connection...\n');
  
  // Your Vercel MongoDB URI
  const MONGODB_URI = 'mongodb+srv://gwilinkosiyazi1:v34FQ0k4xFWyPec3@cluster0.1ccukxh.mongodb.net/leadmanager?retryWrites=true&w=majority';
  
  console.log('🔗 Testing connection with Vercel password...');
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB Connected Successfully!');
    
    // Check if database has data
    const User = require('./models/User');
    const userCount = await User.countDocuments();
    console.log(`📊 Users in database: ${userCount}`);
    
    if (userCount === 0) {
      console.log('🚨 DATABASE IS EMPTY! No users found.');
      console.log('💡 You need to run the seed script on this database');
    } else {
      const users = await User.find({}).select('name email').limit(3);
      console.log('Sample users:');
      users.forEach(user => console.log(`   👤 ${user.name} (${user.email})`));
    }
    
    await mongoose.connection.close();
    
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    
    if (error.message.includes('bad auth') || error.message.includes('authentication failed')) {
      console.log('💡 Password is incorrect. Reset it in MongoDB Atlas.');
    }
  }
}

testVercelMongoDB();