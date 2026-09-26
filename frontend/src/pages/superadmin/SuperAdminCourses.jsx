import React, { useState, useEffect } from 'react';
import { courseAPI, superAdminAPI } from '../../services/api';
import { 
  Layers, 
  Plus, 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users, 
  BookOpen, 
  Target,
  Edit2,
  X,
  Shield,
  UserCheck,
  UserPlus,
  Trash2,
  Key,
  Mail,
  Phone,
  Lock
} from 'lucide-react';

const SuperAdminCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Course Admin Modal State
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [selectedCourseForAdmin, setSelectedCourseForAdmin] = useState(null);
  const [courseAdmins, setCourseAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [adminError, setAdminError] = useState(null);
  const [adminSuccess, setAdminSuccess] = useState(null);
  const [adminFormData, setAdminFormData] = useState({
    name: '',
    email: '',
    password: '',
    mobile: ''
  });

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    slug: '',
    shortName: '',
    duration: '6 Months',
    description: '',
    status: 'active'
  });

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await superAdminAPI.getOverview();
      if (res.data.success) {
        setCourses(res.data.courses);
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const openCreateModal = () => {
    setEditingCourse(null);
    setFormData({
      name: '',
      code: '',
      slug: '',
      shortName: '',
      duration: '6 Months',
      description: '',
      status: 'active'
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name,
      code: course.code,
      slug: course.slug,
      shortName: course.short_name || '',
      duration: course.duration || '6 Months',
      description: course.description || '',
      status: course.status
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSlugAutofill = (name) => {
    if (!editingCourse) {
      const generatedSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 15);
      const generatedCode = name
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 6) + '-FS';
      setFormData(prev => ({
        ...prev,
        name,
        slug: prev.slug ? prev.slug : generatedSlug,
        code: prev.code ? prev.code : generatedCode
      }));
    } else {
      setFormData(prev => ({ ...prev, name }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      if (editingCourse) {
        await courseAPI.update(editingCourse.id, formData);
      } else {
        await courseAPI.create(formData);
      }
      setIsModalOpen(false);
      await fetchCourses();
    } catch (err) {
      console.error('Error saving course:', err);
      setFormError(err.response?.data?.message || 'Failed to save course. Please check inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (course) => {
    try {
      const nextStatus = course.status === 'active' ? 'inactive' : 'active';
      await courseAPI.update(course.id, { status: nextStatus });
      await fetchCourses();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  // Course Admin Handlers
  const openAdminModal = async (course) => {
    setSelectedCourseForAdmin(course);
    setAdminError(null);
    setAdminSuccess(null);
    setAdminFormData({ name: '', email: '', password: '', mobile: '' });
    setIsAdminModalOpen(true);
    fetchAdminsForCourse(course.id);
  };

  const fetchAdminsForCourse = async (courseId) => {
    try {
      setLoadingAdmins(true);
      const res = await superAdminAPI.getCourseAdmins(courseId);
      if (res.data.success) {
        setCourseAdmins(res.data.admins);
      }
    } catch (err) {
      console.error('Failed to fetch course admins:', err);
    } finally {
      setLoadingAdmins(false);
    }
  };

  const handleAssignAdmin = async (e) => {
    e.preventDefault();
    if (!selectedCourseForAdmin) return;
    setAdminError(null);
    setAdminSuccess(null);
    setAdminSubmitting(true);

    try {
      const res = await superAdminAPI.assignCourseAdmin({
        ...adminFormData,
        courseId: selectedCourseForAdmin.id
      });

      if (res.data.success) {
        setAdminSuccess(res.data.message || 'Course Admin assigned successfully!');
        setAdminFormData({ name: '', email: '', password: '', mobile: '' });
        await fetchAdminsForCourse(selectedCourseForAdmin.id);
      }
    } catch (err) {
      console.error('Error assigning course admin:', err);
      setAdminError(err.response?.data?.message || 'Failed to assign course admin');
    } finally {
      setAdminSubmitting(false);
    }
  };

  const handleRemoveAdmin = async (userId, adminName) => {
    if (!window.confirm(`Are you sure you want to remove admin '${adminName}' from ${selectedCourseForAdmin.name}?`)) {
      return;
    }

    try {
      await superAdminAPI.removeCourseAdmin(selectedCourseForAdmin.id, userId);
      setAdminSuccess(`Admin '${adminName}' removed from ${selectedCourseForAdmin.name}.`);
      await fetchAdminsForCourse(selectedCourseForAdmin.id);
    } catch (err) {
      console.error('Failed to remove course admin:', err);
      setAdminError(err.response?.data?.message || 'Failed to remove admin from course');
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Courses Management</h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            Configure and launch multi-course curricula. Each course has independent URL resolution, dedicated course admins, batches, and projects.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
            color: '#fff',
            border: 'none',
            padding: '10px 18px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
            transition: 'all 0.2s'
          }}
        >
          <Plus size={16} />
          <span>New Course</span>
        </button>
      </div>

      {/* Course Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          Loading courses...
        </div>
      ) : courses.length === 0 ? (
        <div
          style={{
            background: '#fff',
            border: '2px dashed #cbd5e1',
            borderRadius: '16px',
            padding: '48px',
            textAlign: 'center'
          }}
        >
          <Layers size={40} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>No Courses Configured</h3>
          <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '400px', margin: '0 auto 18px' }}>
            Start by adding your first course to launch the multi-course LMS architecture.
          </p>
          <button
            onClick={openCreateModal}
            style={{
              background: '#4f46e5',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Create Course
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '24px'
          }}
        >
          {courses.map((course) => {
            const isActive = course.status === 'active';
            return (
              <div
                key={course.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative'
                }}
              >
                <div>
                  {/* Top Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          background: '#e0e7ff',
                          color: '#4f46e5',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '4px 8px',
                          borderRadius: '6px'
                        }}
                      >
                        {course.code}
                      </span>
                      <span
                        style={{
                          background: '#f1f5f9',
                          color: '#475569',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '4px 8px',
                          borderRadius: '6px'
                        }}
                      >
                        /{course.slug}
                      </span>
                    </div>

                    <button
                      onClick={() => toggleStatus(course)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: isActive ? '#dcfce7' : '#fee2e2',
                        color: isActive ? '#15803d' : '#991b1b'
                      }}
                      title="Click to toggle status"
                    >
                      {isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      <span>{isActive ? 'Active' : 'Inactive'}</span>
                    </button>
                  </div>

                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
                    {course.name}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px', lineHeight: 1.5 }}>
                    {course.description || 'No description provided.'}
                  </p>
                </div>

                {/* Metrics */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center', marginBottom: '16px' }}>
                    <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{course.stats?.totalStudents || 0}</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>Students</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{course.stats?.totalBatches || 0}</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>Batches</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{course.stats?.totalProjects || 0}</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>Projects</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{course.stats?.totalTasks || 0}</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>Tasks</div>
                    </div>
                  </div>

                  {/* Actions Grid */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      onClick={() => openAdminModal(course)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        border: '1px solid #c7d2fe',
                        borderRadius: '8px',
                        background: '#eef2ff',
                        color: '#4338ca',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Shield size={14} />
                      <span>Manage Course Admin Credentials</span>
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => openEditModal(course)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '8px 12px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          background: '#ffffff',
                          color: '#334155',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <Edit2 size={13} />
                        <span>Edit Course</span>
                      </button>
                      <a
                        href={`/${course.slug}/admin`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: '#0f172a',
                          color: '#ffffff',
                          textDecoration: 'none',
                          fontSize: '12px',
                          fontWeight: 600
                        }}
                      >
                        <span>Open Course</span>
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create / Edit Course */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '560px',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#e0e7ff',
                    color: '#4f46e5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Layers size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                    {editingCourse ? 'Edit Course' : 'Create New Course'}
                  </h2>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Configure course domain and slug
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '6px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  background: '#fee2e2',
                  border: '1px solid #fca5a5',
                  color: '#991b1b',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  marginBottom: '16px'
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Course Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GenAI & Agentic AI Full Stack"
                  value={formData.name}
                  onChange={(e) => handleSlugAutofill(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Course Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GENAI-FS"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    URL Slug *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. agentk"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Short Title / Badge
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AgentK"
                    value={formData.shortName}
                    onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Duration
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 6 Months"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Description
                </label>
                <textarea
                  rows="3"
                  placeholder="Comprehensive description of the curriculum, outcomes, and prerequisites..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Lifecycle Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    background: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="active">Active (Accessible to Enrolled Students)</option>
                  <option value="inactive">Inactive (Super Admin Only)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#4f46e5',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? 'Saving...' : editingCourse ? 'Save Changes' : 'Initialize Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Modal: Course Admin Assignment & Credentials Management */}
      {/* ======================================================== */}
      {isAdminModalOpen && selectedCourseForAdmin && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '620px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: '#e0e7ff',
                    color: '#4338ca',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Shield size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                    Course Admin Credentials
                  </h2>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Manage administrators for <strong>{selectedCourseForAdmin.name}</strong> (/{selectedCourseForAdmin.slug})
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsAdminModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '6px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Explanatory Banner */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px 14px',
                fontSize: '12px',
                color: '#334155',
                lineHeight: 1.5,
                marginBottom: '18px'
              }}
            >
              When an assigned Course Admin logs in with their email and password, they are automatically directed to{' '}
              <strong style={{ color: '#4f46e5' }}>/{selectedCourseForAdmin.slug}/admin</strong> and can strictly access and manage only{' '}
              <strong>{selectedCourseForAdmin.name}</strong>'s students, batches, projects, and activities.
            </div>

            {/* Status alerts */}
            {adminError && (
              <div
                style={{
                  background: '#fee2e2',
                  border: '1px solid #fca5a5',
                  color: '#991b1b',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  marginBottom: '14px'
                }}
              >
                {adminError}
              </div>
            )}
            {adminSuccess && (
              <div
                style={{
                  background: '#dcfce7',
                  border: '1px solid #86efac',
                  color: '#15803d',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  marginBottom: '14px'
                }}
              >
                {adminSuccess}
              </div>
            )}

            {/* Currently Assigned Admins */}
            <div style={{ marginBottom: '22px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                Currently Assigned Course Admins:
              </div>
              {loadingAdmins ? (
                <div style={{ fontSize: '12px', color: '#64748b', padding: '10px 0' }}>Loading assigned admins...</div>
              ) : courseAdmins.length === 0 ? (
                <div
                  style={{
                    background: '#fffbeb',
                    border: '1px solid #fef3c7',
                    color: '#b45309',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                >
                  No dedicated course admin assigned yet. Currently only Super Admin can access this course.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {courseAdmins.map((adm) => (
                    <div
                      key={adm.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>{adm.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{adm.email} {adm.mobile ? `• ${adm.mobile}` : ''}</div>
                      </div>
                      <button
                        onClick={() => handleRemoveAdmin(adm.id, adm.name)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 600
                        }}
                        title="Remove admin from course"
                      >
                        <Trash2 size={13} />
                        <span>Remove</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form: Create & Assign Admin */}
            <div
              style={{
                borderTop: '1px solid #e2e8f0',
                paddingTop: '18px'
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserPlus size={16} style={{ color: '#4f46e5' }} />
                <span>Assign New Course Admin</span>
              </div>

              <form onSubmit={handleAssignAdmin}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Admin Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={adminFormData.name}
                      onChange={(e) => setAdminFormData({ ...adminFormData, name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. agentk_admin@lms.com"
                      value={adminFormData.email}
                      onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Login Password *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={adminFormData.password}
                      onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Mobile Number (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. +91 9876543210"
                      value={adminFormData.mobile}
                      onChange={(e) => setAdminFormData({ ...adminFormData, mobile: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsAdminModalOpen(false)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#475569',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={adminSubmitting}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#4f46e5',
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: adminSubmitting ? 'not-allowed' : 'pointer',
                      opacity: adminSubmitting ? 0.7 : 1
                    }}
                  >
                    {adminSubmitting ? 'Assigning...' : 'Assign Admin Credentials'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminCourses;
