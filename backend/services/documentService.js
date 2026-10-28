const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } = require('docx');
const db = require('../config/db');
const { getVersionDetails } = require('./paperService');
const { getCandidateSubmissionForEvaluation } = require('./evaluationService');

/**
 * Generate clean HTML format of Question Paper
 */
function renderQuestionPaperHTML(paperData, orgName = 'EXAMINATION & EVALUATION AUTHORITY') {
  let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${paperData.title} - Question Paper</title>
      <style>
        body { font-family: 'Times New Roman', Times, serif; margin: 40px; color: #111; line-height: 1.5; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px; }
        .header h2 { margin: 6px 0; font-size: 16px; font-weight: normal; }
        .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 14px; font-weight: bold; }
        .meta-table td { padding: 4px 0; }
        .instructions { font-size: 13px; font-style: italic; background: #fdfdfd; border: 1px dashed #aaa; padding: 10px; margin-bottom: 24px; }
        .section-title { font-size: 15px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 4px; margin-top: 24px; }
        .question-box { margin: 16px 0; font-size: 14px; page-break-inside: avoid; }
        .q-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 4px; }
        .q-text { margin-bottom: 8px; }
        .q-options { list-style-type: upper-alpha; margin-left: 20px; }
        .q-options li { margin-bottom: 4px; }
        .footer { text-align: center; margin-top: 40px; font-size: 12px; border-top: 1px solid #ccc; padding-top: 8px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${orgName}</h1>
        <h2>${paperData.title} (Version ${paperData.version_number})</h2>
      </div>

      <table class="meta-table">
        <tr>
          <td>Course / Subject: ${paperData.subject || 'General'}</td>
          <td style="text-align: right;">Total Marks: ${paperData.total_marks}</td>
        </tr>
        <tr>
          <td>Duration: ${paperData.duration_minutes} Minutes</td>
          <td style="text-align: right;">Passing Marks: ${Math.round(paperData.total_marks * 0.4)}</td>
        </tr>
      </table>

      ${paperData.instructions ? `
      <div class="instructions">
        <strong>General Instructions:</strong><br>
        ${paperData.instructions.replace(/\n/g, '<br>')}
      </div>` : ''}

      ${(paperData.sections || []).map(sec => `
        <div class="section-title">
          ${sec.title} ${sec.total_marks ? `[Marks: ${sec.total_marks}]` : ''}
        </div>
        ${sec.instructions ? `<p style="font-style: italic; font-size: 13px; margin: 4px 0 12px 0;">${sec.instructions}</p>` : ''}

        ${(sec.questions || []).map((q, idx) => `
          <div class="question-box">
            <div class="q-header">
              <span>Q${q.question_order || idx + 1}. [${q.question_type}]</span>
              <span>[${q.marks} Marks]</span>
            </div>
            <div class="q-text">${q.question_text.replace(/\n/g, '<br>')}</div>
            ${q.code_snippet ? `
              <pre style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; font-family: monospace; font-size: 13px; margin: 8px 0; overflow-x: auto; white-space: pre-wrap;"><code>${q.code_snippet.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
            ` : ''}
            ${q.options && Array.isArray(q.options) && q.options.length > 0 ? `
              <ol class="q-options" ${q.question_type === 'MULTI_SELECT' ? 'style="list-style-type: none; padding-left: 10px;"' : ''}>
                ${q.options.map((opt, oIdx) => q.question_type === 'MULTI_SELECT' 
                  ? `<li style="margin-bottom: 4px;">[ &nbsp; ] ${String.fromCharCode(65 + oIdx)}. ${opt}</li>` 
                  : `<li>${opt}</li>`
                ).join('')}
              </ol>
            ` : ''}
          </div>
        `).join('')}
      `).join('')}

      <div class="footer">
        --- End of Question Paper ---
      </div>
    </body>
    </html>
  `;
  return html;
}

/**
 * Generate clean HTML format of Answer Key
 */
function renderAnswerKeyHTML(paperData, orgName = 'EXAMINATION & EVALUATION AUTHORITY') {
  let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${paperData.title} - Answer Key & Solutions</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #1e293b; line-height: 1.5; }
        .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 20px; color: #1e3a8a; }
        .section-title { font-size: 15px; font-weight: bold; background: #f1f5f9; padding: 6px 12px; margin-top: 24px; border-left: 4px solid #2563eb; }
        .solution-box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin: 16px 0; background: #fff; }
        .key-badge { background: #dcfce7; color: #166534; font-weight: bold; padding: 2px 8px; border-radius: 4px; font-size: 12px; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${orgName}</h1>
        <h2>OFFICIAL ANSWER KEY: ${paperData.title} (V${paperData.version_number})</h2>
      </div>

      ${(paperData.sections || []).map(sec => `
        <div class="section-title">${sec.title}</div>
        ${(sec.questions || []).map(q => `
          <div class="solution-box">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <strong>Q${q.question_order}. ${q.question_text}</strong>
              <span class="key-badge">${q.marks} Marks</span>
            </div>
            <div style="background: #f8fafc; padding: 10px; border-radius: 4px; margin-top: 8px;">
              <strong style="color: #047857;">Standard Answer / Solution:</strong>
              <p style="margin: 4px 0;">${q.answer_key || 'No sample answer provided.'}</p>
              ${q.explanation ? `
                <div style="margin-top: 6px; font-size: 13px; color: #475569;">
                  <strong>Explanation / Marking Scheme:</strong><br>${q.explanation}
                </div>
              ` : ''}
            </div>
          </div>
        `).join('')}
      `).join('')}
    </body>
    </html>
  `;
  return html;
}

/**
 * Generate PDF buffer for Question Paper
 */
function generateQuestionPaperPDF(paperData, orgName = 'EXAMINATION & EVALUATION AUTHORITY') {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Header
      doc.fontSize(16).font('Helvetica-Bold').text(orgName, { align: 'center' });
      doc.fontSize(12).font('Helvetica').text(`${paperData.title} (Version ${paperData.version_number})`, { align: 'center' });
      doc.moveDown(0.5);

      // Meta info
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text(`Subject: ${paperData.subject || 'General'}`, { continued: true });
      doc.text(`Total Marks: ${paperData.total_marks}`, { align: 'right' });
      doc.text(`Duration: ${paperData.duration_minutes} Mins`, { continued: true });
      doc.text(`Passing Marks: ${Math.round(paperData.total_marks * 0.4)}`, { align: 'right' });
      doc.moveDown(0.5);

      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke('#000000');
      doc.moveDown(0.8);

      // Instructions
      if (paperData.instructions) {
        doc.fontSize(9).font('Helvetica-Oblique').text(`Instructions: ${paperData.instructions}`);
        doc.moveDown(0.8);
      }

      // Sections & Questions
      (paperData.sections || []).forEach(sec => {
        doc.fontSize(11).font('Helvetica-Bold').text(`${sec.title.toUpperCase()} [${sec.total_marks || 0} Marks]`);
        doc.moveDown(0.3);

        (sec.questions || []).forEach((q, idx) => {
          doc.fontSize(10).font('Helvetica-Bold');
          doc.text(`Q${q.question_order || idx + 1}. [${q.question_type}]`, { continued: true });
          doc.text(` [${q.marks} Marks]`, { align: 'right' });

          doc.fontSize(10).font('Helvetica').text(q.question_text);

          if (q.options && Array.isArray(q.options)) {
            q.options.forEach((opt, optIdx) => {
              doc.text(`   ${String.fromCharCode(65 + optIdx)}. ${opt}`);
            });
          }
          doc.moveDown(0.5);
        });
        doc.moveDown(0.5);
      });

      doc.fontSize(9).font('Helvetica-Oblique').text('--- End of Question Paper ---', { align: 'center' });
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generate DOCX buffer for Question Paper
 */
async function generateQuestionPaperDOCX(paperData, orgName = 'EXAMINATION & EVALUATION AUTHORITY') {
  const children = [
    new Paragraph({
      text: orgName,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      text: `${paperData.title} (Version ${paperData.version_number})`,
      heading: HeadingLevel.HEADING_2,
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Subject: ${paperData.subject || 'General'}    |    `, bold: true }),
        new TextRun({ text: `Total Marks: ${paperData.total_marks}    |    `, bold: true }),
        new TextRun({ text: `Duration: ${paperData.duration_minutes} Minutes`, bold: true })
      ],
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({ text: '' })
  ];

  if (paperData.instructions) {
    children.push(new Paragraph({
      children: [new TextRun({ text: `Instructions: ${paperData.instructions}`, italics: true })]
    }));
    children.push(new Paragraph({ text: '' }));
  }

  (paperData.sections || []).forEach(sec => {
    children.push(new Paragraph({
      text: `${sec.title} [Marks: ${sec.total_marks || 0}]`,
      heading: HeadingLevel.HEADING_1
    }));

    (sec.questions || []).forEach((q, idx) => {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `Q${q.question_order || idx + 1}. `, bold: true }),
          new TextRun({ text: `[${q.marks} Marks] - [${q.question_type}] `, bold: true, italics: true }),
          new TextRun({ text: q.question_text })
        ]
      }));

      if (q.options && Array.isArray(q.options)) {
        q.options.forEach((opt, optIdx) => {
          children.push(new Paragraph({
            text: `    ${String.fromCharCode(65 + optIdx)}. ${opt}`
          }));
        });
      }
      children.push(new Paragraph({ text: '' }));
    });
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children
    }]
  });

  return await Packer.toBuffer(doc);
}

/**
 * Generate PDF buffer for Student Feedback Campaign Report
 */
function generateFeedbackPDF(reportData, orgName = 'VCUBE LMS - STUDENT FEEDBACK REPORT') {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const campaign = reportData.campaign || {};
      const stats = reportData.stats || {};
      const questions = reportData.questions || [];
      const responses = reportData.responses || [];

      // 1. Report Title & Organization
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#1e3a8a').text(orgName, { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#0f172a').text(campaign.title || 'Course Feedback Report', { align: 'center' });
      doc.moveDown(0.4);

      // Meta Info Bar
      doc.fontSize(9.5).font('Helvetica').fillColor('#475569');
      const batchList = (reportData.batches || []).map(b => b.name).join(', ') || 'All Batches';
      doc.text(`Course: ${campaign.course_name || 'N/A'}    |    Date: ${campaign.feedback_date || 'N/A'}    |    Batches: ${batchList}`, { align: 'center' });
      doc.moveDown(0.6);

      // Divider line
      doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#cbd5e1').stroke();
      doc.moveDown(0.6);

      // 2. Summary KPI Box
      const kpiTop = doc.y;
      doc.rect(40, kpiTop, 515, 46).fillAndStroke('#f8fafc', '#e2e8f0');
      
      const totalStud = stats.total_students || 0;
      const completed = stats.completed_count || responses.length || 0;
      const pending = stats.pending_count !== undefined ? stats.pending_count : Math.max(0, totalStud - completed);
      const rate = stats.completion_rate !== undefined ? stats.completion_rate : (totalStud > 0 ? Math.round((completed / totalStud) * 100) : 0);

      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9);
      doc.text(`Total Students: ${totalStud}`, 55, kpiTop + 10);
      doc.fillColor('#047857').text(`Completed: ${completed}`, 180, kpiTop + 10);
      doc.fillColor('#b45309').text(`Pending: ${pending}`, 305, kpiTop + 10);
      doc.fillColor('#4338ca').text(`Completion Rate: ${rate}%`, 425, kpiTop + 10);

      doc.fillColor('#64748b').font('Helvetica').fontSize(8.5);
      doc.text(`Total Questions: ${questions.length}`, 55, kpiTop + 26);
      doc.text(`Exported: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 425, kpiTop + 26);

      doc.y = kpiTop + 56;
      doc.moveDown(0.4);

      // 3. Responses Header
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e293b').text(`Submitted Student Feedback (${responses.length})`);
      doc.moveDown(0.4);

      if (responses.length === 0) {
        doc.fontSize(10).font('Helvetica-Oblique').fillColor('#64748b').text('No feedback responses have been submitted yet.', { align: 'center' });
      } else {
        responses.forEach((resp, idx) => {
          // If less than 140pt remaining on page, start on a fresh page
          if (doc.y > 670) {
            doc.addPage();
          }

          const cardStart = doc.y;
          // Card Header Bar
          doc.rect(40, cardStart, 515, 22).fill('#f1f5f9');
          doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9.5);
          doc.text(`${idx + 1}. ${resp.student_name || 'Student'}`, 48, cardStart + 6, { continued: true });
          doc.font('Helvetica').fontSize(8.5).fillColor('#475569');
          doc.text(`   [Batch: ${resp.batch_name || 'Unassigned'}]`, { continued: true });
          
          const submittedAtStr = resp.submitted_at 
            ? new Date(resp.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : 'Submitted';
          doc.text(submittedAtStr, { align: 'right' });

          doc.y = cardStart + 26;
          doc.moveDown(0.2);

          // Contact line if available
          if (resp.student_mobile || resp.student_email) {
            doc.font('Helvetica').fontSize(8).fillColor('#64748b');
            const contactText = [resp.student_mobile ? `Mobile: ${resp.student_mobile.trim()}` : null, resp.student_email ? `Email: ${resp.student_email.trim()}` : null].filter(Boolean).join('  |  ');
            doc.text(contactText, 48);
            doc.moveDown(0.3);
          }

          // Questions & Answers
          const answersMap = {};
          (resp.answers || []).forEach(a => {
            answersMap[a.question_id] = a;
          });

          questions.forEach((q, qIdx) => {
            if (doc.y > 720) {
              doc.addPage();
            }

            const ans = answersMap[q.id];
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e293b');
            doc.text(`Q${qIdx + 1}. ${q.question_text}`, 48);

            let displayAnswer = 'No answer provided';
            if (ans) {
              if (q.question_type === 'RATING') {
                const val = ans.rating_value || ans.ratingValue;
                const stars = val ? '★'.repeat(val) + '☆'.repeat(Math.max(0, 5 - val)) : '';
                displayAnswer = val ? `${stars} (${val}/5 Stars)` : 'Not rated';
              } else {
                displayAnswer = ans.answer_text || ans.answerText || 'None';
              }
            }

            doc.font('Helvetica').fontSize(8.5).fillColor('#0369a1');
            doc.text(`Answer: ${displayAnswer}`, 60);
            doc.moveDown(0.2);
          });

          // Overall Feedback
          if (resp.overall_feedback && String(resp.overall_feedback).trim()) {
            if (doc.y > 720) {
              doc.addPage();
            }
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#92400e');
            doc.text(`Overall Notes:`, 48, doc.y, { continued: true });
            doc.font('Helvetica-Oblique').fontSize(8.5).fillColor('#78350f');
            doc.text(` "${resp.overall_feedback.trim()}"`);
            doc.moveDown(0.2);
          }

          doc.moveDown(0.4);
          doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#e2e8f0').stroke();
          doc.moveDown(0.5);
        });
      }

      // Footer
      doc.moveDown(0.5);
      doc.fontSize(8).font('Helvetica-Oblique').fillColor('#94a3b8').text('--- End of Student Feedback Report ---', { align: 'center' });
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generate DOCX buffer for Student Feedback Campaign Report
 */
async function generateFeedbackDOCX(reportData, orgName = 'VCUBE LMS - STUDENT FEEDBACK REPORT') {
  const campaign = reportData.campaign || {};
  const stats = reportData.stats || {};
  const questions = reportData.questions || [];
  const responses = reportData.responses || [];
  const batchList = (reportData.batches || []).map(b => b.name).join(', ') || 'All Batches';

  const totalStud = stats.total_students || 0;
  const completed = stats.completed_count || responses.length || 0;
  const pending = stats.pending_count !== undefined ? stats.pending_count : Math.max(0, totalStud - completed);
  const rate = stats.completion_rate !== undefined ? stats.completion_rate : (totalStud > 0 ? Math.round((completed / totalStud) * 100) : 0);

  const children = [
    new Paragraph({
      text: orgName,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      text: campaign.title || 'Student Feedback Report',
      heading: HeadingLevel.HEADING_2,
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Course: ${campaign.course_name || 'N/A'}    |    `, bold: true }),
        new TextRun({ text: `Date: ${campaign.feedback_date || 'N/A'}    |    `, bold: true }),
        new TextRun({ text: `Batches: ${batchList}`, bold: true })
      ],
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({ text: '' }),

    // Summary Section
    new Paragraph({
      text: 'EXECUTIVE SUMMARY',
      heading: HeadingLevel.HEADING_1
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Total Students Assigned: `, bold: true }),
        new TextRun({ text: `${totalStud}    |    ` }),
        new TextRun({ text: `Completed Feedback: `, bold: true }),
        new TextRun({ text: `${completed}    |    ` }),
        new TextRun({ text: `Pending: `, bold: true }),
        new TextRun({ text: `${pending}    |    ` }),
        new TextRun({ text: `Completion Rate: `, bold: true }),
        new TextRun({ text: `${rate}%` })
      ]
    }),
    new Paragraph({ text: '' }),
    new Paragraph({
      text: `STUDENT FEEDBACK RESPONSES (${responses.length})`,
      heading: HeadingLevel.HEADING_1
    }),
    new Paragraph({ text: '' })
  ];

  if (responses.length === 0) {
    children.push(new Paragraph({
      children: [new TextRun({ text: 'No feedback responses have been submitted yet.', italics: true })]
    }));
  } else {
    responses.forEach((resp, idx) => {
      const answersMap = {};
      (resp.answers || []).forEach(a => {
        answersMap[a.question_id] = a;
      });

      const submittedAtStr = resp.submitted_at 
        ? new Date(resp.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : 'Submitted';

      // Student Header
      children.push(new Paragraph({
        text: `${idx + 1}. ${resp.student_name || 'Student'} - Batch: ${resp.batch_name || 'Unassigned'}`,
        heading: HeadingLevel.HEADING_2
      }));

      // Contact & Timing
      const metaRuns = [
        new TextRun({ text: `Submission Time: ${submittedAtStr}`, italics: true })
      ];
      if (resp.student_mobile) {
        metaRuns.push(new TextRun({ text: `   |   Mobile: ${resp.student_mobile.trim()}`, italics: true }));
      }
      if (resp.student_email) {
        metaRuns.push(new TextRun({ text: `   |   Email: ${resp.student_email.trim()}`, italics: true }));
      }
      children.push(new Paragraph({ children: metaRuns }));
      children.push(new Paragraph({ text: '' }));

      // Questions & Answers
      questions.forEach((q, qIdx) => {
        const ans = answersMap[q.id];
        let displayAnswer = 'No answer provided';
        if (ans) {
          if (q.question_type === 'RATING') {
            const val = ans.rating_value || ans.ratingValue;
            displayAnswer = val ? `${val} / 5 Stars` : 'Not rated';
          } else {
            displayAnswer = ans.answer_text || ans.answerText || 'None';
          }
        }

        children.push(new Paragraph({
          children: [
            new TextRun({ text: `Q${qIdx + 1}. ${q.question_text}`, bold: true })
          ]
        }));
        children.push(new Paragraph({
          children: [
            new TextRun({ text: `Answer: `, bold: true }),
            new TextRun({ text: displayAnswer })
          ]
        }));
        children.push(new Paragraph({ text: '' }));
      });

      // Overall Feedback
      if (resp.overall_feedback && String(resp.overall_feedback).trim()) {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: `Overall Notes: `, bold: true }),
            new TextRun({ text: String(resp.overall_feedback).trim(), italics: true })
          ]
        }));
        children.push(new Paragraph({ text: '' }));
      }

      // Separator
      children.push(new Paragraph({
        text: '----------------------------------------------------------------------------------------------------'
      }));
      children.push(new Paragraph({ text: '' }));
    });
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children
    }]
  });

  return await Packer.toBuffer(doc);
}

module.exports = {
  renderQuestionPaperHTML,
  renderAnswerKeyHTML,
  generateQuestionPaperPDF,
  generateQuestionPaperDOCX,
  generateFeedbackPDF,
  generateFeedbackDOCX
};

