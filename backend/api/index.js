// api/index.js - Error catcher
try {
  const app = require('../server.js');
  module.exports = app;
} catch (error) {
  console.error('LOAD ERROR:', error.stack);
  
  const express = require('express');
  const app = express();
  
  app.get('*', (req, res) => {
    res.status(500).json({
      error: 'Server load failed',
      message: error.message
    });
  });
  
  module.exports = app;
}