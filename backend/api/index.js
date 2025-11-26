// api/index.js - FIXED VERSION
console.log('🔧 Loading dependencies...');

// Fix for mongoose version issues
const mongoose = require('mongoose');
mongoose.set('strictQuery', true); // Add this line

try {
  console.log('🔧 Loading server.js...');
  const app = require('../server.js');
  console.log('✅ server.js loaded successfully');
  
  module.exports = app;
  
} catch (error) {
  console.error('❌ Error loading server.js:', error.message);
  console.error('Stack:', error.stack);
  
  // Create fallback app
  const express = require('express');
  const fallbackApp = express();
  
  fallbackApp.use(express.json());
  
  fallbackApp.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    next();
  });
  
  fallbackApp.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'Smart Register API (Fallback Mode)',
      error: 'Main server failed to load: ' + error.message,
      timestamp: new Date().toISOString()
    });
  });
  
  fallbackApp.get('/api/health', (req, res) => {
    res.json({
      success: true,
      message: 'API is running in fallback mode',
      mongodb: 'disabled',
      timestamp: new Date().toISOString()
    });
  });
  
  fallbackApp.all('/api/*', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Service temporarily unavailable',
      error: error.message
    });
  });
  
  module.exports = fallbackApp;
}