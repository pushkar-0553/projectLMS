// Simple test to check if React app is working
console.log('Testing React app...');

// Check if the root element exists
const rootElement = document.getElementById('root');
if (rootElement) {
  console.log('Root element found:', rootElement);
  rootElement.innerHTML = '<div style="padding: 20px; font-family: Arial, sans-serif;"><h1>React App Test</h1><p>If you can see this, the basic HTML is working!</p></div>';
} else {
  console.error('Root element not found!');
}
