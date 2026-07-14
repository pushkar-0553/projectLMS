const pool = require('../config/db');
const ResumeCollection = require('../models/ResumeCollection');

async function test() {
  try {
    console.log('Testing ResumeCollection.getAll()...');
    const result = await ResumeCollection.getAll();
    console.log('Success! Count:', result.length);
    console.log('Data:', result);
    process.exit(0);
  } catch (err) {
    console.error('Error running ResumeCollection.getAll():', err);
    process.exit(1);
  }
}

test();
