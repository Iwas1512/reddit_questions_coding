const express = require('express');
const router = express.Router();
const { FillBlankAnswer, Question } = require('../associations/associations.js');

// Create fill-in-blank answers for a question
// POST /api/questions/:questionId/fill-blank-answers
router.post('/:questionId/fill-blank-answers', async (req, res) => {
  try {
    const questionId = req.params.questionId;
    const { answers } = req.body;
    
    // Verify question exists and is fill-in-blank type
    const question = await Question.findByPk(questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    if (question.question_type !== 'fill_in_blank') {
      return res.status(400).json({ error: 'Question is not a fill-in-blank type' });
    }

    // Create answers
    const createdAnswers = [];
    for (const answerData of answers) {
      const answer = await FillBlankAnswer.create({
        question_id: questionId,
        correct_answer: answerData.correct_answer,
        is_case_sensitive: answerData.is_case_sensitive || false,
        accepts_partial_match: answerData.accepts_partial_match || false
      });
      createdAnswers.push(answer);
    }

    res.status(201).json(createdAnswers);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get fill-in-blank answers for a question
// GET /api/questions/:questionId/fill-blank-answers
router.get('/:questionId/fill-blank-answers', async (req, res) => {
  try {
    const answers = await FillBlankAnswer.findAll({
      where: { question_id: req.params.questionId }
    });
    res.json(answers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a fill-in-blank answer
// PUT /api/questions/:questionId/fill-blank-answers/:answerId
router.put('/:questionId/fill-blank-answers/:answerId', async (req, res) => {
  try {
    const answer = await FillBlankAnswer.findOne({
      where: { 
        answer_id: req.params.answerId,
        question_id: req.params.questionId 
      }
    });
    
    if (!answer) {
      return res.status(404).json({ error: 'Fill-in-blank answer not found' });
    }

    await answer.update(req.body);
    res.json(answer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a fill-in-blank answer
// DELETE /api/questions/:questionId/fill-blank-answers/:answerId
router.delete('/:questionId/fill-blank-answers/:answerId', async (req, res) => {
  try {
    const answer = await FillBlankAnswer.findOne({
      where: { 
        answer_id: req.params.answerId,
        question_id: req.params.questionId 
      }
    });
    
    if (!answer) {
      return res.status(404).json({ error: 'Fill-in-blank answer not found' });
    }

    await answer.destroy();
    res.json({ message: 'Fill-in-blank answer deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;