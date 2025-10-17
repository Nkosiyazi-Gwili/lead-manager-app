const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Lead = require('./models/Lead');

// Use the environment variable from your .env file
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://gwilinkosiyazi1:v34FQ0k4xFWyPec3@cluster0.1ccukxh.mongodb.net/leadmanager?retryWrites=true&w=majority';

const seedData = async () => {
  try {
    console.log('🔗 Attempting to connect to MongoDB...');
    console.log('Connection string:', MONGODB_URI ? '***' + MONGODB_URI.slice(-30) : 'Not found');
    
    // Updated connection options for Mongoose 6+
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Connected to MongoDB Atlas successfully');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Lead.deleteMany({});
    console.log('✅ Cleared existing data');

    // Create users
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
        role: 'sales_manager',
        department: 'sales'
      },
      {
        name: 'Sales Agent 1',
        email: 'salesagent1@leadsmanager.com',
        password: 'password123',
        role: 'sales_agent',
        department: 'sales'
      },
      {
        name: 'Sales Agent 2',
        email: 'salesagent2@leadsmanager.com',
        password: 'password123',
        role: 'sales_agent',
        department: 'sales'
      },
      {
        name: 'Marketing Manager',
        email: 'marketingmanager@leadsmanager.com',
        password: 'password123',
        role: 'marketing_manager',
        department: 'marketing'
      },
      {
        name: 'Marketing Agent 1',
        email: 'marketingagent1@leadsmanager.com',
        password: 'password123',
        role: 'marketing_agent',
        department: 'marketing'
      }
    ]);

    console.log(`✅ Created ${users.length} users`);

    // Create sample leads - USING ONLY VALID leadSource VALUES
    console.log('📋 Creating sample leads...');
    
    const statuses = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
    // ONLY use values from your Lead model enum: ['manual', 'csv_import', 'meta_business', 'eskils', 'other']
    const sources = ['manual', 'csv_import', 'meta_business', 'eskils', 'other'];
    const industries = ['Technology', 'Finance', 'Healthcare', 'Education', 'Retail', 'Manufacturing', 'Construction', 'Real Estate', 'Hospitality'];
    
    // Real South African company names and locations
    const companyNames = [
      'Tech Solutions SA', 'Blue Sky Investments', 'Growth Partners Ltd', 'Innovate Africa Group',
      'Sunrise Enterprises', 'Eagle Eye Consulting', 'Pioneer Holdings', 'Visionary Labs',
      'Strategic Partners Co', 'Future Forward Inc', 'Legacy Builders', 'Dynamic Systems',
      'Prime Movers Ltd', 'Catalyst Group', 'Horizon Ventures'
    ];
    
    const firstNames = ['John', 'Sarah', 'David', 'Lisa', 'Michael', 'Grace', 'James', 'Emma', 'Robert', 'Olivia'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    const cities = ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth', 'Bloemfontein', 'East London'];
    
    const leads = [];

    for (let i = 0; i < 150; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const source = sources[Math.floor(Math.random() * sources.length)];
      const assignedTo = Math.random() > 0.4 ? users[2 + Math.floor(Math.random() * 2)]._id : null;
      const companyName = companyNames[Math.floor(Math.random() * companyNames.length)];
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const city = cities[Math.floor(Math.random() * cities.length)];
      const industry = industries[Math.floor(Math.random() * industries.length)];
      
      // Create lead data with VALID leadSource values only
      const lead = {
        leadSource: source,
        leadStatus: status,
        assignedTo: assignedTo,
        companyTradingName: `${companyName} ${Math.random() > 0.5 ? 'Pty Ltd' : '(Pty) Ltd'}`,
        companyRegisteredName: `${companyName} (Pty) Ltd`,
        address: `${Math.floor(Math.random() * 999) + 1} ${['Main', 'Church', 'Market', 'Long', 'High'].flatMap(street => 
          [`${street} Street`, `${street} Road`, `${street} Avenue`]
        )[Math.floor(Math.random() * 15)]}, ${city}, ${Math.floor(1000 + Math.random() * 9000)}`,
        name: firstName,
        surname: lastName,
        emailAddress: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${companyName.toLowerCase().replace(/\s+/g, '')}.co.za`,
        mobileNumber: `+27${Math.floor(60 + Math.random() * 40)}${Math.floor(1000000 + Math.random() * 9000000)}`,
        telephoneNumber: `+27${Math.floor(10 + Math.random() * 10)}${Math.floor(1000000 + Math.random() * 9000000)}`,
        industry: industry,
        numberOfEmployees: Math.floor(Math.random() * 1000) + 1,
        bbbeeLevel: `Level ${Math.floor(Math.random() * 8) + 1}`,
        annualTurnover: `R${(Math.random() * 100 + 1).toFixed(1)} million`,
        createdBy: users[Math.floor(Math.random() * users.length)]._id,
        notes: [],
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000) // Random date in last 90 days
      };

      // Add Eskils-specific data if source is 'eskils'
      if (source === 'eskils') {
        lead.idNumber = `${Math.floor(1000000000000 + Math.random() * 9000000000000)}`;
        lead.dateOfBirth = new Date(Date.now() - Math.floor(25 + Math.random() * 40) * 365 * 24 * 60 * 60 * 1000);
        lead.disability = Math.random() > 0.8 ? 'Yes' : 'No';
        lead.gender = ['Male', 'Female'][Math.floor(Math.random() * 2)];
        lead.race = ['Black', 'White', 'Coloured', 'Indian', 'Other'][Math.floor(Math.random() * 5)];
        lead.postalCode = `${Math.floor(1000 + Math.random() * 9000)}`;
        lead.course = ['Business Management', 'IT', 'Marketing', 'Finance', 'Healthcare'][Math.floor(Math.random() * 5)];
        lead.level = ['Certificate', 'Diploma', 'Degree'][Math.floor(Math.random() * 3)];
        lead.studyMode = ['f2f', 'distance'][Math.floor(Math.random() * 2)];
      }

      // Add Meta Business-specific data if source is 'meta_business'
      if (source === 'meta_business') {
        lead.metaAdId = `ad_${Math.floor(100000000000000 + Math.random() * 900000000000000)}`;
        lead.metaFormId = `form_${Math.floor(100000000000000 + Math.random() * 900000000000000)}`;
        lead.metaCampaignId = `campaign_${Math.floor(100000000000000 + Math.random() * 900000000000000)}`;
        lead.metaData = {
          ad_name: `Lead_Gen_Ad_${i + 1}`,
          campaign_name: `SA_Leads_Campaign_${Math.floor(Math.random() * 10) + 1}`,
          form_name: 'Contact_Form_v2'
        };
      }

      // Add realistic notes based on lead status
      if (status !== 'new') {
        lead.notes.push({
          content: `Initial contact made with ${firstName} ${lastName}. ${['Very interested in our services', 'Requested more information', 'Scheduled follow-up call', 'Needs pricing details'][Math.floor(Math.random() * 4)]}.`,
          createdBy: lead.assignedTo || lead.createdBy,
          createdAt: new Date(lead.createdAt.getTime() + 24 * 60 * 60 * 1000)
        });
      }

      if (['qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'].includes(status)) {
        lead.notes.push({
          content: `Lead qualified. ${['Decision maker identified', 'Budget confirmed', 'Timeline discussed', 'Key requirements outlined'][Math.floor(Math.random() * 4)]}.`,
          createdBy: lead.assignedTo || lead.createdBy,
          createdAt: new Date(lead.createdAt.getTime() + 2 * 24 * 60 * 60 * 1000)
        });
      }

      if (['proposal', 'negotiation', 'closed_won', 'closed_lost'].includes(status)) {
        lead.notes.push({
          content: `Proposal sent. ${['Waiting for feedback', 'Client reviewing terms', 'Negotiating pricing', 'Addressing concerns'][Math.floor(Math.random() * 4)]}.`,
          createdBy: lead.assignedTo || lead.createdBy,
          createdAt: new Date(lead.createdAt.getTime() + 5 * 24 * 60 * 60 * 1000)
        });
      }

      if (['closed_won', 'closed_lost'].includes(status)) {
        lead.notes.push({
          content: status === 'closed_won' 
            ? `🎉 Deal closed! Contract signed. Project kickoff scheduled.` 
            : `Lead lost. ${['Budget constraints', 'Went with competitor', 'Timing not right', 'Requirements changed'][Math.floor(Math.random() * 4)]}.`,
          createdBy: lead.assignedTo || lead.createdBy,
          createdAt: new Date(lead.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000)
        });
      }

      leads.push(lead);
    }

    // Insert leads in batches to avoid timeout
    const batchSize = 50;
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      await Lead.insertMany(batch);
      console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(leads.length/batchSize)}`);
    }

    console.log(`✅ Created ${leads.length} realistic sample leads`);

    // Create some high-priority leads with VALID leadSource values
    console.log('🚀 Creating high-priority leads...');
    const highPriorityLeads = [
      {
        leadSource: 'meta_business',
        leadStatus: 'qualified',
        assignedTo: users[2]._id, // Sales Agent 1
        companyTradingName: 'Global Tech Solutions SA',
        companyRegisteredName: 'Global Tech Solutions (Pty) Ltd',
        address: '123 Innovation Street, Sandton, 2196',
        name: 'Sarah',
        surname: 'Johnson',
        emailAddress: 'sarah.johnson@globaltech.co.za',
        mobileNumber: '+27831234567',
        telephoneNumber: '+27119876543',
        industry: 'Technology',
        numberOfEmployees: 250,
        bbbeeLevel: 'Level 2',
        annualTurnover: 'R45.2 million',
        createdBy: users[1]._id, // Sales Manager
        metaAdId: 'ad_123456789012345',
        metaFormId: 'form_123456789012345',
        metaCampaignId: 'campaign_123456789012345',
        metaData: {
          ad_name: 'Enterprise_Solution_Ad',
          campaign_name: 'SA_Enterprise_Campaign',
          form_name: 'Enterprise_Contact_Form'
        },
        notes: [
          {
            content: 'Hot lead from Meta Business. Very interested in our enterprise solution. Decision maker is CTO.',
            createdBy: users[1]._id
          },
          {
            content: 'Demo scheduled for next week. Budget approved for Q1.',
            createdBy: users[2]._id
          }
        ]
      },
      {
        leadSource: 'manual',
        leadStatus: 'proposal',
        assignedTo: users[3]._id, // Sales Agent 2
        companyTradingName: 'Premium Financial Services',
        companyRegisteredName: 'Premium Financial Services (Pty) Ltd',
        address: '45 Finance Avenue, Cape Town, 8001',
        name: 'Michael',
        surname: 'Brown',
        emailAddress: 'michael.brown@premiumfinance.co.za',
        mobileNumber: '+27836543210',
        telephoneNumber: '+27213456789',
        industry: 'Finance',
        numberOfEmployees: 180,
        bbbeeLevel: 'Level 1',
        annualTurnover: 'R89.7 million',
        createdBy: users[0]._id, // Admin
        notes: [
          {
            content: 'Referred by existing client. Immediate need for our services.',
            createdBy: users[0]._id
          },
          {
            content: 'Proposal sent. Waiting for board approval. High chance of closing.',
            createdBy: users[3]._id
          }
        ]
      },
      {
        leadSource: 'eskils',
        leadStatus: 'contacted',
        assignedTo: users[4]._id, // Marketing Manager
        companyTradingName: 'Student Career Development',
        companyRegisteredName: 'Student Career Development NPC',
        address: '78 Education Road, Durban, 4001',
        name: 'Grace',
        surname: 'Mbeki',
        emailAddress: 'grace.mbeki@studentcareer.co.za',
        mobileNumber: '+27839876543',
        telephoneNumber: '+27318765432',
        industry: 'Education',
        numberOfEmployees: 25,
        bbbeeLevel: 'Level 3',
        annualTurnover: 'R5.2 million',
        createdBy: users[4]._id,
        idNumber: '9001011234088',
        dateOfBirth: new Date('1990-01-01'),
        disability: 'No',
        gender: 'Female',
        race: 'Black',
        postalCode: '4001',
        course: 'Business Management',
        level: 'Diploma',
        studyMode: 'f2f',
        notes: [
          {
            content: 'Student inquiry from Eskils platform. Interested in business management courses.',
            createdBy: users[4]._id
          }
        ]
      }
    ];

    await Lead.insertMany(highPriorityLeads);
    console.log(`✅ Created ${highPriorityLeads.length} high-priority leads`);

    console.log('\n🎉 Database seeded successfully!');
    console.log('='.repeat(60));
    console.log('📊 SEEDING SUMMARY:');
    console.log('='.repeat(60));
    console.log(`👥 Users created: ${users.length}`);
    console.log(`📋 Total leads created: ${leads.length + highPriorityLeads.length}`);
    console.log(`📈 Lead status distribution:`);
    
    // Show lead status distribution
    const statusCount = {};
    [...leads, ...highPriorityLeads].forEach(lead => {
      statusCount[lead.leadStatus] = (statusCount[lead.leadStatus] || 0) + 1;
    });
    
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} leads`);
    });

    // Show lead source distribution
    const sourceCount = {};
    [...leads, ...highPriorityLeads].forEach(lead => {
      sourceCount[lead.leadSource] = (sourceCount[lead.leadSource] || 0) + 1;
    });
    
    console.log(`📊 Lead source distribution:`);
    Object.entries(sourceCount).forEach(([source, count]) => {
      console.log(`   ${source}: ${count} leads`);
    });
    
    console.log('='.repeat(60));
    console.log('🔐 SAMPLE LOGIN CREDENTIALS:');
    console.log('='.repeat(60));
    console.log('Admin: admin@leadsmanager.com / password123');
    console.log('Sales Manager: salesmanager@leadsmanager.com / password123');
    console.log('Sales Agent 1: salesagent1@leadsmanager.com / password123');
    console.log('Sales Agent 2: salesagent2@leadsmanager.com / password123');
    console.log('Marketing Manager: marketingmanager@leadsmanager.com / password123');
    console.log('Marketing Agent 1: marketingagent1@leadsmanager.com / password123');
    console.log('='.repeat(60));
    console.log('💡 TIP: Check the high-priority leads for immediate follow-up!');
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    
    if (error.message.includes('bad auth')) {
      console.log('\n🔐 Authentication Failed:');
      console.log('   - Check your MongoDB Atlas username/password');
      console.log('   - Verify the user has correct permissions');
      console.log('   - Ensure network access is configured');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('\n🌐 Network Error:');
      console.log('   - Check your internet connection');
      console.log('   - Verify the MongoDB Atlas cluster URL');
    } else if (error.message.includes('timed out')) {
      console.log('\n⏰ Timeout Error:');
      console.log('   - Check your network connection');
      console.log('   - The cluster might be slow to respond');
    } else if (error.message.includes('validation')) {
      console.log('\n📝 Validation Error:');
      console.log('   - Check your Lead model schema');
      console.log('   - Verify all required fields are provided');
      console.log('   - Lead source must be one of: manual, csv_import, meta_business, eskils, other');
    }
    
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('❌ Unhandled Promise Rejection:', err);
  process.exit(1);
});

seedData();