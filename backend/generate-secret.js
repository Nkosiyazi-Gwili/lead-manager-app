const crypto = require('crypto');

// Generate a 64-byte (512-bit) random string
const jwtSecret = crypto.randomBytes(64).toString('hex');
console.log('JWT_SECRET=', jwtSecret);