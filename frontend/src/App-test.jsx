// Minimal test App component to debug rendering issues
import React from 'react'

function AppTest() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>React App Test</h1>
      <p>If you can see this, React is working!</p>
      <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <h2>Debug Information:</h2>
        <p>React is loaded and rendering correctly.</p>
        <p>Time: {new Date().toLocaleString()}</p>
      </div>
    </div>
  )
}

export default AppTest
