const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const ProblemSet = require('../models/ProblemSet');
const Question = require('../models/Question');
const Tag = require('../models/Tag');
const User = require('../models/User');
const ProblemSetQuestion = require('../models/ProblemSetQuestion');
const ProblemSetTag = require('../models/ProblemSetTag');
const ProblemSetVote = require('../models/ProblemSetVote');
const ReputationHistory = require('../models/ReputationHistory');
const sequelize = require('../db');

// Get all problem sets with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, tag, verified, sortBy = 'newest', search, admin } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = {};
    
    // For admin view, show all problem sets including inactive ones
    if (admin !== 'true') {
      whereClause.is_active = true;
    }
    
    let orderClause = [];
    
    // Handle verified filter
    if (verified !== undefined) {
      whereClause.is_verified = verified === 'true';
    }
    
    // Handle search
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    // Handle sorting
    switch (sortBy) {
      case 'popular':
        orderClause = [
          [sequelize.literal('(upvote_count - downvote_count)'), 'DESC'],
          ['created_at', 'DESC']
        ];
        break;
      case 'upvotes':
        orderClause = [['upvote_count', 'DESC'], ['created_at', 'DESC']];
        break;
      case 'newest':
      default:
        orderClause = [['created_at', 'DESC']];
        break;
    }
    
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
      },
      {
        model: Question,
        as: 'questions',
        attributes: ['question_id', 'title', 'difficulty_level'],
        through: { 
          attributes: ['question_order'],
          as: 'problemSetQuestion'
        }
      }
    ];
    
    // Handle tag filtering
    if (tag) {
      includeClause[1].where = { tag_name: tag };
      includeClause[1].required = true;
    }
    
    const { count, rows: problemSets } = await ProblemSet.findAndCountAll({
      where: whereClause,
      include: includeClause,
      order: orderClause,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      distinct: true,
      col: 'problemset_id'
    });
    
    res.json({
      problemSets,
      pagination: {
        totalCount: count,
        currentPage: parseInt(page, 10),
        totalPages: Math.ceil(count / limit),
        hasNextPage: page * limit < count,
        hasPreviousPage: page > 1,
        limit: parseInt(limit, 10)
      }
    });
  } catch (error) {
    console.error('Error fetching problem sets:', error);
    res.status(500).json({ message: 'Failed to fetch problem sets' });
  }
});

// Get single problem set by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const problemSet = await ProblemSet.findByPk(id, {
      include: [
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
        },
        {
          model: Question,
          as: 'questions',
          attributes: ['question_id', 'title', 'question_text', 'question_type', 'difficulty_level', 'explanation', 'code', 'language'],
          through: { 
            attributes: ['question_order'],
            as: 'problemSetQuestion'
          },
          include: [
            {
              model: require('../models/McqOption'),
              as: 'mcqOptions',
              attributes: ['option_id', 'option_text', 'is_correct', 'option_order']
            },
            {
              model: require('../models/FillBlankAnswer'),
              as: 'fillBlankAnswers',
              attributes: ['answer_id', 'correct_answer', 'is_case_sensitive', 'accepts_partial_match']
            }
          ],
          order: [['problemSetQuestion', 'question_order', 'ASC']]
        }
      ]
    });
    
    if (!problemSet) {
      return res.status(404).json({ message: 'Problem set not found' });
    }
    
    res.json(problemSet);
  } catch (error) {
    console.error('Error fetching problem set:', error);
    res.status(500).json({ message: 'Failed to fetch problem set' });
  }
});

