const mongoose = require('mongoose');

async function seedProduction() {
  console.log('🌱 Seeding Production Database...\n');
  
  const MONGODB_URI = 'mongodb+srv://gwilinkosiyazi1:v34FQ0k4xFWyPec3@cluster0.1ccukxh.mongodb.net/leadmanager?retryWrites=true&w=majority';
  
  try {
    console.log('🔗 Connecting to production database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to production database');
    
    // Import models
    const User = require('./models/User');
    const Lead = require('./models/Lead');
    
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Lead.deleteMany({});
    console.log('✅ Cleared existing data');
    
    console.log('👥 Creating users...');
    const users = await User.create([
      {
        name: 'Admin User',
        email: 'admin@leadsmanager.com',
        password: 'password123',
        role: 'admin'
      },
      {
        name: 'Sales Manager',
        email: 'salesmanager@leadsmanager.com',
        password: 'password123',
        role: 'sales_manager'
      },
      {
        name: 'Sales Agent 1',
        email: 'salesagent1@leadsmanager.com',
        password: 'password123',
        role: 'sales_agent'
      },
      {
        name: 'Sales Agent 2',
        email: 'salesagent2@leadsmanager.com',
        password: 'password123',
        role: 'sales_agent'
      }
    ]);
    console.log(`✅ Created ${users.length} users`);
    
    console.log('📋 Creating sample leads...');
    const leads = await Lead.create([
      {
        companyTradingName: 'ABC Corporation',
        name: 'John',
        surname: 'Smith',
        emailAddress: 'john.smith@abccorp.com',
        mobileNumber: '+27821234567',
        leadSource: 'manual',
        leadStatus: 'new',
        industry: 'Technology',
        createdBy: users[0]._id
      },
      {
        companyTradingName: 'XYZ Enterprises',
        name: 'Sarah',
        surname: 'Johnson', 
        emailAddress: 'sarah.j@xyzenterprises.com',
        mobileNumber: '+27827654321',
        leadSource: 'csv_import',
        leadStatus: 'contacted',
        industry: 'Manufacturing',
        createdBy: users[0]._id
      }
    ]);
    console.log(`✅ Created ${leads.length} sample leads`);
    
    console.log('\n🎉 PRODUCTION DATABASE SEEDED SUCCESSFULLY!');
    console.log('============================================');
    console.log('🔑 LOGIN CREDENTIALS:');
    console.log('   Admin: admin@leadsmanager.com / password123');
    console.log('   Sales Manager: salesmanager@leadsmanager.com / password123');
    console.log('   Sales Agent 1: salesagent1@leadsmanager.com / password123');
    console.log('   Sales Agent 2: salesagent2@leadsmanager.com / password123');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the seed
seedProduction();