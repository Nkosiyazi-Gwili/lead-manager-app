const mongoose = require('mongoose');
const User = require('./models/User');
const Lead = require('./models/Lead');
const { sendRegistrationEmail } = require('./utils/email');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/leadsmanager';

const seedData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Lead.deleteMany({});
    console.log('Cleared existing data');

    // Create users
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

    console.log('Created users');

    // Create sample leads
    const leads = [];
    const statuses = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
    const sources = ['manual', 'csv_import', 'meta_business', 'eskils'];
    const industries = ['Technology', 'Finance', 'Healthcare', 'Education', 'Retail', 'Manufacturing', 'Construction'];

    for (let i = 0; i < 100; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const source = sources[Math.floor(Math.random() * sources.length)];
      const assignedTo = Math.random() > 0.3 ? users[2 + Math.floor(Math.random() * 2)]._id : null;
      
      leads.push({
        leadSource: source,
        leadStatus: status,
        assignedTo: assignedTo,
        companyTradingName: `Company ${i + 1} Pty Ltd`,
        companyRegisteredName: `Company ${i + 1} (Pty) Ltd`,
        address: `${i + 1} Main Street, Johannesburg, 2000`,
        name: `Contact`,
        surname: `Person${i + 1}`,
        emailAddress: `contact${i + 1}@company.com`,
        mobileNumber: `+27${Math.floor(100000000 + Math.random() * 900000000)}`,
        telephoneNumber: `+27${Math.floor(100000000 + Math.random() * 900000000)}`,
        industry: industries[Math.floor(Math.random() * industries.length)],
        numberOfEmployees: Math.floor(Math.random() * 500) + 1,
        bbbeeLevel: `B-BBEE ${Math.floor(Math.random() * 8) + 1}`,
        annualTurnover: `R${(Math.random() * 50 + 1).toFixed(2)} million`,
        createdBy: users[0]._id,
        notes: [
          {
            content: `Initial contact made with Contact Person${i + 1}. Lead seems promising.`,
            createdBy: users[0]._id
          }
        ]
      });
    }

    await Lead.insertMany(leads);
    console.log('Created sample leads');

    console.log('Database seeded successfully!');
    console.log('');
    console.log('Sample login credentials:');
    console.log('Admin: admin@leadsmanager.com / password123');
    console.log('Sales Manager: salesmanager@leadsmanager.com / password123');
    console.log('Sales Agent 1: salesagent1@leadsmanager.com / password123');
    console.log('Marketing Manager: marketingmanager@leadsmanager.com / password123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();