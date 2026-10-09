const smtpService = require('../../services/smtpService');

async function listSmtpAccounts(req, res) {
  try {
    const accounts = await smtpService.listSmtpAccounts();
    res.json({ success: true, data: accounts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createSmtpAccount(req, res) {
  try {
    const result = await smtpService.createSmtpAccount(req.body, req.user.id);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

async function testSmtpConnection(req, res) {
  try {
    const result = await smtpService.testSmtpConnection(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

async function updateSmtpAccount(req, res) {
  try {
    const result = await smtpService.updateSmtpAccount(req.params.id, req.body, req.user.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

module.exports = {
  listSmtpAccounts,
  createSmtpAccount,
  testSmtpConnection,
  updateSmtpAccount
};
