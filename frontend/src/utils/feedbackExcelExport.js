import * as XLSX from 'xlsx';

/**
 * Reusable Excel Export Generator for Student Feedback Module
 * Generates structured 2-sheet workbook:
 *   - Sheet 1: Executive Summary & Participation KPI Metrics
 *   - Sheet 2: Student-wise detailed answers with dynamically generated question columns
 *
 * @param {Object} reportData - Unified Common Report Data
 * @param {string} [customFileName] - Optional custom filename prefix
 */
export const exportFeedbackToExcel = (reportData, customFileName = '') => {
  if (!reportData) return;

  const campaign = reportData.campaign || {};
  const stats = reportData.stats || {};
  const questions = reportData.questions || [];
  const responses = reportData.responses || [];
  const batches = (reportData.batches || []).map(b => b.name).join(', ') || 'All Batches';

  const totalStud = stats.total_students || 0;
  const completed = stats.completed_count || responses.length || 0;
  const pending = stats.pending_count !== undefined ? stats.pending_count : Math.max(0, totalStud - completed);
  const rate = stats.completion_rate !== undefined 
    ? stats.completion_rate 
    : (totalStud > 0 ? Math.round((completed / totalStud) * 100) : 0);

  // -------------------------------------------------------------
  // Sheet 1: Executive Summary
  // -------------------------------------------------------------
  const summaryAoa = [
    ['VCUBE LMS - STUDENT FEEDBACK CAMPAIGN SUMMARY'],
    [],
    ['Campaign Title', campaign.title || 'Course Feedback'],
    ['Course / Branch', campaign.course_name || 'N/A'],
    ['Target Batches', batches],
    ['Feedback Date', campaign.feedback_date || 'N/A'],
    ['Campaign Status', campaign.status || 'ACTIVE'],
    ['Report Exported At', new Date().toLocaleString('en-IN')],
    [],
    ['METRIC', 'COUNT / VALUE'],
    ['Total Eligible Students', totalStud],
    ['Completed Responses', completed],
    ['Pending Responses', pending],
    ['Overall Completion Rate', `${rate}%`],
    ['Total Questions Defined', questions.length]
  ];

  // Append batch-wise breakdown if available
  if (stats.batch_stats && stats.batch_stats.length > 0) {
    summaryAoa.push([]);
    summaryAoa.push(['BATCH-WISE PARTICIPATION BREAKDOWN']);
    summaryAoa.push(['Batch Name', 'Total Students', 'Completed', 'Pending', 'Completion Rate']);
    stats.batch_stats.forEach(bs => {
      const bPct = bs.total > 0 ? `${Math.round((bs.completed / bs.total) * 100)}%` : '0%';
      summaryAoa.push([bs.batch_name, bs.total, bs.completed, bs.pending, bPct]);
    });
  }

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
  wsSummary['!cols'] = [
    { wch: 28 },
    { wch: 32 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 }
  ];

  // -------------------------------------------------------------
  // Sheet 2: Student Feedback (Dynamic Question Columns)
  // -------------------------------------------------------------
  // Header row
  const feedbackHeaders = [
    'S.No',
    'Student Name',
    'Batch',
    'Mobile',
    'Email',
    'Status'
  ];

  // Dynamically add question headers
  questions.forEach((q, idx) => {
    const qLabel = `Q${idx + 1}: ${q.question_text}${q.question_type === 'RATING' ? ' (1-5)' : ''}`;
    feedbackHeaders.push(qLabel);
  });

  feedbackHeaders.push('Overall Feedback');
  feedbackHeaders.push('Submitted At');

  const feedbackAoa = [feedbackHeaders];

  // Rows per student response
  responses.forEach((resp, rIdx) => {
    const answersMap = {};
    (resp.answers || []).forEach(a => {
      answersMap[a.question_id] = a;
    });

    const submittedStr = resp.submitted_at
      ? new Date(resp.submitted_at).toLocaleString('en-IN')
      : 'Submitted';

    const row = [
      rIdx + 1,
      resp.student_name || 'N/A',
      resp.batch_name || 'Unassigned',
      resp.student_mobile ? String(resp.student_mobile).trim() : 'N/A',
      resp.student_email ? String(resp.student_email).trim() : 'N/A',
      resp.status || 'COMPLETED'
    ];

    // Dynamic question answers
    questions.forEach(q => {
      const ans = answersMap[q.id];
      if (!ans) {
        row.push('-');
      } else if (q.question_type === 'RATING') {
        const val = ans.rating_value || ans.ratingValue;
        row.push(val ? `${val} / 5` : '-');
      } else {
        row.push(ans.answer_text || ans.answerText || '-');
      }
    });

    row.push(resp.overall_feedback ? String(resp.overall_feedback).trim() : '-');
    row.push(submittedStr);

    feedbackAoa.push(row);
  });

  const wsFeedback = XLSX.utils.aoa_to_sheet(feedbackAoa);

  // Dynamic column widths for student feedback sheet
  const fbCols = [
    { wch: 6 },  // S.No
    { wch: 24 }, // Student Name
    { wch: 18 }, // Batch
    { wch: 16 }, // Mobile
    { wch: 26 }, // Email
    { wch: 14 }  // Status
  ];
  questions.forEach(() => {
    fbCols.push({ wch: 35 }); // Question answer columns
  });
  fbCols.push({ wch: 40 }); // Overall feedback
  fbCols.push({ wch: 22 }); // Submitted At
  wsFeedback['!cols'] = fbCols;

  // -------------------------------------------------------------
  // Construct & Export Workbook
  // -------------------------------------------------------------
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
  XLSX.utils.book_append_sheet(wb, wsFeedback, 'Student Feedback');

  const baseTitle = customFileName || campaign.title || 'Feedback';
  const safeTitle = baseTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${safeTitle}_Feedback_Report.xlsx`;

  XLSX.writeFile(wb, fileName);
};