// Create new problem set
router.post('/', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { title, description, difficulty_level, author_id, question_ids, tag_ids } = req.body;
    
    // Validate minimum questions requirement
    if (!question_ids || question_ids.length < 2) {
      return res.status(400).json({ message: 'Problem set must contain at least 2 questions' });
    }
    
    // Check user vouchers
    const user = await User.findByPk(author_id);
    if (!user || user.question_vouchers < 1) {
      return res.status(400).json({ message: 'Insufficient vouchers to create problem set' });
    }
    
    // Verify all questions exist and are active
    const questions = await Question.findAll({
      where: {
        question_id: { [Op.in]: question_ids },
        is_active: true
      }
    });
    
    if (questions.length !== question_ids.length) {
      return res.status(400).json({ message: 'One or more questions not found or inactive' });
    }
    
    // Create problem set
    const problemSet = await ProblemSet.create({
      title,
      description,
      difficulty_level,
      author_id,
      question_count: question_ids.length
    }, { transaction });
    
    // Add questions to problem set
    const problemSetQuestions = question_ids.map((questionId, index) => ({
      problemset_id: problemSet.problemset_id,
      question_id: questionId,
      question_order: index + 1
    }));
    
    await ProblemSetQuestion.bulkCreate(problemSetQuestions, { transaction });
    
    // Add tags if provided
    if (tag_ids && tag_ids.length > 0) {
      const problemSetTags = tag_ids.map(tagId => ({
        problemset_id: problemSet.problemset_id,
        tag_id: tagId
      }));
      
      await ProblemSetTag.bulkCreate(problemSetTags, { transaction });
    }
    
    // Deduct voucher from user
    await user.update({ 
      question_vouchers: user.question_vouchers - 1 
    }, { transaction });
    
    await transaction.commit();
    
    // Fetch complete problem set with associations
    const completeProblemSet = await ProblemSet.findByPk(problemSet.problemset_id, {
      include: [
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
        },
        {
          model: Question,
          as: 'questions',
          attributes: ['question_id', 'title', 'difficulty_level'],
          through: { attributes: ['question_order'] }
        }
      ]
    });
    
    res.status(201).json(completeProblemSet);
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating problem set:', error);
    res.status(500).json({ message: 'Failed to create problem set' });
  }
});

// Update problem set
router.put('/:id', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { title, description, difficulty_level, question_ids, tag_ids } = req.body;
    
    const problemSet = await ProblemSet.findByPk(id);
    if (!problemSet) {
      return res.status(404).json({ message: 'Problem set not found' });
    }
    
    // Update basic fields
    await problemSet.update({
      title: title || problemSet.title,
      description: description !== undefined ? description : problemSet.description,
      difficulty_level: difficulty_level || problemSet.difficulty_level,
      question_count: question_ids ? question_ids.length : problemSet.question_count
    }, { transaction });
    
    // Update questions if provided
    if (question_ids && question_ids.length >= 2) {
      // Remove existing questions
      await ProblemSetQuestion.destroy({
        where: { problemset_id: id },
        transaction
      });
      
      // Add new questions
      const problemSetQuestions = question_ids.map((questionId, index) => ({
        problemset_id: id,
        question_id: questionId,
        question_order: index + 1
      }));
      
      await ProblemSetQuestion.bulkCreate(problemSetQuestions, { transaction });
    }
    
    // Update tags if provided
    if (tag_ids !== undefined) {
      // Remove existing tags
      await ProblemSetTag.destroy({
        where: { problemset_id: id },
        transaction
      });
      
      // Add new tags
      if (tag_ids.length > 0) {
        const problemSetTags = tag_ids.map(tagId => ({
          problemset_id: id,
          tag_id: tagId
        }));
        
        await ProblemSetTag.bulkCreate(problemSetTags, { transaction });
      }
    }
    
    await transaction.commit();
    
    // Fetch updated problem set
    const updatedProblemSet = await ProblemSet.findByPk(id, {
      include: [
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
        },
        {
          model: Question,
          as: 'questions',
          attributes: ['question_id', 'title', 'difficulty_level'],
          through: { attributes: ['question_order'] }
        }
      ]
    });
    
    res.json(updatedProblemSet);
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating problem set:', error);
    res.status(500).json({ message: 'Failed to update problem set' });
  }
});

// Delete problem set
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const problemSet = await ProblemSet.findByPk(id);
    if (!problemSet) {
      return res.status(404).json({ message: 'Problem set not found' });
    }
    
    await problemSet.update({ is_active: false });
    
    res.json({ message: 'Problem set deleted successfully' });
  } catch (error) {
    console.error('Error deleting problem set:', error);
    res.status(500).json({ message: 'Failed to delete problem set' });
  }
});

