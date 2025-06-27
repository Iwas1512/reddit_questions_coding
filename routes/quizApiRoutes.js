const express = require('express');
const router = express.Router();
const QuizApiService = require('../services/quizApiService');
const { Question, User, McqOption, Tag, UserAnswer } = require('../associations/associations.js');
const ReputationService = require('../services/reputationService');
const { Op } = require('sequelize');

// Middleware to check if user is admin - using the same pattern as other routes
const requireAdmin = async (req, res, next) => {
  try {
    // Get user ID from query params, body, or headers (same pattern as other routes)
    const userId = req.query.userId || req.body.userId || req.headers['user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const user = await User.findByPk(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Add user to request for later use
    req.user = user;
    next();
  } catch (error) {
    console.error('Error checking admin status:', error);
    res.status(500).json({ error: 'Error checking admin status' });
  }
};

// Get available categories and difficulty levels (no auth required)
router.get('/categories', async (req, res) => {
  try {
    const categories = await QuizApiService.getCategories();
    const difficulties = QuizApiService.getDifficultyLevels();
    
    res.json({
      categories,
      difficulties
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Fetch questions from QuizAPI (preview only)
router.get('/preview', requireAdmin, async (req, res) => {
  try {
    const { limit = 5, category, difficulty, tags } = req.query;
    
    const questions = await QuizApiService.fetchQuestions({
      limit: parseInt(limit),
      category,
      difficulty,
      tags
    });

    // Convert to your app's format for preview
    const convertedQuestions = questions.map(q => 
      QuizApiService.convertQuestionFormat(q, req.user.user_id)
    );

    res.json({
      questions: convertedQuestions,
      total: questions.length
    });
  } catch (error) {
    console.error('Error fetching questions from QuizAPI:', error);
    res.status(500).json({ 
      error: 'Failed to fetch questions from QuizAPI',
      details: error.message 
    });
  }
});

// Import questions from QuizAPI to your database
router.post('/import', requireAdmin, async (req, res) => {
  const transaction = await Question.sequelize.transaction();
  
  try {
    const { limit = 10, category, difficulty, tags, autoVerify = false } = req.body;
    const authorId = req.user.user_id;

    // For admins, we don't check vouchers - imports are free
    console.log(`Admin ${req.user.username} importing ${limit} questions for free`);

    // Fetch questions from QuizAPI
    const quizApiQuestions = await QuizApiService.fetchQuestions({
      limit: parseInt(limit),
      category,
      difficulty,
      tags
    });

    console.log(`Fetched ${quizApiQuestions.length} questions from QuizAPI`);

    const importedQuestions = [];
    const errors = [];

    for (const quizApiQuestion of quizApiQuestions) {
      try {
        // Check if question already exists (by external_id)
        const existingQuestion = await Question.findOne({
          where: { 
            external_id: quizApiQuestion.id.toString(),
            source: 'quizapi'
          },
          transaction
        });

        if (existingQuestion) {
          errors.push(`Question "${quizApiQuestion.question}" already exists`);
          continue;
        }

        // Convert to your app's format
        const questionData = QuizApiService.convertQuestionFormat(quizApiQuestion, authorId);
        
        // Create the question
        const question = await Question.create({
          ...questionData,
          is_verified: autoVerify,
          is_active: true
        }, { transaction });

        console.log(`Created question: ${question.title}`);

        // Create MCQ options
        if (questionData.mcqOptions && questionData.mcqOptions.length > 0) {
          for (let i = 0; i < questionData.mcqOptions.length; i++) {
            await McqOption.create({
              question_id: question.question_id,
              option_text: questionData.mcqOptions[i].option_text,
              is_correct: questionData.mcqOptions[i].is_correct,
              option_order: i + 1
            }, { transaction });
          }
        }

        // Handle tags
        if (questionData.tags && questionData.tags.length > 0) {
          for (const tagName of questionData.tags) {
            let tag = await Tag.findOne({
              where: { tag_name: { [Op.iLike]: tagName } },
              transaction
            });

            if (!tag) {
              tag = await Tag.create({
                tag_name: tagName.toLowerCase(),
                description: `Auto-generated from QuizAPI`,
                color_code: '#3B82F6' // Default blue color
              }, { transaction });
            }

            await question.addTag(tag, { transaction });
          }
        }

        importedQuestions.push({
          question_id: question.question_id,
          title: question.title,
          category: quizApiQuestion.category,
          difficulty: quizApiQuestion.difficulty
        });

        // No voucher deduction for admins

      } catch (error) {
        console.error('Error importing question:', error);
        errors.push(`Failed to import "${quizApiQuestion.question}": ${error.message}`);
      }
    }

    await transaction.commit();

    console.log(`Import completed: ${importedQuestions.length} imported, ${errors.length} errors`);

    res.json({
      success: true,
      imported: importedQuestions.length,
      errors: errors,
      total_questions: quizApiQuestions.length,
      remaining_vouchers: req.user.question_vouchers, // No change for admins
      message: `Successfully imported ${importedQuestions.length} questions for free (admin import)`
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error importing questions:', error);
    res.status(500).json({ 
      error: 'Failed to import questions',
      details: error.message 
    });
  }
});

// Get import statistics
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const totalImported = await Question.count({
      where: { source: 'quizapi' }
    });

    const importedByCategory = await Question.findAll({
      where: { source: 'quizapi' },
      include: [{
        model: Tag,
        as: 'tags',
        attributes: ['tag_name']
      }],
      attributes: ['question_id', 'difficulty_level', 'created_at']
    });

    const stats = {
      total_imported: totalImported,
      by_difficulty: {
        easy: importedByCategory.filter(q => q.difficulty_level === 'easy').length,
        medium: importedByCategory.filter(q => q.difficulty_level === 'medium').length,
        hard: importedByCategory.filter(q => q.difficulty_level === 'hard').length
      },
      by_month: {}
    };

    // Group by month
    importedByCategory.forEach(question => {
      const month = new Date(question.created_at).toISOString().slice(0, 7); // YYYY-MM
      stats.by_month[month] = (stats.by_month[month] || 0) + 1;
    });

    res.json(stats);
  } catch (error) {
    console.error('Error fetching import stats:', error);
    res.status(500).json({ error: 'Failed to fetch import statistics' });
  }
});

module.exports = router; 