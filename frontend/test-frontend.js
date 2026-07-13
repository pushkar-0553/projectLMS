// Simple test to verify frontend setup
const http = require('http');

async function testFrontend() {
  try {
    // Test if frontend server is responding
    const response = await fetch('http://localhost:3000');
    const text = await response.text();
    
    if (text.includes('project-learning-frontend')) {
      console.log('Frontend server is running successfully!');
      console.log('Status: OK');
    } else {
      console.log('Frontend responded but may have issues');
      console.log('Status: WARNING');
    }
  } catch (error) {
    console.log('Frontend server not responding:', error.message);
    console.log('Status: ERROR');
  }
}

testFrontend();
