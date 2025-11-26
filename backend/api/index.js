// Simple test to verify Vercel works
const express = require('express');
const app = express();

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Vercel is working!' });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'Test successful', timestamp: new Date().toISOString() });
});

module.exports = app;