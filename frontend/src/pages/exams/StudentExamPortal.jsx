import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { examApi as api } from '../../services/examApi';
import { indexedDbService } from '../../services/indexedDbService';
import '../../styles/examSystem.css';
import { 
  Shield, AlertTriangle, Clock, CheckCircle2, CloudCheck, WifiOff, 
  ChevronLeft, ChevronRight, Send, AlertOctagon, Maximize2, Lock, FileText, Check
} from 'lucide-react';

export default function StudentExamPortal({ assignmentCode: propAssignmentCode }) {
  const { assignmentCode: routeAssignmentCode } = useParams() || {};
  const assignmentCode = propAssignmentCode || routeAssignmentCode;
  // Screen stages: 'OTP_VERIFICATION' | 'BRIEFING' | 'IN_EXAM' | 'SUBMITTED' | 'AUTO_SUBMITTED'
  const [stage, setStage] = useState('OTP_VERIFICATION');

  // Candidate & Exam Session Data
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [examData, setExamData] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const [candidateInfo, setCandidateInfo] = useState(null);
  
  // Exam progress state
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionId]: { text, option, version, clientUpdatedAt } }
  const [markedForReview, setMarkedForReview] = useState({}); // { [questionId]: boolean }

  // Sync & network status
  const [saveStatus, setSaveStatus] = useState('SYNCED'); // 'SAVING_LOCAL' | 'SAVED_LOCAL' | 'SYNCING' | 'SYNCED' | 'OFFLINE'
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Timer & Security
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [violations, setViolations] = useState(0);
  const [violationModal, setViolationModal] = useState(null); // { sequence, type, warningsLeft }
  const [confirmSubmitModal, setConfirmSubmitModal] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  // Sync debouncer ref
  const syncTimeoutRef = useRef(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  // 1. Online / Offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerBackgroundSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSaveStatus('OFFLINE');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [sessionToken]);

  // 2. Timer countdown (Server-Authoritative sync)
  useEffect(() => {
    if (stage !== 'IN_EXAM' || remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinalSubmit('TIMEOUT');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [stage, remainingSeconds]);

  // 3. OTP Verification
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await api.studentExam.verifyOtp(assignmentCode, otp);
      if (res.success && res.data) {
        const { sessionToken, assignment, sections, candidate, savedAnswers, violationCount, timing } = res.data;
        
        const normalizedCandidate = {
          ...candidate,
          name: candidate.name || candidate.snapshot_student_name,
          batch: candidate.batch || candidate.snapshot_batch_name
        };

        const normalizedAssignment = {
          ...assignment,
          durationMinutes: assignment.durationMinutes || assignment.duration_minutes || 60,
          totalMarks: assignment.totalMarks || assignment.total_marks || 100,
          passMarks: assignment.passMarks || assignment.pass_marks || 40
        };

        const paperData = {
          title: assignment.title,
          instructions: assignment.instructions,
          sections: sections || []
        };

        setSessionToken(sessionToken);
        setExamData({ assignment: normalizedAssignment, paper: paperData });
        setCandidateInfo(normalizedCandidate);
        setViolations(violationCount || 0);

        // Timer remaining from server timing object or expectedEndAt
        const remaining = timing?.remainingSeconds ?? 3600;
        setRemainingSeconds(remaining);

        // Load existing answers: merge server answers with IndexedDB local cache
        const localCached = await indexedDbService.getAllLocalAnswers(sessionToken);
        const merged = {};

        // Populate from server savedAnswers array
        if (Array.isArray(savedAnswers)) {
          savedAnswers.forEach(ans => {
            merged[ans.question_id] = {
              text: ans.answer_text,
              option: ans.selected_option,
              version: ans.version || 1,
              clientUpdatedAt: ans.client_updated_at
            };
          });
        }

        Object.keys(localCached).forEach(qId => {
          const localItem = localCached[qId];
          const serverItem = merged[qId];
          if (!serverItem || (localItem.version || 1) >= (serverItem.version || 1)) {
            merged[qId] = {
              text: localItem.answerText,
              option: localItem.selectedOption,
              version: localItem.version || 1,
              clientUpdatedAt: localItem.clientUpdatedAt
            };
          }
        });

        setAnswers(merged);

        // Save session locally
        await indexedDbService.saveSession({
          sessionToken,
          assignmentCode,
          studentName: normalizedCandidate.name,
          expectedEndAt: timing?.expectedEndAt
        });

        if (res.data.status === 'SUBMITTED' || res.data.status === 'AUTO_SUBMITTED') {
          setStage(res.data.status === 'AUTO_SUBMITTED' ? 'AUTO_SUBMITTED' : 'SUBMITTED');
        } else {
          setStage('BRIEFING');
        }
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Please check your passcode.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Request Fullscreen and Begin Exam
  const handleStartExam = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen request bypassed or denied:', err);
    }
    setStage('IN_EXAM');
  };

  // 5. Answer Update (Multi-Layer: React State -> IndexedDB -> Debounced Server Sync)
  const handleAnswerChange = (questionId, newText, newOption) => {
    const current = answers[questionId] || { version: 0 };
    const updated = {
      text: newText !== undefined ? newText : current.text,
      option: newOption !== undefined ? newOption : current.option,
      version: (current.version || 0) + 1,
      clientUpdatedAt: new Date().toISOString()
    };

    // Layer 1: React State
    setAnswers(prev => ({ ...prev, [questionId]: updated }));
    setSaveStatus('SAVING_LOCAL');

    // Layer 2: IndexedDB instantaneous local persistence
    indexedDbService.saveAnswerLocally(
      sessionToken,
      questionId,
      updated.text,
      updated.option,
      updated.version
    ).then(() => {
      setSaveStatus(isOnline ? 'SAVED_LOCAL' : 'OFFLINE');
    });

    // Layer 3: Autosave debouncer (send batch to server after 2.5s of typing pause)
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      triggerBackgroundSync();
    }, 2500);
  };

  // Background sync helper
  const triggerBackgroundSync = useCallback(async () => {
    if (!sessionToken || !navigator.onLine) return;
    try {
      const unsynced = await indexedDbService.getUnsyncedAnswers(sessionToken);
      if (unsynced.length === 0) {
        setSaveStatus('SYNCED');
        return;
      }

      setSaveStatus('SYNCING');
      const payload = unsynced.map(u => ({
        questionId: u.questionId,
        answerText: u.answerText,
        selectedOption: u.selectedOption,
        version: u.version,
        clientUpdatedAt: u.clientUpdatedAt
      }));

      const res = await api.studentExam.syncAnswers(sessionToken, payload);
      if (res.success) {
        await indexedDbService.markAnswersAsSynced(sessionToken, unsynced.map(u => u.questionId));
        setSaveStatus('SYNCED');
      }
    } catch (err) {
      console.warn('Sync failed, will retry:', err.message);
      setSaveStatus('SAVED_LOCAL');
    }
  }, [sessionToken]);

  // Periodic interval sync every 15s
  useEffect(() => {
    if (stage !== 'IN_EXAM') return;
    const interval = setInterval(() => {
      triggerBackgroundSync();
    }, 15000);
    return () => clearInterval(interval);
  }, [stage, triggerBackgroundSync]);

  // 6. Security Violations Detector
  useEffect(() => {
    if (stage !== 'IN_EXAM') return;

    const recordViolation = async (type, details) => {
      try {
        const res = await api.studentExam.reportViolation(sessionToken, type, details);
        if (res.success) {
          setViolations(res.violationCount);
          if (res.autoSubmitted) {
            setStage('AUTO_SUBMITTED');
            setViolationModal({
              sequence: res.violationCount,
              type,
              autoSubmitted: true,
              message: res.message
            });
            await indexedDbService.clearSessionData(sessionToken);
          } else {
            setViolationModal({
              sequence: res.violationCount,
              type,
              warningsLeft: res.warningsLeft,
              message: res.message
            });
          }
        }
      } catch (e) {
        console.error('Failed to log violation:', e);
      }
    };

    // Fullscreen exit detection
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && stage === 'IN_EXAM') {
        recordViolation('FULLSCREEN_EXIT', 'Candidate exited browser fullscreen mode');
      }
    };

    // Tab switch & visibility detection
    const handleVisibilityChange = () => {
      if (document.hidden && stage === 'IN_EXAM') {
        recordViolation('TAB_SWITCH', 'Candidate switched away from assessment tab');
      }
    };

    // Window blur detection
    const handleWindowBlur = () => {
      if (stage === 'IN_EXAM') {
        recordViolation('WINDOW_BLUR', 'Browser window lost active focus');
      }
    };

    // Clipboard and dev-tools prevention
    const handleCopyPaste = (e) => {
      e.preventDefault();
      recordViolation('CLIPBOARD_PASTE', `Attempted clipboard action: ${e.type}`);
    };

    const handleKeyDown = (e) => {
      // Intercept Ctrl+C, Ctrl+V, Ctrl+X, F12, Ctrl+Shift+I
      if (
        (e.ctrlKey && ['c', 'v', 'x', 'a', 'p', 's'].includes(e.key.toLowerCase())) ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault();
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('cut', handleCopyPaste);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('cut', handleCopyPaste);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [stage, sessionToken]);

  // 7. Exam Submission
  const handleFinalSubmit = async (reason = 'MANUAL') => {
    setLoading(true);
    try {
      // 1. Flush any pending unsynced answers
      await triggerBackgroundSync();

      // 2. Submit to server
      const res = await api.studentExam.submitExam(sessionToken);
      setSubmitResult(res);

      // 3. Clear local cache
      await indexedDbService.clearSessionData(sessionToken);

      // 4. Exit fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }

      setStage(reason === 'TIMEOUT' ? 'AUTO_SUBMITTED' : 'SUBMITTED');
    } catch (err) {
      alert(`Submission error: ${err.message}. Your answers remain saved locally on this machine.`);
    } finally {
      setLoading(false);
      setConfirmSubmitModal(false);
    }
  };

  // Helper formatting for timer
  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // =========================================================================
  // RENDER: 1. OTP Verification Screen
  // =========================================================================
  if (stage === 'OTP_VERIFICATION') {
    return (
      <div className="student-exam-portal-wrapper" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#f8fafc' }}>
        <div className="card-glass" style={{ maxWidth: '440px', width: '100%', padding: '36px', textAlign: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.06)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)' }}>
            <Shield size={32} color="#ffffff" />
          </div>

          <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>Proctored Assessment</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
            Assessment Code: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontWeight: 'bold' }}>{assignmentCode}</span>
          </p>

          {error && (
            <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '13px', marginBottom: '20px', textAlign: 'left' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'left' }}>
              <label className="label" style={{ fontSize: '12px' }}>Enter 6-Digit Passcode (OTP)</label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="input"
                style={{ textAlign: 'center', fontSize: '28px', letterSpacing: '8px', fontFamily: 'var(--font-mono)', fontWeight: 'bold', padding: '14px' }}
                autoFocus
                required
              />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                Check the examination invitation email sent to your registered address.
              </span>
            </div>

            <button type="submit" className="btn btn-primary btn-lg" disabled={loading || otp.length < 6} style={{ width: '100%', marginTop: '8px' }}>
              {loading ? 'Verifying Passcode...' : 'Verify & Continue'}
            </button>
          </form>

          <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)', fontSize: '12px', color: 'var(--text-muted)' }}>
            Strict security monitoring enabled. Hardware and fullscreen verification applies.
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: 2. Exam Briefing & Rules
  // =========================================================================
  if (stage === 'BRIEFING') {
    const { assignment, paper } = examData;
    return (
      <div className="student-exam-portal-wrapper" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg-main)' }}>
        <div className="card" style={{ maxWidth: '680px', width: '100%', padding: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '14px', borderRadius: 'var(--radius-lg)' }}>
              <FileText size={32} color="var(--primary)" />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', marginBottom: '4px' }}>{assignment.title}</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                Candidate: <strong style={{ color: 'var(--text-primary)' }}>{candidateInfo?.name || candidateInfo?.snapshot_student_name}</strong> | Batch: {candidateInfo?.batch || candidateInfo?.snapshot_batch_name}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4" style={{ marginBottom: '24px' }}>
            <div style={{ background: 'var(--bg-surface-elevated)', padding: '16px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Duration</span>
              <strong style={{ fontSize: '20px', color: 'var(--text-primary)' }}>{assignment.durationMinutes} Mins</strong>
            </div>
            <div style={{ background: 'var(--bg-surface-elevated)', padding: '16px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Total Marks</span>
              <strong style={{ fontSize: '20px', color: 'var(--text-primary)' }}>{assignment.totalMarks}</strong>
            </div>
            <div style={{ background: 'var(--bg-surface-elevated)', padding: '16px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Passing Marks</span>
              <strong style={{ fontSize: '20px', color: 'var(--text-primary)' }}>{assignment.passMarks}</strong>
            </div>
          </div>

          {paper?.instructions && (
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '24px', fontSize: '13px', lineHeight: '1.6' }}>
              <strong style={{ display: 'block', marginBottom: '6px', color: 'var(--text-primary)' }}>Assessment Instructions:</strong>
              <div style={{ whiteSpace: 'pre-line', color: 'var(--text-secondary)' }}>{paper.instructions}</div>
            </div>
          )}

          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', padding: '18px', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--danger)', fontWeight: 'bold', marginBottom: '8px' }}>
              <AlertTriangle size={20} />
              <span>Strict Security & Three-Violation Rule:</span>
            </div>
            <ul style={{ paddingLeft: '22px', fontSize: '13px', color: '#fca5a5', lineHeight: '1.6' }}>
              <li>The exam must be taken in Fullscreen Mode on this browser window.</li>
              <li>Exiting fullscreen, switching tabs, or minimizing window will trigger an official warning.</li>
              <li>A maximum of <strong>3 violations</strong> is permitted. On the 3rd violation, the exam will be automatically locked and submitted.</li>
              <li>Your written answers are continuously preserved locally on your device and synced with our server.</li>
            </ul>
          </div>

          <button onClick={handleStartExam} className="btn btn-primary btn-lg" style={{ width: '100%', gap: '12px', fontSize: '17px' }}>
            <Maximize2 size={20} />
            Enter Fullscreen & Begin Assessment
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: 3 & 4. Submission Finished Screens
  // =========================================================================
  if (stage === 'SUBMITTED' || stage === 'AUTO_SUBMITTED') {
    const isAuto = stage === 'AUTO_SUBMITTED';
    return (
      <div className="student-exam-portal-wrapper" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#f8fafc' }}>
        <div className="card-glass" style={{ maxWidth: '560px', width: '100%', padding: '40px', textAlign: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.06)' }}>
          <div style={{ 
            width: '72px', height: '72px', borderRadius: '50%', 
            background: isAuto ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'linear-gradient(135deg, #10b981, #047857)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
            boxShadow: isAuto ? '0 8px 24px rgba(239, 68, 68, 0.4)' : '0 8px 24px rgba(16, 185, 129, 0.4)'
          }}>
            {isAuto ? <AlertOctagon size={36} color="#ffffff" /> : <CheckCircle2 size={36} color="#ffffff" />}
          </div>

          <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>
            {isAuto ? 'Assessment Locked & Auto-Submitted' : 'Assessment Successfully Submitted'}
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '24px' }}>
            {isAuto 
              ? 'Your examination session was automatically closed due to time expiration or exceeding security violations.'
              : 'Thank you for completing the examination. All answers have been synchronized and finalized.'}
          </p>

          <div style={{ background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', padding: '20px', textAlign: 'left', marginBottom: '28px', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Candidate:</span>
                <strong>{candidateInfo?.name || candidateInfo?.snapshot_student_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Batch:</span>
                <span>{candidateInfo?.batch || candidateInfo?.snapshot_batch_name}</span>
              </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Violations Recorded:</span>
              <span style={{ color: violations > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>{violations} / 3</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Status:</span>
              <span className={`badge ${isAuto ? 'badge-danger' : 'badge-success'}`}>
                {isAuto ? 'AUTO_SUBMITTED' : 'SUBMITTED'}
              </span>
            </div>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            The lab coordinator and evaluators will review your answers. You may now safely close this browser window.
          </p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: 5. Active Examination Room
  // =========================================================================
  const { assignment, paper } = examData;
  const sections = paper?.sections || [];
  const currentSection = sections[currentSectionIdx] || { questions: [] };
  const currentQuestion = currentSection.questions[currentQuestionIdx] || null;

  // Flattened question index calculation for palette
  let globalQuestionCounter = 0;
  const allQuestionsFlattened = [];
  sections.forEach((sec, sIdx) => {
    (sec.questions || []).forEach((q, qIdx) => {
      globalQuestionCounter++;
      allQuestionsFlattened.push({
        ...q,
        globalIdx: globalQuestionCounter,
        sIdx,
        qIdx
      });
    });
  });

  const totalQuestions = allQuestionsFlattened.length;
  const currentAnswer = currentQuestion ? (answers[currentQuestion.id] || { text: '', option: '' }) : { text: '', option: '' };

  return (
    <div className="student-exam-portal-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-main)', overflow: 'hidden' }}>
      {/* 1. Exam Top Bar */}
      <header style={{ 
        height: '64px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)', 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'var(--primary-glow)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-sm)', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Lock size={16} color="var(--primary)" />
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--primary)' }}>SECURE EXAM</span>
          </div>
          <div>
            <h2 style={{ fontSize: '16px', margin: 0 }}>{assignment.title}</h2>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {candidateInfo?.name || candidateInfo?.snapshot_student_name} ({candidateInfo?.batch || candidateInfo?.snapshot_batch_name})
            </span>
          </div>
        </div>

        {/* Center: Timer & Violations */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Security Violations Counter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: violations > 0 ? 'var(--danger-bg)' : 'var(--bg-surface-elevated)', border: `1px solid ${violations > 0 ? 'var(--danger-border)' : 'var(--border-default)'}`, padding: '6px 14px', borderRadius: 'var(--radius-md)' }}>
            <Shield size={16} color={violations > 0 ? 'var(--danger)' : 'var(--text-secondary)'} />
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: violations > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
              Violations: {violations} / 3
            </span>
          </div>

          {/* Countdown Clock */}
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            background: remainingSeconds < 300 ? 'var(--danger-bg)' : 'var(--bg-surface-elevated)', 
            border: `1px solid ${remainingSeconds < 300 ? 'var(--danger-border)' : 'var(--border-default)'}`,
            padding: '6px 16px', borderRadius: 'var(--radius-md)' 
          }}>
            <Clock size={18} color={remainingSeconds < 300 ? 'var(--danger)' : 'var(--text-primary)'} className={remainingSeconds < 300 ? 'animate-pulse-glow' : ''} />
            <span style={{ fontSize: '16px', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: remainingSeconds < 300 ? 'var(--danger)' : 'var(--text-primary)' }}>
              {formatTime(remainingSeconds)}
            </span>
          </div>
        </div>

        {/* Right: Sync Status & Submit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            {saveStatus === 'SYNCED' && (
              <>
                <CloudCheck size={16} color="var(--success)" />
                <span style={{ color: 'var(--success)' }}>Synced</span>
              </>
            )}
            {saveStatus === 'SAVED_LOCAL' && (
              <>
                <Check size={16} color="var(--primary)" />
                <span style={{ color: 'var(--text-secondary)' }}>Saved locally</span>
              </>
            )}
            {saveStatus === 'SYNCING' && (
              <>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></span>
                <span style={{ color: 'var(--text-muted)' }}>Syncing...</span>
              </>
            )}
            {saveStatus === 'OFFLINE' && (
              <>
                <WifiOff size={16} color="var(--warning)" />
                <span style={{ color: 'var(--warning)', fontWeight: 'bold' }}>Offline (Saved locally)</span>
              </>
            )}
          </div>

          <button onClick={() => setConfirmSubmitModal(true)} className="btn btn-danger btn-sm" style={{ gap: '6px' }}>
            <Send size={15} />
            Submit Paper
          </button>
        </div>
      </header>

      {/* 2. Main Exam Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left: Question Work Area */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto' }}>
          {/* Section Pills */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            {sections.map((sec, idx) => (
              <button
                key={sec.id || idx}
                onClick={() => {
                  setCurrentSectionIdx(idx);
                  setCurrentQuestionIdx(0);
                }}
                className={`btn btn-sm ${currentSectionIdx === idx ? 'btn-primary' : 'btn-secondary'}`}
              >
                {sec.title || `Section ${idx + 1}`} ({sec.questions?.length || 0})
              </button>
            ))}
          </div>

          {currentQuestion ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              {/* Question Header & Meta */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    Question {currentQuestion.question_order || currentQuestionIdx + 1}
                  </span>
                  <span className="badge badge-primary">{currentQuestion.question_type}</span>
                  <span className="badge badge-muted">{currentQuestion.difficulty}</span>
                </div>
                <div style={{ fontWeight: 'bold', color: 'var(--text-accent)' }}>
                  Marks: {currentQuestion.marks}
                </div>
              </div>

              {/* Question Content */}
              <div style={{ 
                background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', 
                padding: '20px', marginBottom: '24px', fontSize: '16px', lineHeight: '1.6', whiteSpace: 'pre-wrap' 
              }}>
                {currentQuestion.question_text}
              </div>

              {/* Answer Input Area */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Your Answer:</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Autosaving continuously to device
                  </span>
                </label>

                {currentQuestion.question_type === 'MCQ' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                    {(currentQuestion.options || []).map((opt, oIdx) => {
                      const isSelected = currentAnswer.option === opt;
                      return (
                        <div
                          key={oIdx}
                          onClick={() => handleAnswerChange(currentQuestion.id, undefined, opt)}
                          style={{
                            background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-surface)',
                            border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border-default)'}`,
                            borderRadius: 'var(--radius-md)',
                            padding: '14px 18px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{
                            width: '20px', height: '20px', borderRadius: '50%',
                            border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border-default)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {isSelected && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)' }} />}
                          </div>
                          <span style={{ fontSize: '15px' }}>{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <textarea
                    value={currentAnswer.text || ''}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value, undefined)}
                    placeholder="Type your comprehensive written answer here. You can use code formatting, bullet points, and numbered lists..."
                    className="textarea font-mono"
                    style={{ flex: 1, minHeight: '260px', fontSize: '15px', lineHeight: '1.6', padding: '16px' }}
                  />
                )}
              </div>

              {/* Bottom Nav Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestionIdx === 0}
                  className="btn btn-secondary"
                >
                  <ChevronLeft size={18} />
                  Previous Question
                </button>

                <button
                  onClick={() => setMarkedForReview(prev => ({ ...prev, [currentQuestion.id]: !prev[currentQuestion.id] }))}
                  className={`btn ${markedForReview[currentQuestion.id] ? 'btn-danger' : 'btn-secondary'}`}
                >
                  {markedForReview[currentQuestion.id] ? 'Marked for Review ★' : 'Mark for Review'}
                </button>

                <button
                  onClick={() => {
                    if (currentQuestionIdx < currentSection.questions.length - 1) {
                      setCurrentQuestionIdx(prev => prev + 1);
                    } else if (currentSectionIdx < sections.length - 1) {
                      setCurrentSectionIdx(prev => prev + 1);
                      setCurrentQuestionIdx(0);
                    }
                  }}
                  disabled={currentQuestionIdx === currentSection.questions.length - 1 && currentSectionIdx === sections.length - 1}
                  className="btn btn-primary"
                >
                  Next Question
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 'auto' }}>
              No questions found in this section.
            </div>
          )}
        </main>

        {/* Right: Question Navigation Palette */}
        <aside style={{ 
          width: '300px', background: 'var(--bg-surface)', borderLeft: '1px solid var(--border-default)', 
          padding: '20px', display: 'flex', flexDirection: 'column', flexShrink: 0 
        }}>
          <h3 style={{ fontSize: '15px', marginBottom: '14px', color: 'var(--text-secondary)' }}>Question Navigator</h3>

          {/* Legend */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', marginBottom: '18px', padding: '10px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--success)' }}></span>
              <span>Answered</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--primary)' }}></span>
              <span>Current</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--warning)' }}></span>
              <span>Marked Review</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--border-default)' }}></span>
              <span>Unanswered</span>
            </div>
          </div>

          {/* Palette Grid */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {sections.map((sec, sIdx) => (
              <div key={sec.id || sIdx}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  {sec.title}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                  {(sec.questions || []).map((q, qIdx) => {
                    const isCurrent = currentSectionIdx === sIdx && currentQuestionIdx === qIdx;
                    const ans = answers[q.id];
                    const isAnswered = ans && (ans.text?.trim() || ans.option);
                    const isMarked = markedForReview[q.id];

                    let bg = 'var(--bg-surface-elevated)';
                    let border = 'var(--border-default)';
                    let color = 'var(--text-secondary)';

                    if (isAnswered) {
                      bg = 'var(--success-bg)';
                      border = 'var(--success)';
                      color = 'var(--success)';
                    }
                    if (isMarked) {
                      bg = 'var(--warning-bg)';
                      border = 'var(--warning)';
                      color = 'var(--warning)';
                    }
                    if (isCurrent) {
                      bg = 'var(--primary)';
                      border = 'var(--primary)';
                      color = '#ffffff';
                    }

                    return (
                      <button
                        key={q.id || qIdx}
                        onClick={() => {
                          setCurrentSectionIdx(sIdx);
                          setCurrentQuestionIdx(qIdx);
                        }}
                        style={{
                          aspectRatio: '1',
                          background: bg,
                          border: `1px solid ${border}`,
                          color,
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 'bold',
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {q.question_order || qIdx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Submit Action */}
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
            <button onClick={() => setConfirmSubmitModal(true)} className="btn btn-primary" style={{ width: '100%', gap: '8px' }}>
              <Send size={16} />
              Review & Submit
            </button>
          </div>
        </aside>
      </div>

      {/* 3. Violation Warning Modal */}
      {violationModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px', textAlign: 'center' }}>
            <div style={{ padding: '30px 24px' }}>
              <div style={{ 
                width: '64px', height: '64px', borderRadius: '50%', background: 'var(--danger-bg)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                border: '1px solid var(--danger-border)'
              }}>
                <AlertTriangle size={32} color="var(--danger)" />
              </div>

              <h2 style={{ fontSize: '20px', color: 'var(--danger)', marginBottom: '8px' }}>
                {violationModal.autoSubmitted ? 'Security Limit Exceeded!' : `Security Warning (${violationModal.sequence}/3)`}
              </h2>

              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5', marginBottom: '20px' }}>
                {violationModal.message}
              </p>

              {!violationModal.autoSubmitted ? (
                <button
                  onClick={() => {
                    setViolationModal(null);
                    if (document.documentElement.requestFullscreen) {
                      document.documentElement.requestFullscreen().catch(() => {});
                    }
                  }}
                  className="btn btn-danger btn-lg"
                  style={{ width: '100%' }}
                >
                  Return to Fullscreen Exam ({violationModal.warningsLeft} warnings remaining)
                </button>
              ) : (
                <button
                  onClick={() => {
                    setViolationModal(null);
                    setStage('AUTO_SUBMITTED');
                  }}
                  className="btn btn-danger btn-lg"
                  style={{ width: '100%' }}
                >
                  Acknowledge Auto-Submission
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Final Submission Confirmation Modal */}
      {confirmSubmitModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '18px' }}>Submit Examination</h3>
              <button onClick={() => setConfirmSubmitModal(false)} className="btn btn-ghost btn-sm">&times;</button>
            </div>

            <div className="modal-body">
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                Are you sure you want to finish and submit your examination paper? Once submitted, your answers will be locked and cannot be changed.
              </p>

              <div style={{ background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', padding: '16px', fontSize: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Total Questions:</span>
                  <strong>{totalQuestions}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Answered:</span>
                  <strong style={{ color: 'var(--success)' }}>
                    {Object.values(answers).filter(a => a.text?.trim() || a.option).length}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Unanswered:</span>
                  <strong style={{ color: 'var(--warning)' }}>
                    {totalQuestions - Object.values(answers).filter(a => a.text?.trim() || a.option).length}
                  </strong>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setConfirmSubmitModal(false)} className="btn btn-secondary">
                Continue Writing
              </button>
              <button onClick={() => handleFinalSubmit('MANUAL')} disabled={loading} className="btn btn-danger">
                {loading ? 'Submitting...' : 'Yes, Submit Examination'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
