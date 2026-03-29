const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`  ✓ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n  ✗ MongoDB Error: Connection Refused!');
      console.error('    Could not connect to MongoDB at ' + process.env.MONGODB_URI);
      console.error('\n    Possible fixes:');
      console.error('    1. Ensure MongoDB is installed and running locally.');
      console.error('    2. Check if your MONGODB_URI in .env is correct.');
      console.error('    3. Run `npm run docker:up` to start MongoDB using Docker.\n');
    } else {
      console.error(`  ✗ MongoDB error: ${error.message}`);
    }
    process.exit(1);
  }
};

module.exports = connectDB;