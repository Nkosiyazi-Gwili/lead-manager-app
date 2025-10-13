const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables - FIXED for both local and Vercel
dotenv.config();

const app = express();

// Debug: Check if environment variables are loaded
console.log('🔍 Environment Check:');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '***' + process.env.MONGODB_URI.slice(-20) : 'MISSING');
console.log('CLIENT_URL:', process.env.CLIENT_URL || 'Not set');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');

// Use explicit variables to avoid issues
const MONGODB_URI = process.env.MONGODB_URI;
const CLIENT_URL = process.env.CLIENT_URL;
const NODE_ENV = process.env.NODE_ENV;

// Middleware - FIXED CORS for both environments
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      CLIENT_URL,
      'https://lead-manager-app-psi.vercel.app',
      'http://localhost:3000'
    ].filter(Boolean); // Remove any undefined values
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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

// Health check - FIXED to work without MongoDB connection
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Leads Manager API is running',
    mongodb_connected: mongoose.connection.readyState === 1,
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Database connection with better error handling - FIXED
const connectDB = async () => {
  try {
    console.log('🔗 Attempting to connect to MongoDB...');
    
    // Validate MONGODB_URI exists
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI environment variable is not defined');
      console.log('💡 For local development: Create a .env file in backend folder');
      console.log('💡 For Vercel: Set environment variables in project settings');
      return; // Don't exit process, allow server to run without DB
    }

    // Validate connection string format
    if (!MONGODB_URI.startsWith('mongodb://') && 
        !MONGODB_URI.startsWith('mongodb+srv://')) {
      throw new Error('Invalid MongoDB connection string format');
    }

    console.log('📡 Connecting to MongoDB Atlas...');
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 second timeout
    });

    console.log('✅ Connected to MongoDB Atlas successfully!');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:');
    console.error('Error:', error.message);
    
    // Don't exit process in production, allow server to run without DB
    if (NODE_ENV === 'production') {
      console.log('⚠️ Server will continue running without database connection');
    } else {
      console.log('💡 Check your MongoDB Atlas connection string and network access');
      process.exit(1);
    }
  }
};

// MongoDB connection events
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

// Connect to database
connectDB();

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: NODE_ENV === 'production' ? 'Something went wrong' : error.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Environment: ${NODE_ENV}`);
});

module.exports = app;