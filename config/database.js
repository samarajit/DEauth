const { prisma } = require('../models/User');

const connectDB = async () => {
  try {
    // Prisma connects lazily, but we can force a connection to test
    await prisma.$connect();
    console.log(`  ✓ PostgreSQL connected via Prisma`);
  } catch (error) {
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n  ✗ PostgreSQL Error: Connection Refused!');
      console.error('    Could not connect to PostgreSQL at ' + process.env.DATABASE_URL);
      console.error('\n    Possible fixes:');
      console.error('    1. Ensure PostgreSQL is installed and running locally.');
      console.error('    2. Check if your DATABASE_URL in .env is correct.');
      console.error('    3. Run `npm run docker:up` to start PostgreSQL using Docker.\n');
    } else {
      console.error(`  ✗ PostgreSQL error: ${error.message}`);
    }
    process.exit(1);
  }
};

module.exports = connectDB;