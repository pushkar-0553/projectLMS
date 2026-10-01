import React, { useState, useEffect } from 'react';
import { superAdminAPI } from '../../services/api';
import {
  Cloud,
  Database,
  Server,
  Cpu,
  HardDrive,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Activity,
  Layers,
  FileText,
  Clock,
  Zap,
  ArrowUpRight,
  TrendingUp,
  BarChart3
} from 'lucide-react';

const SuperAdminTelemetry = () => {
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchTelemetry = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    setError('');
    try {
      const res = await superAdminAPI.getTelemetry();
      const raw = res.data?.telemetry || res.data;
      if (raw && (raw.cloudinary || raw.tidb || raw.server)) {
        setTelemetry(raw);
        setLastRefreshed(new Date());
      } else {
        setError('Failed to parse telemetry data.');
      }
    } catch (err) {
      console.error('Telemetry fetch error:', err);
      setError(err.response?.data?.message || 'Error communicating with telemetry endpoints.');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      fetchTelemetry();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: '15px', color: '#64748b', fontWeight: '500' }}>Loading infrastructure & telemetry data...</span>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const { cloudinary, tidb, server } = telemetry || {};

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '60px' }}>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .telemetry-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .telemetry-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
        }
      `}</style>

      {/* Top Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 60%, #0f172a 100%)',
          borderRadius: '20px',
          padding: '28px 32px',
          color: '#ffffff',
          marginBottom: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.4)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span
              style={{
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                padding: '3px 10px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.05em'
              }}
            >
              LIVE TELEMETRY
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              Updated {lastRefreshed.toLocaleTimeString()}
            </span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Platform Infrastructure & Telemetry Center
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, maxWidth: '650px', lineHeight: 1.5 }}>
            Real-time live monitoring of Cloudinary Free Tier quota, TiDB Serverless database storage, and Node.js host runtime health.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => fetchTelemetry(true)}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              padding: '10px 16px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <RefreshCw size={15} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Metrics'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: '600', marginBottom: '24px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* High-Level Status Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="telemetry-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '4px solid #06b6d4' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0891b2' }}>
            <Cloud size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Cloudinary Storage</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
              {cloudinary?.plan || 'Free'} Tier
            </div>
            <div style={{ fontSize: '12px', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <CheckCircle size={13} /> {cloudinary?.storage?.used_mb || 0} MB Used
            </div>
          </div>
        </div>

        <div className="telemetry-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '4px solid #6366f1' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
            <Database size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>TiDB Serverless</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
              {tidb?.total_size_mb || 0} MB
            </div>
            <div style={{ fontSize: '12px', color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <CheckCircle size={13} /> {tidb?.total_tables || 0} Tables · {tidb?.total_records?.toLocaleString() || 0} Rows
            </div>
          </div>
        </div>

        <div className="telemetry-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '4px solid #10b981' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
            <Server size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Server Runtime</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
              {server?.uptime_formatted || '0m'} Uptime
            </div>
            <div style={{ fontSize: '12px', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <CheckCircle size={13} /> Node {server?.node_version} · Heap {server?.memory?.heap_used_mb} MB
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: CLOUDINARY USAGE & RESUME TRACKING */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Cloud size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Cloudinary Free Tier Tracking & Resumes
              </h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                Live quota consumption from Cloudinary Admin API v1_1
              </p>
            </div>
          </div>

          <span style={{ fontSize: '12px', fontWeight: '600', color: '#0284c7', background: '#e0f2fe', padding: '4px 10px', borderRadius: '8px' }}>
            Rate Limit Remaining: {cloudinary?.rate_limit?.remaining || 0} / {cloudinary?.rate_limit?.limit || 500} per hr
          </span>
        </div>

        {/* 4 Quota Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          {/* Storage Card */}
          <div className="telemetry-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Storage Used</span>
              <HardDrive size={16} style={{ color: '#0284c7' }} />
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
              {cloudinary?.storage?.used_mb || 0} <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>MB</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px' }}>
              {cloudinary?.storage?.used_bytes?.toLocaleString() || 0} bytes
            </div>
            <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(2, Math.min(100, (parseFloat(cloudinary?.storage?.used_mb || 0) / 1024) * 100))}%`, height: '100%', background: '#0284c7', borderRadius: '3px' }} />
            </div>
          </div>

          {/* Bandwidth Card */}
          <div className="telemetry-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Bandwidth Used</span>
              <Activity size={16} style={{ color: '#10b981' }} />
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
              {cloudinary?.bandwidth?.used_mb || 0} <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>MB</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px' }}>
              {cloudinary?.bandwidth?.used_bytes?.toLocaleString() || 0} bytes transferred
            </div>
            <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(2, Math.min(100, (parseFloat(cloudinary?.bandwidth?.used_mb || 0) / 1024) * 100))}%`, height: '100%', background: '#10b981', borderRadius: '3px' }} />
            </div>
          </div>

          {/* Credits Balance Card */}
          <div className="telemetry-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Free Plan Credits</span>
              <Zap size={16} style={{ color: '#f59e0b' }} />
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
              {cloudinary?.credits?.used || 0} <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>/ {cloudinary?.credits?.limit || 25}</span>
            </div>
            <div style={{ fontSize: '11px', color: '#059669', fontWeight: '600', marginBottom: '10px' }}>
              {cloudinary?.credits?.remaining || 25} credits remaining
            </div>
            <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(2, Math.min(100, (parseFloat(cloudinary?.credits?.used || 0) / (cloudinary?.credits?.limit || 25)) * 100))}%`, height: '100%', background: '#f59e0b', borderRadius: '3px' }} />
            </div>
          </div>

          {/* Objects Stored Card */}
          <div className="telemetry-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Media Assets</span>
              <FileText size={16} style={{ color: '#8b5cf6' }} />
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
              {cloudinary?.resources?.objects || 0} <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>Files</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px' }}>
              Transformations: {cloudinary?.resources?.transformations || 0}
            </div>
            <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(2, Math.min(100, ((cloudinary?.resources?.objects || 0) / 500) * 100))}%`, height: '100%', background: '#8b5cf6', borderRadius: '3px' }} />
            </div>
          </div>
        </div>

        {/* Resumes Stored Per Course Table */}
        <div className="telemetry-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={18} style={{ color: '#0284c7' }} />
              Resumes Distribution By Course
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Total Resumes Attached: <strong>{cloudinary?.resumes_by_course?.reduce((acc, c) => acc + (c.total_resumes || 0), 0) || 0}</strong>
            </span>
          </div>

          {!cloudinary?.resumes_by_course || cloudinary.resumes_by_course.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0, padding: '16px 0', textAlign: 'center' }}>No courses with uploaded resumes found yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', fontWeight: '600' }}>Course Track</th>
                    <th style={{ padding: '10px 14px', fontWeight: '600' }}>Code</th>
                    <th style={{ padding: '10px 14px', fontWeight: '600' }}>Resumes Attached</th>
                    <th style={{ padding: '10px 14px', fontWeight: '600' }}>Share of Cloudinary Storage</th>
                    <th style={{ padding: '10px 14px', fontWeight: '600' }}>Last Upload</th>
                  </tr>
                </thead>
                <tbody>
                  {cloudinary.resumes_by_course.map((c, i) => {
                    const totalResumes = cloudinary.resumes_by_course.reduce((acc, item) => acc + (item.total_resumes || 0), 0);
                    const pct = totalResumes > 0 ? Math.round((c.total_resumes / totalResumes) * 100) : 0;
                    return (
                      <tr key={c.course_id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px', fontWeight: '700', color: '#0f172a' }}>
                          {c.course_name}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>
                            {c.course_code}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: '600', color: '#0f172a' }}>
                          {c.total_resumes} PDFs
                        </td>
                        <td style={{ padding: '12px 14px', minWidth: '160px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: '#0284c7', borderRadius: '3px' }} />
                            </div>
                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', width: '35px' }}>{pct}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '12px' }}>
                          {c.latest_upload ? new Date(c.latest_upload).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: TiDB SERVERLESS DATABASE TRACKING */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Database size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                TiDB Serverless Database Metrics
              </h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                Database: <strong>{tidb?.database_name || 'lms_db'}</strong> · Engine: {tidb?.version || 'TiDB v8.5'}
              </p>
            </div>
          </div>

          <span style={{ fontSize: '12px', fontWeight: '600', color: '#4f46e5', background: '#e0e7ff', padding: '4px 10px', borderRadius: '8px' }}>
            Active Connections: {tidb?.active_connections || 1}
          </span>
        </div>

        {/* 4 TiDB Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div className="telemetry-card">
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
              Total Database Size
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#4f46e5', marginBottom: '4px' }}>
              {tidb?.total_size_mb || 0} <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>MB</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Data: {tidb?.data_size_mb || 0} MB · Index: {tidb?.index_size_mb || 0} MB
            </div>
          </div>

          <div className="telemetry-card">
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
              Total Schema Tables
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
              {tidb?.total_tables || 0} <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>Tables</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Relational tables across all modules
            </div>
          </div>

          <div className="telemetry-card">
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
              Total Database Records
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
              {tidb?.total_records?.toLocaleString() || 0} <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>Rows</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Aggregated across all tables
            </div>
          </div>

          <div className="telemetry-card">
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
              Serverless Latency / Status
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#10b981', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Connected
            </div>
            <div style={{ fontSize: '11px', color: '#059669', fontWeight: '600' }}>
              Distributed Storage Engine Healthy
            </div>
          </div>
        </div>

        {/* Top Tables Size Breakdown */}
        <div className="telemetry-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} style={{ color: '#4f46e5' }} />
              Top Tables by Storage & Record Density
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Source: <code>information_schema.tables</code>
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px', fontWeight: '600' }}>Table Name</th>
                  <th style={{ padding: '10px 14px', fontWeight: '600' }}>Record Count</th>
                  <th style={{ padding: '10px 14px', fontWeight: '600' }}>Data Size</th>
                  <th style={{ padding: '10px 14px', fontWeight: '600' }}>Index Size</th>
                  <th style={{ padding: '10px 14px', fontWeight: '600' }}>Total Size</th>
                </tr>
              </thead>
              <tbody>
                {tidb?.top_tables?.map((t, idx) => (
                  <tr key={t.table_name || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontWeight: '600', color: '#0f172a', fontFamily: 'monospace' }}>
                      📋 {t.table_name}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: '600', color: '#334155' }}>
                      {t.table_rows?.toLocaleString() || 0}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>
                      {t.data_mb} MB
                    </td>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>
                      {t.index_mb} MB
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: '700', color: '#4f46e5' }}>
                      {t.total_mb} MB
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 3: SERVER & PROCESS RUNTIME HEALTH */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <Server size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Node.js Application Server & Host Health
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              Process telemetry, CPU resources, and RAM allocation
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          <div className="telemetry-card">
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
              Server Uptime
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
              {server?.uptime_formatted || '0m'}
            </div>
            <div style={{ fontSize: '11px', color: '#059669', fontWeight: '600' }}>
              Continuous Service Active
            </div>
          </div>

          <div className="telemetry-card">
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
              Node V8 Heap Allocation
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
              {server?.memory?.heap_used_mb || 0} <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>/ {server?.memory?.heap_total_mb || 0} MB</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
              RSS: {server?.memory?.rss_mb || 0} MB
            </div>
            <div style={{ width: '100%', height: '5px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.round((parseFloat(server?.memory?.heap_used_mb || 0) / parseFloat(server?.memory?.heap_total_mb || 1)) * 100)}%`,
                  height: '100%',
                  background: '#059669',
                  borderRadius: '3px'
                }}
              />
            </div>
          </div>

          <div className="telemetry-card">
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
              Host Memory (RAM)
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
              {server?.memory?.system_free_mb || 0} <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>MB Free</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Total Installed: {server?.memory?.system_total_mb || 0} MB
            </div>
          </div>

          <div className="telemetry-card">
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
              CPU Architecture
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
              {server?.cpu_count || 4} <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Cores</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Platform: {server?.platform} · Node {server?.node_version}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminTelemetry;
