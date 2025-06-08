const express = require('express');
const router = express.Router();
const { Question, User, McqOption, FillBlankAnswer, UserAnswer, Tag, sequelize } = require('../associations/associations.js');
const ReputationService = require('../services/reputationService');
const { Op } = require('sequelize');

// Create a new question with options/answers
router.post('/', async (req, res) => {
  const transaction = await Question.sequelize.transaction();
  
  try {
    const { mcqOptions, fillBlankAnswers, ...questionData } = req.body;
    
    console.log('Creating question with data:', questionData);
    
    // Verify the author exists before creating the question
    if (questionData.author_id) {
      const author = await User.findByPk(questionData.author_id);
      if (!author) {
        await transaction.rollback();
        return res.status(400).json({ error: `Author with ID ${questionData.author_id} does not exist` });
      }
      console.log('Author verified:', author.username);
      
      // Check if user has question vouchers available
      if (author.question_vouchers <= 0) {
        await transaction.rollback();
        return res.status(403).json({ 
          error: 'No question vouchers available. Answer more questions or get upvotes to earn vouchers!',
          current_vouchers: author.question_vouchers,
          reputation_score: author.reputation_score
        });
      }
    }
    
    // Create the question first
    const question = await Question.create(questionData, { transaction });
    
    // Deduct a question voucher if author exists
    if (questionData.author_id) {
      await ReputationService.useQuestionVoucher(questionData.author_id);
    }
    
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
    
    const { 
      tag: tagFilter, 
      tags, 
      verified, 
      sortBy = 'newest', 
      search, 
      author, 
      author_id, 
      id,
      sort
    } = req.query;
    
    const verifiedOnly = verified === 'true';
    
    let whereClause = {};
    let includeClause = [
      {
        model: User,
        as: 'author',
        attributes: ['user_id', 'username', 'first_name', 'last_name']
      },
      {
        model: Tag,
        as: 'tags',
        attributes: ['tag_id', 'tag_name', 'color_code'],
        through: { attributes: [] }
      }
    ];

    // Handle verified filter
    if (verifiedOnly) {
      whereClause.is_verified = true;
    }

    // Handle specific question ID search
    if (id) {
      whereClause.question_id = id;
    }

    // Handle author ID filter
    if (author_id) {
      whereClause.author_id = author_id;
    }

    // Handle author username search
    if (author) {
      includeClause[0].where = {
        username: { [Op.iLike]: `%${author}%` }
      };
      includeClause[0].required = true;
    }

    // Handle general text search (title, question_text)
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { question_text: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Handle tag filtering - support both 'tag' and 'tags' parameters
    const tagFilterValue = tagFilter || tags;
    if (tagFilterValue) {
      let tagNames;
      if (Array.isArray(tagFilterValue)) {
        tagNames = tagFilterValue;
      } else {
        tagNames = tagFilterValue.split(',').map(tag => tag.trim()).filter(tag => tag);
      }
      
      if (tagNames.length > 0) {
        includeClause[1].where = {
          tag_name: {
            [Op.in]: tagNames
          }
        };
        includeClause[1].required = true;
      }
    }

    // Determine order based on sortBy or sort parameter
    const sortParam = sortBy || sort || 'newest';
    let orderClause;
    switch (sortParam) {
      case 'popular':
        // Sort by combination of upvotes and views (hot/popular)
        orderClause = [
          [sequelize.literal('(upvote_count + view_count)'), 'DESC'],
          ['created_at', 'DESC']
        ];
        break;
      case 'upvotes':
        // Sort by upvotes (top)
        orderClause = [
          ['upvote_count', 'DESC'],
          ['created_at', 'DESC']
        ];
        break;
      case 'newest':
      default:
        // Sort by creation date (newest)
        orderClause = [['created_at', 'DESC']];
        break;
    }

    const { count, rows: questions } = await Question.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: orderClause,
      include: includeClause,
      distinct: true
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
        },
        {
          model: Tag,
          as: 'tags',
          attributes: ['tag_id', 'tag_name', 'color_code'],
          through: { attributes: [] }
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
        },
        {
          model: Tag,
          as: 'tags',
          attributes: ['tag_id', 'tag_name', 'color_code'],
          through: { attributes: [] }
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

    // Check if user has already answered this question correctly
    const existingAnswer = await UserAnswer.findOne({
      where: { user_id, question_id: questionId, is_correct: true }
    });

    let isCorrect = false;
    let correctAnswer = null;
    let userAnswerText = submitted_answer;
    let explanation = question.explanation;

    if (question.question_type === 'mcq') {
      const selectedOption = await McqOption.findByPk(submitted_answer);
      const correctOption = await McqOption.findOne({
        where: { question_id: questionId, is_correct: true }
      });
      
      isCorrect = selectedOption && selectedOption.is_correct;
      correctAnswer = correctOption ? correctOption.option_text : null;
      userAnswerText = selectedOption ? selectedOption.option_text : submitted_answer;
    } else if (question.question_type === 'fill_in_blank') {
      const correctAnswers = await FillBlankAnswer.findAll({
        where: { question_id: questionId }
      });
      
      for (const answer of correctAnswers) {
        let match = false;
        
        if (answer.accepts_partial_match) {
          if (answer.is_case_sensitive) {
            match = answer.correct_answer.includes(submitted_answer) || 
                   submitted_answer.includes(answer.correct_answer);
          } else {
            match = answer.correct_answer.toLowerCase().includes(submitted_answer.toLowerCase()) ||
                   submitted_answer.toLowerCase().includes(answer.correct_answer.toLowerCase());
          }
        } else {
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
      
      correctAnswer = correctAnswers.map(a => a.correct_answer).join(' OR ');
      userAnswerText = submitted_answer;
    }

    const userAnswer = await UserAnswer.create({
      user_id,
      question_id: questionId,
      submitted_answer,
      is_correct: isCorrect,
      time_taken
    });

    // Award reputation points for correct answers (only if first correct answer)
    if (isCorrect && !existingAnswer) {
      try {
        const reputationResult = await ReputationService.awardQuestionAnswered(user_id, questionId);
        
        res.json({
          correct: isCorrect,
          explanation: explanation,
          correct_answer: correctAnswer,
          user_answer: userAnswerText,
          reputation_earned: {
            points: 1,
            new_reputation: reputationResult.newReputation,
            vouchers_earned: reputationResult.vouchersEarned,
            current_vouchers: reputationResult.currentVouchers
          }
        });
      } catch (reputationError) {
        console.error('Failed to award reputation:', reputationError);
        res.json({
          correct: isCorrect,
          explanation: explanation,
          correct_answer: correctAnswer,
          user_answer: userAnswerText
        });
      }
    } else {
      res.json({
        correct: isCorrect,
        explanation: explanation,
        correct_answer: correctAnswer,
        user_answer: userAnswerText
      });
    }
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

// Increment view count for a question (separate endpoint for when expanding in feed)
router.post('/:id/view', async (req, res) => {
  try {
    const question = await Question.findByPk(req.params.id);
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Increment view count
    await question.increment('view_count');
    
    res.json({ 
      success: true, 
      view_count: question.view_count + 1 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin route: Manually verify a question
router.post('/:id/verify', async (req, res) => {
  try {
    const { adminUserId } = req.body;
    
    // Check if the requesting user is an admin
    const admin = await User.findByPk(adminUserId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const question = await Question.findByPk(req.params.id);
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    if (question.is_verified) {
      return res.status(400).json({ error: 'Question is already verified' });
    }

    question.is_verified = true;
    await question.save();
    
    console.log(`Question ${req.params.id} manually verified by admin ${adminUserId}`);
    
    res.json({ 
      success: true, 
      message: 'Question verified successfully',
      question: question 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin route: Manually unverify a question
router.post('/:id/unverify', async (req, res) => {
  try {
    const { adminUserId } = req.body;
    
    // Check if the requesting user is an admin
    const admin = await User.findByPk(adminUserId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const question = await Question.findByPk(req.params.id);
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    if (!question.is_verified) {
      return res.status(400).json({ error: 'Question is not verified' });
    }

    question.is_verified = false;
    await question.save();
    
    console.log(`Question ${req.params.id} manually unverified by admin ${adminUserId}`);
    
    res.json({ 
      success: true, 
      message: 'Question unverified successfully',
      question: question 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;