import React from 'react'

const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  children = null
}) => {
  if (!isOpen) return null

  return (
    <div className="dialog-overlay">
      <div className="dialog-container">
        <div className="dialog-header">
          <h3>{title}</h3>
          <button className="dialog-close" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="dialog-body">
          <p className="dialog-message">{message}</p>
          {children}
        </div>
        
        <div className="dialog-footer">
          <button 
            className="dialog-btn dialog-btn-cancel" 
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button 
            className="dialog-btn dialog-btn-confirm" 
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>

      <style>{`
        .dialog-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .dialog-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .dialog-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px 16px;
          border-bottom: 1px solid #e5e7eb;
        }

        .dialog-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }

        .dialog-close {
          background: none;
          border: none;
          font-size: 24px;
          color: #6b7280;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .dialog-close:hover {
          color: #374151;
        }

        .dialog-body {
          padding: 20px 24px;
        }

        .dialog-message {
          margin: 0 0 16px 0;
          color: #374151;
          line-height: 1.5;
        }

        .dialog-footer {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding: 16px 24px 20px;
          border-top: 1px solid #e5e7eb;
        }

        .dialog-btn {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.2s ease;
        }

        .dialog-btn-cancel {
          background: white;
          color: #6b7280;
          border-color: #d1d5db;
        }

        .dialog-btn-cancel:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .dialog-btn-confirm {
          background: #dc2626;
          color: white;
        }

        .dialog-btn-confirm:hover {
          background: #b91c1c;
        }

        @media (max-width: 640px) {
          .dialog-container {
            width: 95%;
            margin: 20px;
          }

          .dialog-footer {
            flex-direction: column-reverse;
          }

          .dialog-btn {
            width: 100%;
            padding: 10px 16px;
          }
        }
      `}</style>
    </div>
  )
}

export default ConfirmDialog
