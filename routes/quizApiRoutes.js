const express = require('express');
const router = express.Router();
const QuizApiService = require('../services/quizApiService');
const AICategorizationService = require('../services/aiCategorizationService');
const { Question, User, McqOption, Tag, UserAnswer, ProblemSet, ProblemSetQuestion, ProblemSetTag } = require('../associations/associations.js');
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
    
    const recentImports = await Question.findAll({
      where: { source: 'quizapi' },
      order: [['created_at', 'DESC']],
      limit: 10,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['username']
        }
      ]
    });

    res.json({
      totalImported,
      recentImports
    });
  } catch (error) {
    console.error('Error fetching import stats:', error);
    res.status(500).json({ error: 'Failed to fetch import statistics' });
  }
});

// AI-powered question categorization
router.post('/categorize', requireAdmin, async (req, res) => {
  try {
    const { limit = 10, category, difficulty, tags, aiProvider = 'openai' } = req.body;
    
    // Fetch questions from QuizAPI
    const quizApiQuestions = await QuizApiService.fetchQuestions({
      limit: parseInt(limit),
      category,
      difficulty,
      tags
    });

    // Convert to your app's format
    const convertedQuestions = quizApiQuestions.map(q => 
      QuizApiService.convertQuestionFormat(q, req.user.user_id)
    );

    // Use AI to categorize questions
    const categorizedQuestions = await AICategorizationService.categorizeQuestionsWithAI(
      convertedQuestions, 
      aiProvider
    );

    res.json({
      success: true,
      categories: categorizedQuestions,
      totalQuestions: convertedQuestions.length,
      aiProvider
    });

  } catch (error) {
    console.error('Error categorizing questions with AI:', error);
    res.status(500).json({ 
      error: 'Failed to categorize questions',
      details: error.message 
    });
  }
});

