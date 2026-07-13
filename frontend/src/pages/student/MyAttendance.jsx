import React, { useState, useEffect } from 'react'
import { attendanceAPI } from '../../services/api'
import { Calendar, CheckCircle, XCircle, Clock, AlertCircle, BarChart3 } from 'lucide-react'

export default function MyAttendance() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    attendanceAPI.getMyAttendanceSummary().then(r => {
      setData(r.data)
      setLoading(false)
    }).catch(e => {
      console.error(e)
      setLoading(false)
    })
  }, [])

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading attendance...</div>

  if (!data || data.status === 'unassigned') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <AlertCircle size={48} color="#9ca3af" style={{ marginBottom: 16 }} />
        <h3>No Batch Assigned</h3>
        <p>You haven't been assigned to any batch yet. Attendance will appear here once assigned.</p>
      </div>
    )
  }

  const { records, totalDays, presentDays, percentage } = data

  return (
    <div style={{ padding: '1.5rem', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: '1.5rem' }}>My Attendance</h1>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Attendance Rate</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: percentage >= 75 ? '#166534' : '#991b1b' }}>{percentage}%</span>
            <BarChart3 size={20} color="#94a3b8" style={{ marginBottom: 6 }} />
          </div>
        </div>
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Days Present</p>
          <div style={{ marginTop: 8 }}>
            <span style={{ fontSize: 32, fontWeight: 700 }}>{presentDays}</span>
            <span style={{ fontSize: 16, color: '#94a3b8', marginLeft: 4 }}>/ {totalDays}</span>
          </div>
        </div>
      </div>

      {/* History List */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid #f1f5f9', fontWeight: 600 }}>Attendance History</div>
        {records.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No records found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {records.map((r, i) => (
              <div key={i} style={{ 
                display: 'flex', alignItems: 'center', gap: 16, padding: '1rem 1.25rem',
                borderBottom: i === records.length - 1 ? 'none' : '1px solid #f1f5f9'
              }}>
                <div style={{ 
                  width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: r.status === 'present' || r.status === 'late' ? '#dcfce7' : '#fee2e2',
                  color: r.status === 'present' || r.status === 'late' ? '#166534' : '#991b1b'
                }}>
                  {r.status === 'present' || r.status === 'late' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
                    {new Date(r.session_date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                    {r.topic_covered || 'General Session'}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ 
                    fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                    color: r.status === 'present' ? '#166534' : r.status === 'late' ? '#854d0e' : '#991b1b'
                  }}>
                    {r.status}
                  </span>
                  {r.remarks && <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{r.remarks}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
