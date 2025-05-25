const express = require('express');
const router = express.Router();
const { McqOption, Question } = require('../associations/associations.js');

// Create MCQ options for a question
// POST /api/questions/8/options
router.post('/:questionId/options', async (req, res) => {
  try {
    const questionId = req.params.questionId;
    const { options } = req.body;
    
    // Verify question exists
    const question = await Question.findByPk(questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Create options
    const createdOptions = [];
    for (let i = 0; i < options.length; i++) {
      const option = await McqOption.create({
        question_id: questionId,
        option_text: options[i].option_text,
        is_correct: options[i].is_correct || false,
        option_order: i + 1
      });
      createdOptions.push(option);
    }

    res.status(201).json(createdOptions);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get options for a question
// GET /api/questions/8/options
router.get('/:questionId/options', async (req, res) => {
  try {
    const options = await McqOption.findAll({
      where: { question_id: req.params.questionId },
      order: [['option_order', 'ASC']]
    });
    res.json(options);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;