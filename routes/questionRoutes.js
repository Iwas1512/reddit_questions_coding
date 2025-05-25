const express = require('express');
const router = express.Router();
const { Question, User, McqOption, FillBlankAnswer, UserAnswer } = require('../associations/associations.js');

// Create a new question with options/answers
router.post('/', async (req, res) => {
  const transaction = await Question.sequelize.transaction();
  
  try {
    const { mcqOptions, fillBlankAnswers, ...questionData } = req.body;
    
    // Create the question first
    const question = await Question.create(questionData, { transaction });
    
    // Handle MCQ options if provided
    if (questionData.question_type === 'mcq' && mcqOptions && mcqOptions.length > 0) {
      const createdOptions = [];
      for (let i = 0; i < mcqOptions.length; i++) {
        const option = await McqOption.create({
          question_id: question.question_id,
          option_text: mcqOptions[i].option_text,
          is_correct: mcqOptions[i].is_correct || false,
          option_order: i + 1
        }, { transaction });
        createdOptions.push(option);
      }
      question.dataValues.mcqOptions = createdOptions;
    }
    
    // Handle fill-in-blank answers if provided
    if (questionData.question_type === 'fill_in_blank' && fillBlankAnswers && fillBlankAnswers.length > 0) {
      const createdAnswers = [];
      for (const answerData of fillBlankAnswers) {
        const answer = await FillBlankAnswer.create({
          question_id: question.question_id,
          correct_answer: answerData.correct_answer,
          is_case_sensitive: answerData.is_case_sensitive || false,
          accepts_partial_match: answerData.accepts_partial_match || false
        }, { transaction });
        createdAnswers.push(answer);
      }
      question.dataValues.fillBlankAnswers = createdAnswers;
    }
    
    await transaction.commit();
    res.status(201).json(question);
  } catch (error) {
    await transaction.rollback();
    res.status(400).json({ error: error.message });
  }
});

// Get all questions (with pagination support)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows: questions } = await Question.findAndCountAll({
      limit,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['user_id', 'username', 'first_name', 'last_name']
        }
      ]
    });

    res.json({
      questions,
      totalCount: count,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      hasNextPage: page < Math.ceil(count / limit),
      hasPreviousPage: page > 1
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single question by ID
router.get('/:id', async (req, res) => {
  try {
    const question = await Question.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['user_id', 'username', 'first_name', 'last_name']
        },
        {
          model: McqOption,
          as: 'mcqOptions',
          order: [['option_order', 'ASC']]
        },
        {
          model: FillBlankAnswer,
          as: 'fillBlankAnswers'
        }
      ]
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json(question);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get question with its options (complete question for studying)
router.get('/:id/complete', async (req, res) => {
  try {
    const question = await Question.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['user_id', 'username', 'first_name', 'last_name']
        },
        {
          model: McqOption,
          as: 'mcqOptions',
          order: [['option_order', 'ASC']]
        },
        {
          model: FillBlankAnswer,
          as: 'fillBlankAnswers'
        }
      ]
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json(question);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit an answer and check if correct
router.post('/:id/submit-answer', async (req, res) => {
  try {
    const { user_id, submitted_answer, time_taken } = req.body;
    const questionId = req.params.id;

    const question = await Question.findByPk(questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    let isCorrect = false;
    let correctAnswer = null;
    let explanation = question.explanation;

    if (question.question_type === 'mcq') {
      // For MCQ, check if submitted option ID is correct
      const selectedOption = await McqOption.findByPk(submitted_answer);
      const correctOption = await McqOption.findOne({
        where: { question_id: questionId, is_correct: true }
      });
      
      isCorrect = selectedOption && selectedOption.is_correct;
      correctAnswer = correctOption ? correctOption.option_text : null;
    } else if (question.question_type === 'fill_in_blank') {
      // For fill-in-blank, check against stored answers
      const correctAnswers = await FillBlankAnswer.findAll({
        where: { question_id: questionId }
      });
      
      // Check if submitted answer matches any correct answer
      for (const answer of correctAnswers) {
        let match = false;
        
        if (answer.accepts_partial_match) {
          // Partial match logic
          if (answer.is_case_sensitive) {
            match = answer.correct_answer.includes(submitted_answer) || 
                   submitted_answer.includes(answer.correct_answer);
          } else {
            match = answer.correct_answer.toLowerCase().includes(submitted_answer.toLowerCase()) ||
                   submitted_answer.toLowerCase().includes(answer.correct_answer.toLowerCase());
          }
        } else {
          // Exact match logic
          if (answer.is_case_sensitive) {
            match = answer.correct_answer === submitted_answer;
          } else {
            match = answer.correct_answer.toLowerCase() === submitted_answer.toLowerCase();
          }
        }
        
        if (match) {
          isCorrect = true;
          break;
        }
      }
      
      // Get all correct answers for display
      correctAnswer = correctAnswers.map(a => a.correct_answer).join(' OR ');
    }

    // Save user's answer
    const userAnswer = await UserAnswer.create({
      user_id,
      question_id: questionId,
      submitted_answer,
      is_correct: isCorrect,
      time_taken
    });

    res.json({
      correct: isCorrect,
      explanation: explanation,
      correct_answer: correctAnswer,
      user_answer: userAnswer
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update a question
router.put('/:id', async (req, res) => {
  try {
    const question = await Question.findByPk(req.params.id);
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    await question.update(req.body);
    res.json(question);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a question
router.delete('/:id', async (req, res) => {
  try {
    const question = await Question.findByPk(req.params.id);
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    await question.destroy();
    res.json({ message: `Question ${req.params.id} deleted successfully` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete all questions
router.delete('/', async (req, res) => {
  try {
    const deletedCount = await Question.destroy({
      where: {},
      truncate: true
    });
    res.json({ message: `All questions deleted. Count: ${deletedCount}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;