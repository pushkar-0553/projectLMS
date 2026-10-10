const aiConfigService = require('../../services/aiConfigService');

async function listAiConfigs(req, res) {
  try {
    const configs = await aiConfigService.listAiConfigs();
    res.json({ success: true, data: configs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createAiConfig(req, res) {
  try {
    const result = await aiConfigService.createAiConfig(req.body, req.user?.id);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

async function updateAiConfig(req, res) {
  try {
    const result = await aiConfigService.updateAiConfig(req.params.id, req.body, req.user?.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

async function setDefaultAiConfig(req, res) {
  try {
    const result = await aiConfigService.setDefaultAiConfig(req.params.id, req.user?.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

async function deleteAiConfig(req, res) {
  try {
    const result = await aiConfigService.deleteAiConfig(req.params.id, req.user?.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

async function testAiConfig(req, res) {
  try {
    const result = await aiConfigService.testAiConfig(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

module.exports = {
  listAiConfigs,
  createAiConfig,
  updateAiConfig,
  setDefaultAiConfig,
  deleteAiConfig,
  testAiConfig
};
