const questionBankService = require('../../services/questionBankService');

async function listCategories(req, res) {
  try {
    const categories = await questionBankService.listCategories();
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createCategory(req, res) {
  try {
    const category = await questionBankService.createCategory(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

async function listQuestions(req, res) {
  try {
    const { categoryId, difficulty, questionType, search } = req.query;
    const questions = await questionBankService.listQuestions({ categoryId, difficulty, questionType, search });
    res.json({ success: true, data: questions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createQuestion(req, res) {
  try {
    const result = await questionBankService.createQuestion(req.body);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

module.exports = {
  listCategories,
  createCategory,
  listQuestions,
  createQuestion
};
