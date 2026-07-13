// Debug version of App to isolate rendering issues
import React from 'react'

function AppDebug() {
  console.log('AppDebug component is rendering...');
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f0f0f0' }}>
      <h1 style={{ color: '#333' }}>Platform Debug Mode</h1>
      <p style={{ color: '#666' }}>Testing basic React rendering...</p>
      
      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        border: '1px solid #ccc', 
        borderRadius: '5px',
        backgroundColor: 'white'
      }}>
        <h2>Debug Information:</h2>
        <ul>
          <li>React is loaded</li>
          <li>Component is rendering</li>
          <li>Time: {new Date().toLocaleString()}</li>
        </ul>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={() => alert('Button click works!')}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test JavaScript
        </button>
      </div>
    </div>
  )
}

export default AppDebug
