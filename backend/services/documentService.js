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
            ${q.options && Array.isArray(q.options) && q.options.length > 0 ? `
              <ol class="q-options">
                ${q.options.map(opt => `<li>${opt}</li>`).join('')}
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

module.exports = {
  renderQuestionPaperHTML,
  renderAnswerKeyHTML,
  generateQuestionPaperPDF,
  generateQuestionPaperDOCX
};
