import React, { useState } from 'react';
import { useCourse } from '../../context/CourseContext';
import { useAuth } from '../../context/AuthContext';
import DashboardView from './DashboardView';
import PapersView from './PapersView';
import AssignmentsView from './AssignmentsView';
import EmailCenterView from './EmailCenterView';
import AiConfigView from './AiConfigView';
import EvaluationView from './EvaluationView';
import ReportsView from './ReportsView';
import QuestionBankView from './QuestionBankView';
import AuditLogsView from './AuditLogsView';
import '../../styles/examSystem.css';
import { 
  BarChart3, FileText, Calendar, Mail, CheckSquare, 
  PieChart, Database, ShieldAlert, Sparkles, BookOpen, Bot
} from 'lucide-react';

export default function ExamHub() {
  const { currentCourse, courseSlug } = useCourse();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [preselectedPaperForAssign, setPreselectedPaperForAssign] = useState(null);

  const activeCourseId = currentCourse?.id || null;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'papers', label: 'Question Papers', icon: FileText },
    { id: 'assignments', label: 'Assignments', icon: Calendar },
    { id: 'email-center', label: 'Email Center', icon: Mail },
    { id: 'ai-config', label: 'AI Configuration', icon: Bot },
    { id: 'evaluation', label: 'Evaluation', icon: CheckSquare },
    { id: 'reports', label: 'Analytics & Reports', icon: PieChart },
    { id: 'question-bank', label: 'Question Bank', icon: Database },
    { id: 'audit-logs', label: 'Audit Logs', icon: ShieldAlert },
  ];

  const handleAssignPaper = (paper) => {
    setPreselectedPaperForAssign(paper);
    setActiveTab('assignments');
  };

  return (
    <div className="exam-hub-container" style={{ maxWidth: '1600px', margin: '0 auto', padding: '24px 20px 80px', minHeight: '100%', background: '#f8fafc' }}>
      {/* Header Banner — Matching Resume Hub LMS Theme */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <span style={{ 
              background: '#4f46e5', 
              color: '#ffffff', 
              fontSize: '11px', 
              fontWeight: 800, 
              padding: '2px 8px', 
              borderRadius: '6px',
              letterSpacing: '0.04em'
            }}>
              EXAM MODULE
            </span>

            {currentCourse && (
              <span className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <BookOpen size={12} />
                Course: {currentCourse.name}
              </span>
            )}

            <span className="badge badge-success">
              <Sparkles size={11} /> System Online
            </span>
          </div>

          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>
            Written Examination Management
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            Question paper authoring, batch scheduling, OTP proctoring, student grading &amp; multi-SMTP delivery
          </p>
        </div>
      </div>

      {/* Navigation Tabs Bar — Clean LMS Pill Bar */}
      <div style={{ 
        display: 'flex', 
        gap: '4px', 
        background: '#f1f5f9', 
        padding: '4px', 
        borderRadius: '10px', 
        marginBottom: '24px',
        overflowX: 'auto'
      }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#4f46e5' : '#64748b',
                background: isActive ? '#ffffff' : 'transparent',
                boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                border: isActive ? '1px solid #e2e8f0' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={16} color={isActive ? '#4f46e5' : '#64748b'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active Tab Content Area */}
      <div className="exam-content-area">
        {activeTab === 'dashboard' && (
          <DashboardView 
            onNavigate={setActiveTab} 
            courseId={activeCourseId} 
            courseSlug={courseSlug} 
          />
        )}
        {activeTab === 'papers' && (
          <PapersView 
            onAssignPaper={handleAssignPaper} 
            courseId={activeCourseId} 
          />
        )}
        {activeTab === 'assignments' && (
          <AssignmentsView 
            preselectedPaper={preselectedPaperForAssign} 
            onClearPreselectedPaper={() => setPreselectedPaperForAssign(null)} 
            courseId={activeCourseId} 
            courseSlug={courseSlug} 
          />
        )}
        {activeTab === 'email-center' && <EmailCenterView />}
        {activeTab === 'ai-config' && <AiConfigView />}
        {activeTab === 'evaluation' && <EvaluationView courseId={activeCourseId} courseSlug={courseSlug} />}
        {activeTab === 'reports' && <ReportsView courseId={activeCourseId} courseSlug={courseSlug} />}
        {activeTab === 'question-bank' && <QuestionBankView />}
        {activeTab === 'audit-logs' && <AuditLogsView />}
      </div>
    </div>
  );
}
