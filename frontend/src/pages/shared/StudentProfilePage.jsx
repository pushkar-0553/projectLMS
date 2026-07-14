import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { userAPI, resumeAPI } from '../../services/api'
import ResumeUpload from '../resumes/ResumeUpload'
import ResumeHistory from '../resumes/ResumeHistory'
import {
  ArrowLeft, Mail, Phone, BookOpen, Calendar,
  Award, AlertTriangle, Users, Edit2, Trash2, Save, X,
  CheckCircle, XCircle, Clock, TrendingUp, Activity,
  BarChart2, Target, Layers, FileText, Briefcase
} from 'lucide-react'

/* ── Status config ─────────────────────────────────────── */
const STATUS = {
  approved: { bg: '#dcfce7', text: '#15803d', dot: '#22c55e', label: 'Approved' },
  pending:  { bg: '#fef9c3', text: '#92400e', dot: '#f59e0b', label: 'Pending'  },
  rejected: { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444', label: 'Rejected' },
  present:  { bg: '#dcfce7', text: '#15803d', dot: '#22c55e', label: 'Present'  },
  absent:   { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444', label: 'Absent'   },
  late:     { bg: '#fef9c3', text: '#92400e', dot: '#f59e0b', label: 'Late'     },
  excused:  { bg: '#e0e7ff', text: '#3730a3', dot: '#818cf8', label: 'Excused'  },
}

const Chip = ({ status }) => {
  const c = STATUS[status] || { bg: '#f3f4f6', text: '#6b7280', dot: '#9ca3af', label: status }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: c.bg, color: c.text
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {c.label}
    </span>
  )
}

/* ── Donut ring ─────────────────────────────────────────── */
const DonutRing = ({ pct, color, size = 90, stroke = 9 }) => {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
    </svg>
  )
}

