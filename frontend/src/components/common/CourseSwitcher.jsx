import React, { useState, useEffect } from 'react';
import { useCourse } from '../../context/CourseContext';
import { useAuth } from '../../context/AuthContext';
import { courseAPI } from '../../services/api';
import { Layers, ChevronDown, Check, Shield } from 'lucide-react';

const CourseSwitcher = () => {
  const { currentCourse, courseSlug, switchCourse } = useCourse();
  const { user } = useAuth();
  const [availableCourses, setAvailableCourses] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    if (user.role === 'super_admin') {
      // Super Admin can see and switch to all active courses
      courseAPI.getAll()
        .then((res) => {
          if (res.data.success) {
            setAvailableCourses(res.data.courses);
          }
        })
        .catch(console.error);
    } else {
      // Regular users see courses they are enrolled in
      courseAPI.getMyCourses()
        .then((res) => {
          if (res.data.success) {
            setAvailableCourses(res.data.courses.map(m => ({
              id: m.course_id,
              name: m.course_name,
              code: m.course_code,
              slug: m.course_slug,
              role: m.role
            })));
          }
        })
        .catch(console.error);
    }
  }, [user]);

  if (!currentCourse) return null;

  return (
    <div className="relative inline-block text-left" style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.9)',
          border: '1px solid #e2e8f0',
          padding: '6px 14px',
          borderRadius: '9999px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 600,
          color: '#1e293b',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          transition: 'all 0.2s ease'
        }}
        title="Active Course Context"
      >
        <div
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}
        >
          <Layers size={13} />
        </div>
        <span>{currentCourse.short_name || currentCourse.name}</span>
        <span
          style={{
            background: '#e0e7ff',
            color: '#4338ca',
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '4px',
            fontWeight: 700
          }}
        >
          {currentCourse.code}
        </span>
        {availableCourses.length > 1 && <ChevronDown size={14} style={{ color: '#64748b' }} />}
      </button>

      {isOpen && availableCourses.length > 1 && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 998
            }}
            onClick={() => setIsOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              zIndex: 999,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '8px',
              minWidth: '240px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ padding: '6px 10px', fontSize: '11px', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}>
              SWITCH COURSE
            </div>
            {availableCourses.map((c) => {
              const isSelected = c.slug === courseSlug;
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setIsOpen(false);
                    switchCourse(c.slug);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: isSelected ? '#f8fafc' : 'transparent',
                    color: isSelected ? '#4f46e5' : '#1e293b',
                    fontSize: '13px',
                    fontWeight: isSelected ? 600 : 500,
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = isSelected ? '#f8fafc' : 'transparent')}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{c.name}</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{c.code}</span>
                  </div>
                  {isSelected && <Check size={16} style={{ color: '#4f46e5' }} />}
                </div>
              );
            })}

            {user?.role === 'super_admin' && (
              <div
                style={{
                  marginTop: '6px',
                  paddingTop: '6px',
                  borderTop: '1px solid #f1f5f9'
                }}
              >
                <a
                  href="/super-admin/courses"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    color: '#4f46e5',
                    textDecoration: 'none',
                    fontWeight: 600
                  }}
                >
                  <Shield size={13} />
                  <span>Manage Platform Courses</span>
                </a>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CourseSwitcher;
