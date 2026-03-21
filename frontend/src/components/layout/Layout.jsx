import React from 'react'
import Sidebar from './Sidebar'

const Layout = ({ children }) => {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        {children}
      </div>

      <style>{`
        .app-layout {
          display: flex;
          min-height: 100vh;
        }

        .main-content {
          flex: 1;
          margin-left: 260px;
          background-color: #f8f9fa;
          min-height: 100vh;
        }

        @media (max-width: 768px) {
          .main-content {
            margin-left: 200px;
          }
        }

        @media (max-width: 480px) {
          .main-content {
            margin-left: 70px;
          }
        }
      `}</style>
    </div>
  )
}

export default Layout
