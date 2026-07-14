import React from 'react';

const ResumeFilters = ({ 
  searchQuery, 
  setSearchQuery, 
  filters, 
  setFilters, 
  batches = [] 
}) => {
  const domains = ['Frontend', 'MERN', 'Java', 'Python', 'Testing', 'UI/UX'];
  
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div style={styles.container}>
      {/* Search Input */}
      <div style={styles.searchGroup}>
        <span style={styles.searchIcon}>🔍</span>
        <input
          type="text"
          placeholder="Search by student name, email, or mobile number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Select Filters */}
      <div style={styles.filtersGroup}>
        {/* Domain Filter */}
        <div style={styles.filterWrapper}>
          <label style={styles.label}>Domain</label>
          <select
            value={filters.domain || ''}
            onChange={(e) => handleFilterChange('domain', e.target.value)}
            style={styles.select}
          >
            <option value="">All Domains</option>
            {domains.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Batch Filter */}
        <div style={styles.filterWrapper}>
          <label style={styles.label}>Batch</label>
          <select
            value={filters.batch || ''}
            onChange={(e) => handleFilterChange('batch', e.target.value)}
            style={styles.select}
          >
            <option value="">All Batches</option>
            {batches.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {/* Resume Status Filter */}
        <div style={styles.filterWrapper}>
          <label style={styles.label}>Resume Status</label>
          <select
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            style={styles.select}
          >
            <option value="">All Statuses</option>
            <option value="has_resume">Has Resume</option>
            <option value="missing">Resume Missing</option>
          </select>
        </div>

        {/* Resume Updated Date Filter */}
        <div style={styles.filterWrapper}>
          <label style={styles.label}>Updated Date</label>
          <select
            value={filters.date || 'all'}
            onChange={(e) => handleFilterChange('date', e.target.value)}
            style={styles.select}
          >
            <option value="all">Any Date</option>
            <option value="today">Updated Today</option>
            <option value="yesterday">Updated Yesterday</option>
            <option value="days_ago">Updated within 7 Days</option>
          </select>
        </div>

        {/* Reset Button */}
        <button
          onClick={() => {
            setSearchQuery('');
            setFilters({ domain: '', batch: '', status: '', date: 'all' });
          }}
          style={styles.resetBtn}
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '24px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  searchGroup: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%'
  },
  searchIcon: {
    position: 'absolute',
    left: '14px',
    fontSize: '16px',
    color: '#94a3b8'
  },
  searchInput: {
    width: '100%',
    padding: '12px 14px 12px 42px',
    fontSize: '14px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  filtersGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '14px',
    alignItems: 'flex-end'
  },
  filterWrapper: {
    flex: '1 1 180px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  select: {
    padding: '10px 12px',
    fontSize: '13px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    outline: 'none',
    background: '#ffffff',
    color: '#1e293b',
    cursor: 'pointer'
  },
  resetBtn: {
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#ef4444',
    background: '#fee2e2',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.2s',
    alignSelf: 'flex-end',
    height: '38px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
};

export default ResumeFilters;
