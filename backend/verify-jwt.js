// verify-jwt.js
const jwt = require('jsonwebtoken');

const payload = { userId: 'test' };
const token = jwt.sign(payload, process.env.JWT_SECRET);
const decoded = jwt.verify(token, process.env.JWT_SECRET);

console.log('✅ JWT setup is working correctly');
console.log('Decoded payload:', decoded);