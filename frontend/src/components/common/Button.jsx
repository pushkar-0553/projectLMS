import React from 'react'

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  onClick, 
  disabled = false, 
  type = 'button',
  className = '',
  ...props 
}) => {
  const baseClasses = 'btn'
  // Support more variants: primary, secondary, success, warning, danger, glass, outline
  const variantClasses = `btn-${variant}`
  const sizeClasses = size === 'small' ? 'btn-sm' : size === 'large' ? 'btn-lg' : ''
  
  const classes = [
    baseClasses,
    variantClasses,
    sizeClasses,
    className
  ].filter(Boolean).join(' ')

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
