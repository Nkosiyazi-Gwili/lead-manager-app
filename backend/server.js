const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// Debug: Check if environment variables are loaded
console.log('🔍 Checking environment variables:');
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('CLIENT_URL:', process.env.CLIENT_URL);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/users', require('./routes/users'));
app.use('/api/reports', require('./routes/reports'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Leads Manager API is running',
    mongodb_connected: mongoose.connection.readyState === 1
  });
});

// Database connection with better error handling
const connectDB = async () => {
  try {
    // Validate MONGODB_URI exists
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    // Validate connection string format
    if (!process.env.MONGODB_URI.startsWith('mongodb://') && 
        !process.env.MONGODB_URI.startsWith('mongodb+srv://')) {
      throw new Error('Invalid MongoDB connection string format');
    }

    console.log('🔗 Attempting to connect to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB Atlas successfully!');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:');
    console.error('Error:', error.message);
    console.error('Connection string used:', process.env.MONGODB_URI ? '***' + process.env.MONGODB_URI.slice(-20) : 'undefined');
    process.exit(1);
  }
};

// Connect to database
connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
});