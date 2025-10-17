const mongoose = require('mongoose');

async function quickCheck() {
  const MONGODB_URI = 'mongodb+srv://gwilinkosiyazi1:v34FQ0k4xFWyPec3@cluster0.1ccukxh.mongodb.net/leadmanager?retryWrites=true&w=majority';
  
  console.log('🔍 Quick Database Check\n');
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📁 Collections: ${collections.length}`);
    collections.forEach(c => console.log(`   - ${c.name}`));
    
    // Check if users collection exists and has data
    const userCount = await mongoose.connection.db.collection('users').countDocuments();
    console.log(`👥 Users in 'users' collection: ${userCount}`);
    
    if (userCount > 0) {
      const sampleUser = await mongoose.connection.db.collection('users').findOne();
      console.log('Sample user email:', sampleUser?.email);
    }
    
    await mongoose.connection.close();
    
  } catch (error) {
    console.log('❌ Check failed:', error.message);
  }
}

quickCheck();