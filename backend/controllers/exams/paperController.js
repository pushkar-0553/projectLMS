const paperService = require('../../services/paperService');
const documentService = require('../../services/documentService');

async function listPapers(req, res) {
  try {
    const { status, search, courseId } = req.query;
    const papers = await paperService.listPapers({ status, search, courseId });
    res.json({ success: true, data: papers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createPaper(req, res) {
  try {
    const result = await paperService.createPaper(req.body, req.user.id);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

async function getPaperById(req, res) {
  try {
    const paper = await paperService.getPaperById(req.params.id);
    if (!paper) return res.status(404).json({ success: false, message: 'Paper not found.' });
    res.json({ success: true, data: paper });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getVersionDetails(req, res) {
  try {
    const versionId = req.params.versionId;
    if (!versionId || versionId === 'undefined' || isNaN(parseInt(versionId, 10))) {
      return res.status(400).json({ success: false, message: 'Invalid or missing version ID.' });
    }
    const version = await paperService.getVersionDetails(versionId);
    if (!version) return res.status(404).json({ success: false, message: 'Version not found.' });
    res.json({ success: true, data: version });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createNewVersion(req, res) {
  try {
    const paperId = req.params.id;
    if (!paperId || paperId === 'undefined' || isNaN(parseInt(paperId, 10))) {
      return res.status(400).json({ success: false, message: 'Invalid paper ID.' });
    }
    const result = await paperService.createNewVersion(paperId, req.body, req.user.id);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

async function publishVersion(req, res) {
  try {
    const versionId = req.params.versionId;
    if (!versionId || versionId === 'undefined' || isNaN(parseInt(versionId, 10))) {
      return res.status(400).json({ success: false, message: 'Invalid or missing version ID.' });
    }
    const result = await paperService.publishVersion(versionId, req.user.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

async function previewHTML(req, res) {
  try {
    const versionId = req.params.versionId;
    if (!versionId || versionId === 'undefined' || isNaN(parseInt(versionId, 10))) {
      return res.status(400).send('Invalid or missing version ID.');
    }
    const version = await paperService.getVersionDetails(versionId);
    if (!version) return res.status(404).send('Version not found.');
    const html = documentService.renderQuestionPaperHTML(version);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    res.status(500).send(err.message);
  }
}

async function previewAnswerKeyHTML(req, res) {
  try {
    const versionId = req.params.versionId;
    if (!versionId || versionId === 'undefined' || isNaN(parseInt(versionId, 10))) {
      return res.status(400).send('Invalid or missing version ID.');
    }
    const version = await paperService.getVersionDetails(versionId);
    if (!version) return res.status(404).send('Version not found.');
    const html = documentService.renderAnswerKeyHTML(version);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    res.status(500).send(err.message);
  }
}

async function downloadPDF(req, res) {
  try {
    const versionId = req.params.versionId;
    if (!versionId || versionId === 'undefined' || isNaN(parseInt(versionId, 10))) {
      return res.status(400).send('Invalid or missing version ID.');
    }
    const version = await paperService.getVersionDetails(versionId);
    if (!version) return res.status(404).send('Version not found.');
    const buffer = await documentService.generateQuestionPaperPDF(version);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${version.title.replace(/[^a-zA-Z0-9]/g, '_')}_V${version.version_number}.pdf"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).send(err.message);
  }
}

async function downloadDOCX(req, res) {
  try {
    const versionId = req.params.versionId;
    if (!versionId || versionId === 'undefined' || isNaN(parseInt(versionId, 10))) {
      return res.status(400).send('Invalid or missing version ID.');
    }
    const version = await paperService.getVersionDetails(versionId);
    if (!version) return res.status(404).send('Version not found.');
    const buffer = await documentService.generateQuestionPaperDOCX(version);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${version.title.replace(/[^a-zA-Z0-9]/g, '_')}_V${version.version_number}.docx"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).send(err.message);
  }
}

async function updatePaper(req, res) {
  try {
    const paperId = req.params.id;
    if (!paperId || paperId === 'undefined' || isNaN(parseInt(paperId, 10))) {
      return res.status(400).json({ success: false, message: 'Invalid paper ID.' });
    }
    const result = await paperService.updatePaper(paperId, req.body, req.user.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

async function deletePaper(req, res) {
  try {
    const paperId = req.params.id;
    if (!paperId || paperId === 'undefined' || isNaN(parseInt(paperId, 10))) {
      return res.status(400).json({ success: false, message: 'Invalid paper ID.' });
    }
    const result = await paperService.deletePaper(paperId, req.user.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

module.exports = {
  listPapers,
  createPaper,
  getPaperById,
  getVersionDetails,
  createNewVersion,
  publishVersion,
  previewHTML,
  previewAnswerKeyHTML,
  downloadPDF,
  downloadDOCX,
  updatePaper,
  deletePaper
};
