import React from 'react'

const ProgressBar = ({ 
  progress = 0, 
  showLabel = true, 
  color = 'primary',
  height = 'medium',
  className = '' 
}) => {
  const baseClasses = 'progress-bar'
  const colorClass = color === 'success' ? 'progress-success' : ''
  const heightClass = height === 'small' ? 'progress-sm' : 
                     height === 'large' ? 'progress-lg' : ''
  
  const classes = [
    baseClasses,
    colorClass,
    heightClass,
    className
  ].filter(Boolean).join(' ')

  const percentage = Math.min(100, Math.max(0, progress))

  return (
    <div className={classes}>
      {showLabel && (
        <div className="progress-label">
          {percentage}%
        </div>
      )}
      <div className="progress-track">
        <div 
          className="progress-fill" 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export default ProgressBar