// Import questions directly into a problem set with AI categorization
router.post('/import-to-set', requireAdmin, async (req, res) => {
  const transaction = await Question.sequelize.transaction();
  
  try {
    const { 
      limit = 10, 
      category, 
      difficulty, 
      tags, 
      autoVerify = false,
      aiProvider = 'openai',
      createMultipleSets = false // If true, creates separate sets for each category
    } = req.body;
    
    const authorId = req.user.user_id;

    // Fetch questions from QuizAPI
    const quizApiQuestions = await QuizApiService.fetchQuestions({
      limit: parseInt(limit),
      category,
      difficulty,
      tags
    });

    // Convert to your app's format
    const convertedQuestions = quizApiQuestions.map(q => 
      QuizApiService.convertQuestionFormat(q, authorId)
    );

    let problemSets = [];

    if (createMultipleSets) {
      // Create separate problem sets for each AI-categorized group
      const categorizedQuestions = await AICategorizationService.categorizeQuestionsWithAI(
        convertedQuestions, 
        aiProvider
      );

             for (const [categoryKey, categoryData] of Object.entries(categorizedQuestions)) {
         const problemSet = await createProblemSetFromCategory(
           categoryData, 
           authorId, 
           autoVerify, 
           transaction
         );
         problemSets.push(problemSet);
       }
    } else {
             // Create a single problem set with all questions
       const problemSet = await createProblemSetFromQuestions(
         convertedQuestions, 
         authorId, 
         autoVerify, 
         aiProvider,
         transaction
       );
      problemSets.push(problemSet);
    }

    await transaction.commit();

    res.json({
      success: true,
      problemSets,
      totalQuestions: convertedQuestions.length,
      message: `Successfully created ${problemSets.length} problem set(s) with ${convertedQuestions.length} questions`
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error importing questions to problem set:', error);
    res.status(500).json({ 
      error: 'Failed to import questions to problem set',
      details: error.message 
    });
  }
});

// Helper method to create problem set from AI-categorized questions
async function createProblemSetFromCategory(categoryData, authorId, autoVerify, transaction) {
  // Get AI suggestion for problem set details
  const suggestion = await AICategorizationService.suggestProblemSetDetails(
    categoryData.questions, 
    'openai'
  );

  // Create the problem set
  const problemSet = await ProblemSet.create({
    title: suggestion.title || categoryData.title,
    description: suggestion.description || categoryData.description,
    difficulty_level: mapDifficultyToEnum(suggestion.difficulty || categoryData.difficulty),
    author_id: authorId,
    is_verified: autoVerify,
    question_count: categoryData.questions.length
  }, { transaction });

  // Import questions and add to problem set
  const importedQuestions = [];
  for (const questionData of categoryData.questions) {
    const question = await importQuestionToDatabase(questionData, authorId, autoVerify, transaction);
    importedQuestions.push(question);
  }

  // Add questions to problem set
  for (let i = 0; i < importedQuestions.length; i++) {
    await ProblemSetQuestion.create({
      problemset_id: problemSet.problemset_id,
      question_id: importedQuestions[i].question_id,
      question_order: i + 1
    }, { transaction });
  }

  // Add suggested tags to problem set
  const allTags = [...(suggestion.tags || []), ...(categoryData.suggestedTags || [])];
  for (const tagName of allTags) {
    let tag = await Tag.findOne({
      where: { tag_name: { [Op.iLike]: tagName } },
      transaction
    });

    if (!tag) {
      tag = await Tag.create({
        tag_name: tagName.toLowerCase(),
        description: `Auto-generated from AI categorization`,
        color_code: '#3B82F6'
      }, { transaction });
    }

    await problemSet.addTag(tag, { transaction });
  }

  return {
    problemset_id: problemSet.problemset_id,
    title: problemSet.title,
    description: problemSet.description,
    question_count: importedQuestions.length,
    questions: importedQuestions.map(q => ({
      question_id: q.question_id,
      title: q.title
    }))
  };
}

// Helper method to create a single problem set from all questions
async function createProblemSetFromQuestions(questions, authorId, autoVerify, aiProvider, transaction) {
  // Get AI suggestion for problem set details
  const suggestion = await AICategorizationService.suggestProblemSetDetails(questions, aiProvider);

  // Create the problem set
  const problemSet = await ProblemSet.create({
    title: suggestion.title || 'Imported Problem Set',
    description: suggestion.description || 'Questions imported from QuizAPI',
    difficulty_level: mapDifficultyToEnum(suggestion.difficulty || 'medium'),
    author_id: authorId,
    is_verified: autoVerify,
    question_count: questions.length
  }, { transaction });

  // Import questions and add to problem set
  const importedQuestions = [];
  for (const questionData of questions) {
    const question = await importQuestionToDatabase(questionData, authorId, autoVerify, transaction);
    importedQuestions.push(question);
  }

  // Add questions to problem set
  for (let i = 0; i < importedQuestions.length; i++) {
    await ProblemSetQuestion.create({
      problemset_id: problemSet.problemset_id,
      question_id: importedQuestions[i].question_id,
      question_order: i + 1
    }, { transaction });
  }

  // Add suggested tags to problem set
  for (const tagName of suggestion.tags || []) {
    let tag = await Tag.findOne({
      where: { tag_name: { [Op.iLike]: tagName } },
      transaction
    });

    if (!tag) {
      tag = await Tag.create({
        tag_name: tagName.toLowerCase(),
        description: `Auto-generated from AI suggestion`,
        color_code: '#3B82F6'
      }, { transaction });
    }

    await problemSet.addTag(tag, { transaction });
  }

  return {
    problemset_id: problemSet.problemset_id,
    title: problemSet.title,
    description: problemSet.description,
    question_count: importedQuestions.length,
    questions: importedQuestions.map(q => ({
      question_id: q.question_id,
      title: q.title
    }))
  };
}

// Helper method to import a single question to database
async function importQuestionToDatabase(questionData, authorId, autoVerify, transaction) {
  // Check if question already exists
  const existingQuestion = await Question.findOne({
    where: { 
      external_id: questionData.external_id,
      source: 'quizapi'
    },
    transaction
  });

  if (existingQuestion) {
    return existingQuestion;
  }

  // Create the question
  const question = await Question.create({
    ...questionData,
    is_verified: autoVerify,
    is_active: true
  }, { transaction });

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
          color_code: '#3B82F6'
        }, { transaction });
      }

      await question.addTag(tag, { transaction });
    }
  }

  return question;
}

// Helper method to map difficulty to enum
function mapDifficultyToEnum(difficulty) {
  const difficultyMap = {
    'beginner': 'easy',
    'intermediate': 'medium',
    'advanced': 'hard',
    'easy': 'easy',
    'medium': 'medium',
    'hard': 'hard'
  };
  return difficultyMap[difficulty.toLowerCase()] || 'medium';
}

