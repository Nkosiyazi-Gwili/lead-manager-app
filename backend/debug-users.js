const mongoose = require('mongoose');
require('dotenv').config();

async function debugUsers() {
  console.log('🔍 Debugging Users Collection...\n');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const User = require('./models/User');

    // Check all users
    const users = await User.find({});
    console.log(`📊 Total users in database: ${users.length}\n`);

    // Show user details (without passwords)
    users.forEach((user, index) => {
      console.log(`👤 User ${index + 1}:`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.isActive}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('---');
    });

    // Test the admin user specifically
    const adminUser = await User.findOne({ email: 'admin@leadsmanager.com' }).select('+password');
    console.log('\n🔑 Testing admin user:');
    if (adminUser) {
      console.log(`   Found: ${adminUser.email}`);
      console.log(`   Has password: ${!!adminUser.password}`);
      console.log(`   Password length: ${adminUser.password ? adminUser.password.length : 'N/A'}`);
      
      // Test password comparison
      try {
        const testMatch = await adminUser.comparePassword('password123');
        console.log(`   Password 'password123' matches: ${testMatch}`);
        
        const testWrong = await adminUser.comparePassword('wrongpassword');
        console.log(`   Password 'wrongpassword' matches: ${testWrong}`);
      } catch (error) {
        console.log(`   ❌ Password comparison error: ${error.message}`);
      }
    } else {
      console.log('   ❌ Admin user not found!');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Connection closed');
  }
}

debugUsers();