import React, { useState, useEffect } from 'react';
import { superAdminAPI } from '../../services/api';
import { Users, Search, Shield, Award, BookOpen, Clock } from 'lucide-react';

const SuperAdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    superAdminAPI.getAllUsers()
      .then((res) => {
        if (res.data.success) {
          setUsers(res.data.users);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role) => {
    switch (role) {
      case 'super_admin':
        return { label: 'Super Admin', bg: '#fef2f2', color: '#dc2626' };
      case 'admin':
        return { label: 'Admin', bg: '#ede9fe', color: '#7c3aed' };
      case 'coordinator':
        return { label: 'Coordinator', bg: '#e0f2fe', color: '#0284c7' };
      case 'faculty':
        return { label: 'Faculty', bg: '#fef9c3', color: '#ca8a04' };
      default:
        return { label: 'Student', bg: '#dcfce7', color: '#16a34a' };
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Global Users Directory</h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            Unified user directory across all courses and platform administrative levels.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 38px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '13px',
            outline: 'none',
            background: '#ffffff'
          }}
        >
          <option value="all">All Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="coordinator">Coordinator</option>
          <option value="faculty">Faculty</option>
          <option value="student">Student</option>
        </select>
      </div>

      {/* Users Table */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '12px 24px', color: '#64748b', fontWeight: 600 }}>User</th>
              <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>Global Role</th>
              <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>Active Courses</th>
              <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>Mobile</th>
              <th style={{ padding: '12px 24px', color: '#64748b', fontWeight: 600 }}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => {
              const badge = getRoleBadge(u.role);
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 24px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{u.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{u.email}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        background: badge.bg,
                        color: badge.color,
                        padding: '3px 8px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 700
                      }}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0f172a' }}>
                    {u.active_courses_count || 1} Course(s)
                  </td>
                  <td style={{ padding: '14px 16px', color: '#64748b' }}>
                    {u.mobile || '—'}
                  </td>
                  <td style={{ padding: '14px 24px', color: '#64748b', fontSize: '12px' }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SuperAdminUsers;