// AI Organize existing questions into problem sets
router.post('/ai-organize', requireAdmin, async (req, res) => {
  const transaction = await Question.sequelize.transaction();
  
  try {
    const authorId = req.user.user_id;

    console.log(`AI organizing ALL existing questions for admin ${req.user.username}`);

    // Get ALL existing questions from database (no filters)
    const existingQuestions = await Question.findAll({
      where: {
        is_active: true,
        is_verified: true
      },
      include: [
        {
          model: Tag,
          as: 'tags',
          through: { attributes: [] }
        },
        {
          model: McqOption,
          as: 'mcqOptions'
        }
      ],
      order: [['created_at', 'DESC']]
      // No limit - get ALL questions
    });

    if (existingQuestions.length === 0) {
      return res.status(400).json({
        error: 'No questions found in the database'
      });
    }

    console.log(`Found ${existingQuestions.length} questions to organize`);

    // Convert questions to format expected by AI service
    const questionsForAI = existingQuestions.map(q => ({
      question_id: q.question_id,
      title: q.title,
      question_text: q.question_text,
      difficulty_level: q.difficulty_level,
      tags: q.tags.map(tag => tag.tag_name),
      mcqOptions: q.mcqOptions.map(opt => ({
        option_text: opt.option_text,
        is_correct: opt.is_correct
      }))
    }));

    // Use AI to categorize questions
    const categories = await AICategorizationService.categorizeQuestions(questionsForAI);

    // Create problem sets from categories
    const problemSets = [];
    let totalQuestions = 0;

    for (const [categoryKey, categoryData] of Object.entries(categories)) {
      if (categoryData.questions && categoryData.questions.length > 0) {
        const problemSet = await createProblemSetFromExistingQuestions(
          categoryData, 
          authorId, 
          true, // auto-verify
          transaction
        );
        problemSets.push(problemSet);
        totalQuestions += categoryData.questions.length;
      }
    }

    await transaction.commit();

    console.log(`AI organize completed: ${problemSets.length} problem sets, ${totalQuestions} questions`);

    res.json({
      success: true,
      problemSets: problemSets,
      totalQuestions: totalQuestions,
      message: `Successfully organized ${totalQuestions} questions into ${problemSets.length} problem sets`
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error organizing with AI:', error);
    res.status(500).json({ 
      error: 'Failed to organize questions with AI',
      details: error.message 
    });
  }
});

// Check AI service availability
router.get('/ai-status', requireAdmin, async (req, res) => {
  try {
    const status = AICategorizationService.checkAvailability();
    res.json(status);
  } catch (error) {
    console.error('Error checking AI status:', error);
    res.status(500).json({ error: 'Failed to check AI status' });
  }
});

// Helper method to create problem set from existing questions
async function createProblemSetFromExistingQuestions(categoryData, authorId, autoVerify, transaction) {
  // Get AI suggestion for problem set details
  const suggestion = await AICategorizationService.suggestProblemSetDetails(
    categoryData.questions, 
    'openai'
  );

  // Create the problem set
  const problemSet = await ProblemSet.create({
    title: suggestion.title || categoryData.title,
    description: suggestion.description || categoryData.description,
    difficulty_level: mapDifficultyToEnum(suggestion.difficulty || categoryData.difficulty),
    author_id: authorId,
    is_verified: autoVerify,
    question_count: categoryData.questions.length
  }, { transaction });

  // Add existing questions to problem set (no need to re-import)
  for (let i = 0; i < categoryData.questions.length; i++) {
    await ProblemSetQuestion.create({
      problemset_id: problemSet.problemset_id,
      question_id: categoryData.questions[i].question_id,
      question_order: i + 1
    }, { transaction });
  }

  // Add suggested tags to problem set
  const allTags = [...(suggestion.tags || []), ...(categoryData.suggestedTags || [])];
  for (const tagName of allTags) {
    let tag = await Tag.findOne({
      where: { tag_name: { [Op.iLike]: tagName } },
      transaction
    });

    if (!tag) {
      tag = await Tag.create({
        tag_name: tagName.toLowerCase(),
        description: `Auto-generated from AI organization`,
        color_code: '#3B82F6'
      }, { transaction });
    }

    await problemSet.addTag(tag, { transaction });
  }

  return {
    problemset_id: problemSet.problemset_id,
    title: problemSet.title,
    description: problemSet.description,
    question_count: categoryData.questions.length,
    questions: categoryData.questions.map(q => ({
      question_id: q.question_id,
      title: q.title
    }))
  };
}

module.exports = router; 