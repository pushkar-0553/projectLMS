import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { superAdminAPI } from '../../services/api';
import { 
  Layers, 
  Users, 
  BookOpen, 
  Award, 
  TrendingUp, 
  ExternalLink, 
  Plus, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';

const SuperAdminOverview = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    superAdminAPI.getOverview()
      .then((res) => {
        if (res.data.success) {
          setData(res.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
        Loading platform overview...
      </div>
    );
  }

  const { metrics, courses } = data || { metrics: {}, courses: [] };

  const statCards = [
    { title: 'Total Courses', value: metrics.totalCourses || 0, icon: Layers, color: '#4f46e5', bg: '#e0e7ff' },
    { title: 'Platform Users', value: metrics.totalUsers || 0, icon: Users, color: '#0284c7', bg: '#e0f2fe' },
    { title: 'Active Students', value: metrics.totalStudents || 0, icon: Award, color: '#16a34a', bg: '#dcfce7' },
    { title: 'Active Batches', value: metrics.totalBatches || 0, icon: BookOpen, color: '#ca8a04', bg: '#fef9c3' },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          borderRadius: '20px',
          padding: '32px',
          color: '#ffffff',
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3)'
        }}
      >
        <div>
          <span
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.05em'
            }}
          >
            MULTI-COURSE ARCHITECTURE ACTIVE
          </span>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '12px 0 6px' }}>
            Platform Operations & Global Governance
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, maxWidth: '600px', lineHeight: 1.6 }}>
            Manage multiple course tracks with isolated project curricula, batches, student enrollments, and staff assignments from one central command center.
          </p>
        </div>

        <Link
          to="/super-admin/courses"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '10px',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
          }}
        >
          <Plus size={16} />
          <span>Add New Course</span>
        </Link>
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>{card.title}</span>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: card.bg,
                    color: card.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Icon size={16} />
                </div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>{card.value}</div>
            </div>
          );
        })}
      </div>

      {/* Courses Summary Table */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Active Course Curricula
            </h2>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              Real-time student and curriculum breakdown per course
            </div>
          </div>
          <Link
            to="/super-admin/courses"
            style={{ fontSize: '12px', fontWeight: 600, color: '#4f46e5', textDecoration: 'none' }}
          >
            Manage Courses →
          </Link>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '12px 24px', color: '#64748b', fontWeight: 600 }}>Course</th>
              <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>Code / Slug</th>
              <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>Students</th>
              <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>Batches</th>
              <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>Projects</th>
              <th style={{ padding: '12px 24px', color: '#64748b', fontWeight: 600, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => {
              const isActive = c.status === 'active';
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{c.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{c.duration || '6 Months'}</div>
                  </td>
                  <td style={{ padding: '16px 16px' }}>
                    <span
                      style={{
                        background: '#e0e7ff',
                        color: '#4338ca',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700
                      }}
                    >
                      {c.code}
                    </span>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>/{c.slug}</div>
                  </td>
                  <td style={{ padding: '16px 16px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: isActive ? '#15803d' : '#991b1b',
                        background: isActive ? '#dcfce7' : '#fee2e2',
                        padding: '2px 8px',
                        borderRadius: '9999px'
                      }}
                    >
                      {isActive ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 16px', fontWeight: 600, color: '#0f172a' }}>
                    {c.stats?.totalStudents || 0}
                  </td>
                  <td style={{ padding: '16px 16px', fontWeight: 600, color: '#0f172a' }}>
                    {c.stats?.totalBatches || 0}
                  </td>
                  <td style={{ padding: '16px 16px', fontWeight: 600, color: '#0f172a' }}>
                    {c.stats?.totalProjects || 0}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <a
                      href={`/${c.slug}/dashboard`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: '#4f46e5',
                        textDecoration: 'none',
                        fontWeight: 600,
                        fontSize: '12px'
                      }}
                    >
                      <span>Launch</span>
                      <ExternalLink size={12} />
                    </a>
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

export default SuperAdminOverview;