// Increment view count
router.post('/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    
    const problemSet = await ProblemSet.findByPk(id);
    if (!problemSet) {
      return res.status(404).json({ message: 'Problem set not found' });
    }
    
    await problemSet.increment('view_count');
    
    res.json({ view_count: problemSet.view_count + 1 });
  } catch (error) {
    console.error('Error incrementing view count:', error);
    res.status(500).json({ message: 'Failed to increment view count' });
  }
});

// Verify problem set (admin only)
router.post('/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { adminUserId } = req.body;
    
    const problemSet = await ProblemSet.findByPk(id, {
      include: [
        { model: User, as: 'author', attributes: ['user_id', 'username'] }
      ]
    });
    
    if (!problemSet) {
      return res.status(404).json({ message: 'Problem set not found' });
    }
    
    if (problemSet.is_verified) {
      return res.status(400).json({ message: 'Problem set is already verified' });
    }
    
    // Update problem set to verified
    await problemSet.update({ 
      is_verified: true,
      verified_by: adminUserId,
      verified_at: new Date()
    });
    
    // Give reputation point to the author
    if (problemSet.author_id !== adminUserId) {
      const author = await User.findByPk(problemSet.author_id);
      if (author) {
        await author.increment('reputation_score', { by: 1 });
        
        // Log reputation history
        await ReputationHistory.create({
          user_id: problemSet.author_id,
          action: 'problem_set_verified',
          points_earned: 1,
          details: `Problem set "${problemSet.title}" was verified`,
          related_id: problemSet.problemset_id,
          related_type: 'problem_set'
        });
      }
    }
    
    res.json({ 
      message: 'Problem set verified successfully',
      problemSet: await ProblemSet.findByPk(id, {
        include: [
          { model: User, as: 'author', attributes: ['user_id', 'username', 'first_name', 'last_name'] },
          { model: Tag, as: 'tags', attributes: ['tag_id', 'tag_name', 'color_code'], through: { attributes: [] } }
        ]
      })
    });
  } catch (error) {
    console.error('Error verifying problem set:', error);
    res.status(500).json({ message: 'Failed to verify problem set' });
  }
});

// Unverify problem set (admin only)
router.post('/:id/unverify', async (req, res) => {
  try {
    const { id } = req.params;
    const { adminUserId } = req.body;
    
    const problemSet = await ProblemSet.findByPk(id, {
      include: [
        { model: User, as: 'author', attributes: ['user_id', 'username'] }
      ]
    });
    
    if (!problemSet) {
      return res.status(404).json({ message: 'Problem set not found' });
    }
    
    if (!problemSet.is_verified) {
      return res.status(400).json({ message: 'Problem set is not verified' });
    }
    
    // Update problem set to unverified
    await problemSet.update({ 
      is_verified: false,
      verified_by: null,
      verified_at: null
    });
    
    // Remove reputation point from the author (if they got one for this verification)
    if (problemSet.author_id !== adminUserId) {
      const author = await User.findByPk(problemSet.author_id);
      if (author && author.reputation_score > 0) {
        await author.decrement('reputation_score', { by: 1 });
        
        // Log reputation history
        await ReputationHistory.create({
          user_id: problemSet.author_id,
          action: 'problem_set_unverified',
          points_earned: -1,
          details: `Problem set "${problemSet.title}" was unverified`,
          related_id: problemSet.problemset_id,
          related_type: 'problem_set'
        });
      }
    }
    
    res.json({ 
      message: 'Problem set unverified successfully',
      problemSet: await ProblemSet.findByPk(id, {
        include: [
          { model: User, as: 'author', attributes: ['user_id', 'username', 'first_name', 'last_name'] },
          { model: Tag, as: 'tags', attributes: ['tag_id', 'tag_name', 'color_code'], through: { attributes: [] } }
        ]
      })
    });
  } catch (error) {
    console.error('Error unverifying problem set:', error);
    res.status(500).json({ message: 'Failed to unverify problem set' });
  }
});

module.exports = router; 