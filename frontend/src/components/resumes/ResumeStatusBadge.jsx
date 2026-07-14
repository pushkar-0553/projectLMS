import React from 'react';

const ResumeStatusBadge = ({ hasResume, updatedAt }) => {
  const getBadgeStyle = (bg, color, borderColor) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    background: bg,
    color: color,
    border: `1px solid ${borderColor}`,
    whiteSpace: 'nowrap',
    lineHeight: '1.2'
  });

  const getDotStyle = (color) => ({
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: color,
    display: 'inline-block',
    flexShrink: 0
  });

  if (!hasResume) {
    return (
      <span style={getBadgeStyle('#fef2f2', '#991b1b', '#fecaca')}>
        <span style={getDotStyle('#ef4444')} />
        Resume Missing
      </span>
    );
  }

  const getStatusText = (dateString) => {
    const updatedDate = new Date(dateString);
    const now = new Date();
    
    // Clear hours to compare calendar days
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const checkDate = new Date(updatedDate.getFullYear(), updatedDate.getMonth(), updatedDate.getDate());

    if (checkDate.getTime() === today.getTime()) {
      return { 
        text: 'Updated Today', 
        bg: '#f0fdf4', 
        color: '#166534', 
        border: '#bbf7d0',
        dot: '#22c55e'
      };
    } else if (checkDate.getTime() === yesterday.getTime()) {
      return { 
        text: 'Updated Yesterday', 
        bg: '#fef9c3', 
        color: '#854d0e', 
        border: '#fef08a',
        dot: '#eab308'
      };
    } else {
      const diffTime = Math.abs(today - checkDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { 
        text: `Updated ${diffDays} Days Ago`, 
        bg: '#f5f3ff', 
        color: '#5b21b6', 
        border: '#ddd6fe',
        dot: '#8b5cf6'
      };
    }
  };

  const status = getStatusText(updatedAt);

  return (
    <span style={getBadgeStyle(status.bg, status.color, status.border)}>
      <span style={getDotStyle(status.dot)} />
      {status.text}
    </span>
  );
};

export default ResumeStatusBadge;
