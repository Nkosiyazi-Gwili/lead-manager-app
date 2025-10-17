// Simple script to verify environment variables
console.log('🔍 Checking Environment Variables:\n');

const requiredVars = {
  'MONGODB_URI': 'MongoDB connection string',
  'JWT_SECRET': 'JWT secret key for authentication',
  'JWT_EXPIRE': 'JWT expiration time (default: 7d)',
  'NODE_ENV': 'Environment (production/development)'
};

let allSet = true;

Object.entries(requiredVars).forEach(([varName, description]) => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: SET`);
    console.log(`   Description: ${description}`);
    if (varName === 'MONGODB_URI') {
      console.log(`   Value: ${value.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
    } else if (varName !== 'JWT_SECRET') {
      console.log(`   Value: ${value}`);
    }
  } else {
    console.log(`❌ ${varName}: MISSING`);
    console.log(`   Description: ${description}`);
    allSet = false;
  }
  console.log('---');
});

if (allSet) {
  console.log('🎉 All environment variables are set!');
} else {
  console.log('💥 Missing environment variables!');
  console.log('💡 Add them in Vercel Dashboard → Settings → Environment Variables');
}