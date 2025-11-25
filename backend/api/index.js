require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// CORS Configuration
const allowedOrigins = [
  'https://lead-manager-front-end-app.vercel.app',
  'http://localhost:3000',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Debug middleware
app.use((req, res, next) => {
  console.log('📍 Request:', req.method, req.url, 'Origin:', req.headers.origin);
  next();
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return true;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });
    console.log('✅ MongoDB Connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
};

// Import routes
const authRoutes = require('./routes/auth');
const leadsRoutes = require('./routes/leads');
const usersRoutes = require('./routes/users');
const reportsRoutes = require('./routes/reports');
const metaRoutes = require('./routes/meta');
const importRoutes = require('./routes/import');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/leads/import', importRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  const dbConnected = await connectDB();
  res.json({ 
    success: true, 
    message: 'Server is running',
    mongodb: { connected: dbConnected }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Smart Register Backend API' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

module.exports = app;