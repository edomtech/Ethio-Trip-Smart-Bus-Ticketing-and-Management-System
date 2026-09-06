const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ethiobus';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host} / Database: ${conn.connection.name}`);
  } catch (err) { 
    console.error(`❌ MongoDB Connection Error: ${err.message}`);
    console.error('\n📌 HOW TO FIX THIS:');
    console.error('Option 1: Start your local MongoDB service (Windows Administrator)');
    console.error('  Run PowerShell as Administrator and execute: net start MongoDB');
    console.error('Option 2: Use MongoDB Atlas (Cloud)');
    console.error('  Update MONGODB_URI in backend/.env with your MongoDB Atlas connection string.\n');
    process.exit(1);
  } 
};

module.exports = connectDB;
