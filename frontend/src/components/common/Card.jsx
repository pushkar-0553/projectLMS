import React from 'react'

const Card = ({ 
  children, 
  className = '', 
  hover = true, 
  padding = 'medium',
  ...props 
}) => {
  const baseClasses = 'card'
  const hoverClass = hover ? '' : ''
  const paddingClass = padding === 'small' ? 'card-sm' : 
                      padding === 'large' ? 'card-lg' : ''
  
  const classes = [
    baseClasses,
    hoverClass,
    paddingClass,
    className
  ].filter(Boolean).join(' ')

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  )
}

export default Card