/* ── Stat pill ──────────────────────────────────────────── */
const StatPill = ({ icon: Icon, label, value, accent }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 4, padding: '18px 12px', borderRadius: 16,
    background: '#fff', border: '1px solid #e2e8f0',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)', textAlign: 'center', flex: 1
  }}>
    <div style={{
      width: 38, height: 38, borderRadius: 10,
      background: accent + '18', color: accent,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <Icon size={18} />
    </div>
    <span style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{value}</span>
    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
  </div>
)

/* ── Main component ─────────────────────────────────────── */
export default function StudentProfilePage() {
  const { studentId: paramId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const studentId = paramId || user?.id
  const isStaff = ['admin', 'coordinator', 'faculty'].includes(user?.role)

  const [profile, setProfile]         = useState(null)
  const [batches, setBatches]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [editingBatch, setEditingBatch]   = useState(false)
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [savingBatch, setSavingBatch] = useState(false)
  const [activeTab, setActiveTab]     = useState('submissions')

  // Placement Hub states
  const [editingPlacement, setEditingPlacement] = useState(false)
  const [placementForm, setPlacementForm] = useState({
    domain: '',
    college: '',
    passout_year: '',
    current_location: '',
    skills: '',
    github: '',
    linkedin: ''
  })
  const [savingPlacement, setSavingPlacement] = useState(false)
  const [refreshHistory, setRefreshHistory] = useState(0)

  // Mentor notes states
  const [profileNotes, setProfileNotes] = useState([])
  const [newProfileNote, setNewProfileNote] = useState('')
  const [savingProfileNote, setSavingProfileNote] = useState(false)

  const backPath = user?.role === 'admin'
    ? '/admin/students'
    : user?.role === 'faculty'
      ? '/faculty/student-monitoring'
      : user?.role === 'coordinator'
        ? '/coordinator'
        : '/dashboard'

  useEffect(() => {
    loadProfile()
    userAPI.getAllBatchesForAssignment().then(r => setBatches(r.data)).catch(() => {})
  }, [studentId])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const res = await userAPI.getStudentProfile(studentId)
      setProfile(res.data)
      setSelectedBatchId(res.data.currentBatch?.id || '')
      
      const s = res.data.student
      setPlacementForm({
        domain: s.domain || '',
        college: s.college || '',
        passout_year: s.passout_year || '',
        current_location: s.current_location || '',
        skills: s.skills || '',
        github: s.github || '',
        linkedin: s.linkedin || ''
      })

      if (['admin', 'coordinator', 'faculty'].includes(user?.role)) {
        try {
          const notesRes = await resumeAPI.getNotes(studentId)
          setProfileNotes(notesRes.data)
        } catch (e) {
          console.error('Error fetching student notes on profile', e)
        }
      }
    } catch {
      setError('Failed to load student profile.')
    } finally {
      setLoading(false)
    }
  }

  const handleAssignBatch = async () => {
    if (!selectedBatchId) return
    setSavingBatch(true)
    try {
      await userAPI.assignStudentBatch(studentId, parseInt(selectedBatchId))
      await loadProfile()
      setEditingBatch(false)
    } catch {
      alert('Failed to assign batch. Please try again.')
    } finally {
      setSavingBatch(false)
    }
  }

  const handleRemoveBatch = async () => {
    if (!window.confirm('Remove this student from their current batch?')) return
    setSavingBatch(true)
    try {
      await userAPI.removeStudentBatch(studentId)
      await loadProfile()
      setEditingBatch(false)
    } catch {
      alert('Failed to remove from batch.')
    } finally {
      setSavingBatch(false)
    }
  }

  const handleUpdatePlacement = async (e) => {
    e.preventDefault()
    setSavingPlacement(true)
    try {
      await resumeAPI.updatePlacementInfo(studentId, {
        domain: placementForm.domain,
        college: placementForm.college,
        passout_year: placementForm.passout_year,
        current_location: placementForm.current_location,
        skills: placementForm.skills,
        github: placementForm.github,
        linkedin: placementForm.linkedin
      })
      await loadProfile()
      setEditingPlacement(false)
    } catch (err) {
      alert('Failed to update placement details.')
    } finally {
      setSavingPlacement(false)
    }
  }

  const handleAddProfileNote = async (e) => {
    e.preventDefault()
    if (!newProfileNote.trim()) return
    setSavingProfileNote(true)
    try {
      await resumeAPI.addNote({
        student_id: studentId,
        note: newProfileNote
      })
      setNewProfileNote('')
      const notesRes = await resumeAPI.getNotes(studentId)
      setProfileNotes(notesRes.data)
    } catch (err) {
      alert('Failed to add note.')
    } finally {
      setSavingProfileNote(false)
    }
  }

  const handleDeleteProfileNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return
    try {
      await resumeAPI.deleteNote(noteId)
      setProfileNotes(prev => prev.filter(n => n.id !== noteId))
    } catch (err) {
      alert('Failed to delete note.')
    }
  }

  /* Loading skeleton */
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, border: '3px solid #e2e8f0',
          borderTopColor: '#6366f1', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 12px'
        }} />
        <p style={{ color: '#64748b', fontSize: 14 }}>Loading profile…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (error || !profile) return (
    <div style={{ padding: '3rem', textAlign: 'center' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%', background: '#fee2e2',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
      }}>
        <XCircle size={28} color="#ef4444" />
      </div>
      <p style={{ color: '#991b1b', fontSize: 16, fontWeight: 600 }}>{error || 'Student not found.'}</p>
      <button onClick={() => navigate(backPath)} style={styles.backBtn}>← Go Back</button>
    </div>
  )

  const { student, currentBatch, progress, progressStats, attendance } = profile
  const initials = student.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const attPct   = attendance?.percentage ?? 0
  const totalSub = progressStats?.total ?? 0
  const compPct  = totalSub > 0 ? Math.round((progressStats.approved / totalSub) * 100) : 0

  /* Avatar gradient based on initials */
  const gradients = [
    ['#6366f1','#8b5cf6'], ['#0ea5e9','#6366f1'], ['#10b981','#0ea5e9'],
    ['#f59e0b','#ef4444'], ['#ec4899','#8b5cf6']
  ]
  const grad = gradients[student.name.charCodeAt(0) % gradients.length]

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>

      {/* ── Hero Banner ─────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${grad[0]} 0%, ${grad[1]} 100%)`,
        position: 'relative', overflow: 'hidden', paddingBottom: 0
      }}>
        {/* Abstract blobs */}
        <div style={{
          position: 'absolute', width: 320, height: 320, borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)', top: -80, right: -60, pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', width: 180, height: 180, borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)', bottom: -40, left: 120, pointerEvents: 'none'
        }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 28px 0' }}>
          {/* Back button */}
          <button onClick={() => navigate(backPath)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13,
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 8, color: '#fff', padding: '6px 14px', cursor: 'pointer',
            backdropFilter: 'blur(8px)', marginBottom: 24, fontWeight: 600,
            transition: 'background 0.2s',
          }}>
            <ArrowLeft size={14} /> {isStaff ? 'Back to Students' : 'Back to Dashboard'}
          </button>

          {/* Identity row */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap', paddingBottom: 32 }}>
            {/* Avatar */}
            <div style={{
              width: 88, height: 88, borderRadius: 20, flexShrink: 0,
              background: 'rgba(255,255,255,0.2)',
              border: '3px solid rgba(255,255,255,0.4)',
              backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 30, fontWeight: 800, color: '#fff',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)'
            }}>
              {initials}
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.18)', borderRadius: 20,
                padding: '3px 12px', fontSize: 11, color: 'rgba(255,255,255,0.9)',
                fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                marginBottom: 8
              }}>
                <Activity size={11} /> Student
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
                {student.name}
              </h1>
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                <span style={styles.heroBadge}><Mail size={12} /> {student.email}</span>
                {student.mobile && <span style={styles.heroBadge}><Phone size={12} /> {student.mobile}</span>}
                <span style={styles.heroBadge}>
                  <Calendar size={12} /> Joined {new Date(student.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              {isStaff ? (
                <>
                  <button
                    onClick={() => navigate(`${user?.role === 'faculty' ? '/faculty' : '/coordinator'}/attendance?studentId=${studentId}`)}
                    style={styles.heroAction}
                  >
                    <Calendar size={14} /> Attendance
                  </button>
                  <button
                    onClick={() => navigate(`${user?.role === 'faculty' ? '/faculty' : '/coordinator'}/progress/${studentId}`)}
                    style={{ ...styles.heroAction, background: 'rgba(255,255,255,0.9)', color: grad[0] }}
                  >
                    <BookOpen size={14} /> Progress
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/student/attendance')}
                    style={styles.heroAction}
                  >
                    <Calendar size={14} /> My Attendance
                  </button>
                  <button
                    onClick={() => navigate('/my-progress')}
                    style={{ ...styles.heroAction, background: 'rgba(255,255,255,0.9)', color: grad[0] }}
                  >
                    <BookOpen size={14} /> My Progress
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 28px 60px' }}>

        {/* ── Top stat strip ─────────────────────────────── */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
          <StatPill icon={Target}    label="Approved"     value={progressStats.approved} accent="#10b981" />
          <StatPill icon={Clock}     label="Pending"      value={progressStats.pending}  accent="#f59e0b" />
          <StatPill icon={XCircle}   label="Rejected"     value={progressStats.rejected} accent="#ef4444" />
          <StatPill icon={BarChart2} label="Total Submissions" value={totalSub}           accent="#6366f1" />
          <StatPill icon={Activity}  label="Attendance"   value={`${attPct}%`}            accent={attPct >= 75 ? '#10b981' : '#ef4444'} />
        </div>

        {/* ── 2-col grid ──────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

          {/* Batch card */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ ...styles.iconBox, background: '#eef2ff', color: '#6366f1' }}><Users size={15} /></div>
                <span style={styles.cardTitle}>Batch Assignment</span>
              </div>
              {isStaff && !editingBatch && (
                <button onClick={() => setEditingBatch(true)} style={styles.editBtn}>
                  <Edit2 size={12} /> {currentBatch ? 'Change' : 'Assign'}
                </button>
              )}
            </div>

            {!editingBatch ? (
              currentBatch ? (
                <div style={{ marginTop: 14 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px', borderRadius: 12,
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    border: '1px solid #bbf7d0'
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, background: '#22c55e',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <Layers size={18} color="#fff" />
                    </div>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 2px', color: '#0f172a' }}>{currentBatch.name}</p>
                      {currentBatch.description && (
                        <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 2px' }}>{currentBatch.description}</p>
                      )}
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                        Coordinator: {currentBatch.coordinator_name || 'Unassigned'} · Assigned {new Date(currentBatch.assigned_at).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 14 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px', borderRadius: 12,
                    background: '#fef2f2', border: '1px solid #fecaca'
                  }}>
                    <AlertTriangle size={18} color="#ef4444" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#991b1b' }}>Not assigned to any batch</span>
                  </div>
                </div>
              )
            ) : (
              <div style={{ marginTop: 14 }}>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6, fontWeight: 600 }}>
                  Select batch
                </label>
                <select
                  value={selectedBatchId}
                  onChange={e => setSelectedBatchId(e.target.value)}
                  style={styles.select}
                >
                  <option value="">— Choose a batch —</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.student_count} students){b.coordinator_name ? ` · ${b.coordinator_name}` : ''}
                    </option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    onClick={handleAssignBatch}
                    disabled={!selectedBatchId || savingBatch}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 16px', fontSize: 13, borderRadius: 8, fontWeight: 600,
                      background: selectedBatchId ? '#6366f1' : '#e2e8f0',
                      color: selectedBatchId ? '#fff' : '#94a3b8', border: 'none',
                      cursor: selectedBatchId ? 'pointer' : 'not-allowed', transition: 'opacity 0.2s'
                    }}
                  >
                    <Save size={13} /> {savingBatch ? 'Saving…' : 'Save'}
                  </button>
                  {currentBatch && (
                    <button onClick={handleRemoveBatch} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                      fontSize: 13, borderRadius: 8, background: '#fee2e2', color: '#991b1b',
                      border: 'none', cursor: 'pointer', fontWeight: 600
                    }}>
                      <Trash2 size={13} /> Remove
                    </button>
                  )}
                  <button onClick={() => setEditingBatch(false)} style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px',
                    fontSize: 13, borderRadius: 8, background: 'transparent',
                    color: '#64748b', border: '1px solid #e2e8f0', cursor: 'pointer'
                  }}>
                    <X size={13} /> Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Attendance card */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ ...styles.iconBox, background: '#fef3c7', color: '#d97706' }}><Calendar size={15} /></div>
                <span style={styles.cardTitle}>Attendance · Last 30 days</span>
              </div>
              {attPct < 75 && attPct > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 11, fontWeight: 700, color: '#b45309',
                  background: '#fef9c3', padding: '3px 10px', borderRadius: 20
                }}>
                  <AlertTriangle size={11} /> At Risk
                </span>
              )}
            </div>

            {!currentBatch ? (
              <div style={{ marginTop: 14, padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                No batch assigned — attendance not tracked.
              </div>
            ) : (
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 24 }}>
                {/* Donut */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <DonutRing pct={attPct} color={attPct >= 75 ? '#10b981' : '#ef4444'} size={90} stroke={9} />
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{attPct}%</span>
                    <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>RATE</span>
                  </div>
                </div>
                {/* Legend */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  {[
                    { label: 'Present', value: attendance.present, color: '#10b981', bg: '#f0fdf4' },
                    { label: 'Absent',  value: attendance.absent,  color: '#ef4444', bg: '#fef2f2' },
                    { label: 'Late',    value: attendance.late,    color: '#f59e0b', bg: '#fffbeb' },
                  ].map(r => (
                    <div key={r.label} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '6px 12px', borderRadius: 8, background: r.bg
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: r.color }}>{r.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: r.color }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 2-col Placement & Resumes Grid ───────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, marginBottom: 20 }}>
          
          {/* Placement Info Card */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ ...styles.iconBox, background: '#e0f2fe', color: '#0369a1' }}><Briefcase size={15} /></div>
                <span style={styles.cardTitle}>Placement & Academic Profile</span>
              </div>
              {!editingPlacement && (
                <button onClick={() => setEditingPlacement(true)} style={styles.editBtn}>
                  Edit Details
                </button>
              )}
            </div>

            {!editingPlacement ? (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Domain</label>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{student.domain || 'Not Set'}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Passout Year</label>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{student.passout_year || 'Not Set'}</p>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>College / University</label>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{student.college || 'Not Set'}</p>
                </div>

                <div>
                  <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Current Location</label>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{student.current_location || 'Not Set'}</p>
                </div>

                <div>
                  <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Skills</label>
                  {student.skills ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {student.skills.split(',').map((s, i) => (
                        <span key={i} style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                          {s.trim()}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>No skills listed</p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 14, marginTop: 4 }}>
                  {student.github && (
                    <a href={student.github.startsWith('http') ? student.github : `https://${student.github}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>
                      🐙 GitHub
                    </a>
                  )}
                  {student.linkedin && (
                    <a href={student.linkedin.startsWith('http') ? student.linkedin : `https://${student.linkedin}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>
                      🔗 LinkedIn
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdatePlacement} style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600 }}>Domain</label>
                    <select
                      value={placementForm.domain}
                      onChange={e => setPlacementForm({ ...placementForm, domain: e.target.value })}
                      style={styles.select}
                    >
                      <option value="">Select Domain</option>
                      <option value="Frontend">Frontend</option>
                      <option value="MERN">MERN</option>
                      <option value="Java">Java</option>
                      <option value="Python">Python</option>
                      <option value="Testing">Testing</option>
                      <option value="UI/UX">UI/UX</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600 }}>Passout Year</label>
                    <input
                      type="number"
                      placeholder="e.g. 2025"
                      value={placementForm.passout_year}
                      onChange={e => setPlacementForm({ ...placementForm, passout_year: e.target.value })}
                      style={styles.formInput}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600 }}>College</label>
                  <input
                    type="text"
                    placeholder="College/University Name"
                    value={placementForm.college}
                    onChange={e => setPlacementForm({ ...placementForm, college: e.target.value })}
                    style={styles.formInput}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600 }}>Current Location</label>
                  <input
                    type="text"
                    placeholder="City, State"
                    value={placementForm.current_location}
                    onChange={e => setPlacementForm({ ...placementForm, current_location: e.target.value })}
                    style={styles.formInput}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600 }}>Skills (comma separated)</label>
                  <input
                    type="text"
                    placeholder="React, Node, SQL"
                    value={placementForm.skills}
                    onChange={e => setPlacementForm({ ...placementForm, skills: e.target.value })}
                    style={styles.formInput}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600 }}>GitHub Profile URL</label>
                    <input
                      type="text"
                      placeholder="github.com/username"
                      value={placementForm.github}
                      onChange={e => setPlacementForm({ ...placementForm, github: e.target.value })}
                      style={styles.formInput}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600 }}>LinkedIn Profile URL</label>
                    <input
                      type="text"
                      placeholder="linkedin.com/in/username"
                      value={placementForm.linkedin}
                      onChange={e => setPlacementForm({ ...placementForm, linkedin: e.target.value })}
                      style={styles.formInput}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button type="submit" disabled={savingPlacement} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 16px', fontSize: 13, borderRadius: 8, fontWeight: 600, background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer' }}>
                    <Save size={13} /> {savingPlacement ? 'Saving…' : 'Save Details'}
                  </button>
                  <button type="button" onClick={() => setEditingPlacement(false)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', fontSize: 13, borderRadius: 8, background: 'transparent', color: '#64748b', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                    <X size={13} /> Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Resume Upload & Version History Card */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ ...styles.iconBox, background: '#e6fffa', color: '#0f766e' }}><FileText size={15} /></div>
                <span style={styles.cardTitle}>Student Resume Hub</span>
              </div>
            </div>

            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Only the student themselves or admin can upload a new resume */}
              {(!isStaff || user?.role === 'admin') && (
                <ResumeUpload
                  studentId={studentId}
                  onUploadSuccess={() => setRefreshHistory(prev => prev + 1)}
                />
              )}

              {/* Version list */}
              <ResumeHistory
                studentId={studentId}
                refreshTrigger={refreshHistory}
              />
            </div>
          </div>
        </div>

        {/* ── Private Mentor Notes (Visible only to staff) ──── */}
        {isStaff && (
          <div style={{ ...styles.card, marginBottom: 20 }}>
            <div style={styles.cardHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ ...styles.iconBox, background: '#fffbeb', color: '#b45309' }}>📝</div>
                <span style={styles.cardTitle}>Private Mentor Notes (Placement Internal Only)</span>
              </div>
            </div>

            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <form onSubmit={handleAddProfileNote} style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  placeholder="Add private note for student placement tracking..."
                  value={newProfileNote}
                  onChange={e => setNewProfileNote(e.target.value)}
                  style={{ ...styles.formInput, flex: 1, margin: 0 }}
                  required
                />
                <button type="submit" disabled={savingProfileNote || !newProfileNote.trim()} style={{ background: '#b45309', color: '#fff', border: 'none', borderRadius: 8, padding: '0 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {savingProfileNote ? 'Saving...' : 'Add Note'}
                </button>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '200px', overflowY: 'auto' }}>
                {profileNotes.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>No private notes written yet.</p>
                ) : (
                  profileNotes.map(note => (
                    <div key={note.id} style={{ background: '#fefbec', border: '1px solid #fef08a', borderRadius: 10, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <p style={{ fontSize: 13, color: '#1e293b', margin: 0 }}>{note.note}</p>
                        <span style={{ fontSize: 10, color: '#a1a1aa' }}>
                          By {note.author_name} ({note.author_role}) · {new Date(note.created_at).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                      <button type="button" onClick={() => handleDeleteProfileNote(note.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11, fontWeight: '700' }}>
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Submission history card ─────────────────────── */}
        <div style={styles.card}>
          {/* Card header with tabs */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingBottom: 16, borderBottom: '1px solid #f1f5f9', marginBottom: 4, flexWrap: 'wrap', gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ ...styles.iconBox, background: '#ede9fe', color: '#7c3aed' }}><TrendingUp size={15} /></div>
              <span style={styles.cardTitle}>Submission History</span>
              <span style={{
                fontSize: 11, fontWeight: 700, color: '#6366f1',
                background: '#eef2ff', padding: '2px 10px', borderRadius: 20
              }}>
                {progress.length} total
              </span>
            </div>
            {/* Progress bar overall */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Completion</span>
              <div style={{ width: 120, height: 6, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${compPct}%`, borderRadius: 99,
                  background: 'linear-gradient(90deg, #6366f1, #10b981)',
                  transition: 'width 0.8s ease'
                }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{compPct}%</span>
            </div>
          </div>

          {progress.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: '#f8fafc', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 12px'
              }}>
                <BookOpen size={28} color="#cbd5e1" />
              </div>
              <p style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500 }}>No project submissions yet.</p>
            </div>
          ) : (
            <div style={{ marginTop: 8 }}>
              {/* Header row */}
              <div style={{
                display: 'grid', gridTemplateColumns: '110px 1fr 130px 100px',
                gap: 12, padding: '8px 12px',
                fontSize: 11, fontWeight: 700, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '0.05em'
              }}>
                <span>Date</span>
                <span>Project / Step</span>
                <span>Status</span>
                <span>Feedback</span>
              </div>

              {/* Rows */}
              {progress.map((p, i) => (
                <div
                  key={p.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '110px 1fr 130px 100px',
                    gap: 12, padding: '12px 12px',
                    borderRadius: 10, alignItems: 'center',
                    background: i % 2 === 0 ? '#fafafa' : '#fff',
                    transition: 'background 0.15s',
                    borderBottom: i < progress.length - 1 ? '1px solid #f1f5f9' : 'none',
                    cursor: 'default'
                  }}
                >
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#334155', margin: 0 }}>
                      {new Date(p.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                    <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>
                      {new Date(p.submitted_at).toLocaleDateString('en-IN', { year: 'numeric' })}
                    </p>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <p style={{
                      fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 2px',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                      {p.project_title}
                    </p>
                    <p style={{
                      fontSize: 11, color: '#64748b', margin: 0,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                      Step {p.step_order}: {p.step_title}
                    </p>
                  </div>

                  <div>
                    <Chip status={p.status} />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    {p.feedback ? (
                      <span
                        title={p.feedback}
                        style={{
                          fontSize: 11, color: '#64748b', fontStyle: 'italic',
                          display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}
                      >
                        "{p.feedback}"
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#cbd5e1' }}>—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Inter', sans-serif; }
      `}</style>
    </div>
  )
}

/* ── Style objects ──────────────────────────────────────── */
const styles = {
  backBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13,
    border: 'none', cursor: 'pointer',
    color: '#6366f1', marginTop: 16, padding: '8px 16px',
    borderRadius: 8, fontWeight: 600,
    background: '#eef2ff'
  },
  heroBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 500
  },
  heroAction: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
    background: 'rgba(255,255,255,0.18)', color: '#fff',
    border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer',
    backdropFilter: 'blur(8px)', transition: 'background 0.2s'
  },
  card: {
    background: '#fff', border: '1px solid #e2e8f0',
    borderRadius: 16, padding: '20px 22px',
    boxShadow: '0 1px 6px rgba(0,0,0,0.04)'
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 14, borderBottom: '1px solid #f1f5f9'
  },
  cardTitle: {
    fontSize: 14, fontWeight: 700, color: '#1e293b'
  },
  iconBox: {
    width: 30, height: 30, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
  },
  editBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12,
    padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
    background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b',
    transition: 'all 0.15s'
  },
  select: {
    width: '100%', padding: '9px 12px', fontSize: 13, borderRadius: 10,
    border: '1px solid #e2e8f0', background: '#fff', color: '#0f172a',
    outline: 'none', cursor: 'pointer'
  },
  formInput: {
    width: '100%',
    padding: '9px 12px',
    fontSize: '13px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: '#0f172a',
    outline: 'none',
    marginBottom: '4px'
  }
}
