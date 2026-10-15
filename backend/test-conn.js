const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI is not set in backend/.env');
  process.exit(1);
}

const maskedUri = uri.replace(/:([^:@]+)@/, ':****@');
console.log('----------------------------------------------------');
console.log('🔍 Testing MongoDB Connection...');
console.log('📍 URI:', maskedUri);
console.log('----------------------------------------------------');

const isAtlas = uri.startsWith('mongodb+srv://');

const options = {
  autoIndex: true,
  socketTimeoutMS: 30000,
  serverSelectionTimeoutMS: 8000,
};

if (!isAtlas) {
  options.family = 4;
}

mongoose.connect(uri, options)
  .then(async (conn) => {
    console.log('✅ Connection SUCCESSFUL!');
    console.log(`📡 Host: ${conn.connection.host}`);
    console.log(`📁 Database: ${conn.connection.name}`);
    
    try {
      const collections = await conn.connection.db.listCollections().toArray();
      console.log(`📋 Found ${collections.length} collection(s):`, collections.map(c => c.name).join(', ') || '(none yet)');
    } catch (e) {
      console.log('Note on collections:', e.message);
    }

    console.log('----------------------------------------------------');
    console.log('🎉 Your database connection is completely workable!');
    console.log('----------------------------------------------------');
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Connection Failed!');
    console.error(`Reason: ${err.message}`);

    if (
      err.message.includes('SSL alert number 80') ||
      err.message.includes('tlsv1 alert internal error') ||
      err.name === 'MongooseServerSelectionError'
    ) {
      console.log('\n================== HOW TO FIX ==================');
      console.log('MongoDB Atlas rejected the TLS handshake because your current IP address is not whitelisted.');
      
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json').then(r => r.json());
        console.log(`\nYour current public IP address is: ${ipRes.ip}`);
      } catch (_) {}

      console.log('\nSteps to fix in MongoDB Atlas:');
      console.log('1. Go to https://cloud.mongodb.com and log in.');
      console.log('2. Click on "Network Access" in the left navigation sidebar.');
      console.log('3. Click the "+ ADD IP ADDRESS" button.');
      console.log('4. Click "ALLOW ACCESS FROM ANYWHERE" (0.0.0.0/0) or "ADD CURRENT IP ADDRESS".');
      console.log('5. Click "Confirm" and wait ~1 minute for Atlas to apply the rule.');
      console.log('6. Re-run: npm run test:db');
      console.log('================================================\n');
    }

    process.exit(1);
  });
