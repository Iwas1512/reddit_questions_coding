const express = require('express');
const { Op } = require('sequelize');
const sequelize = require('../db');
const router = express.Router();
const { Tag, Question, QuestionTag, User } = require('../associations/associations');

// Get all tags
router.get('/', async (req, res) => {
  try {
    const tags = await Tag.findAll({
      include: [{
        model: Question,
        as: 'questions',
        attributes: ['question_id'],
        through: { attributes: [] }
      }],
      order: [['tag_name', 'ASC']]
    });
    
    // Add question count to each tag
    const tagsWithCount = tags.map(tag => ({
      ...tag.toJSON(),
      question_count: tag.questions ? tag.questions.length : 0
    }));
    
    res.json(tagsWithCount);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// Get tag by ID with questions
router.get('/:id', async (req, res) => {
  try {
    const tag = await Tag.findByPk(req.params.id, {
      include: [{
        model: Question,
        as: 'questions',
        include: [
          { model: User, as: 'author', attributes: ['user_id', 'username'] }
        ]
      }]
    });
    
    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    
    res.json(tag);
  } catch (error) {
    console.error('Error fetching tag:', error);
    res.status(500).json({ error: 'Failed to fetch tag' });
  }
});

// Create new tag
router.post('/', async (req, res) => {
  try {
    const { tag_name, description, color_code } = req.body;
    
    if (!tag_name) {
      return res.status(400).json({ error: 'Tag name is required' });
    }
    
    // Check if tag already exists (case-insensitive)
    const existingTag = await Tag.findOne({ 
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('tag_name')),
        sequelize.fn('LOWER', tag_name)
      )
    });
    if (existingTag) {
      return res.status(409).json({ 
        error: 'Tag with this name already exists',
        existing_tag: existingTag.tag_name 
      });
    }
    
    const tag = await Tag.create({
      tag_name,
      description,
      color_code
    });
    
    res.status(201).json(tag);
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// Update tag
router.put('/:id', async (req, res) => {
  try {
    const { tag_name, description, color_code } = req.body;
    
    const tag = await Tag.findByPk(req.params.id);
    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    
    // Check if new tag name conflicts with existing tag (excluding current tag, case-insensitive)
    if (tag_name && tag_name.toLowerCase() !== tag.tag_name.toLowerCase()) {
      const existingTag = await Tag.findOne({ 
        where: { 
          [Op.and]: [
            sequelize.where(
              sequelize.fn('LOWER', sequelize.col('tag_name')),
              sequelize.fn('LOWER', tag_name)
            ),
            { tag_id: { [Op.ne]: req.params.id } }
          ]
        }
      });
      if (existingTag) {
        return res.status(409).json({ 
          error: 'Tag with this name already exists',
          existing_tag: existingTag.tag_name 
        });
      }
    }
    
    await tag.update({
      tag_name: tag_name || tag.tag_name,
      description: description !== undefined ? description : tag.description,
      color_code: color_code !== undefined ? color_code : tag.color_code
    });
    
    res.json(tag);
  } catch (error) {
    console.error('Error updating tag:', error);
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

// Delete tag
router.delete('/:id', async (req, res) => {
  try {
    const tag = await Tag.findByPk(req.params.id);
    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    
    await tag.destroy();
    res.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

// Add tag to question
router.post('/question/:questionId/tag/:tagId', async (req, res) => {
  try {
    const { questionId, tagId } = req.params;
    
    // Check if question and tag exist
    const question = await Question.findByPk(questionId);
    const tag = await Tag.findByPk(tagId);
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    
    // Check if association already exists
    const existingAssociation = await QuestionTag.findOne({
      where: { question_id: questionId, tag_id: tagId }
    });
    
    if (existingAssociation) {
      return res.status(409).json({ error: 'Question already has this tag' });
    }
    
    await QuestionTag.create({
      question_id: questionId,
      tag_id: tagId
    });
    
    res.status(201).json({ message: 'Tag added to question successfully' });
  } catch (error) {
    console.error('Error adding tag to question:', error);
    res.status(500).json({ error: 'Failed to add tag to question' });
  }
});

// Remove tag from question
router.delete('/question/:questionId/tag/:tagId', async (req, res) => {
  try {
    const { questionId, tagId } = req.params;
    
    const association = await QuestionTag.findOne({
      where: { question_id: questionId, tag_id: tagId }
    });
    
    if (!association) {
      return res.status(404).json({ error: 'Tag association not found' });
    }
    
    await association.destroy();
    res.json({ message: 'Tag removed from question successfully' });
  } catch (error) {
    console.error('Error removing tag from question:', error);
    res.status(500).json({ error: 'Failed to remove tag from question' });
  }
});

// Search tags by name
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    const tags = await Tag.findAll({
      where: {
        tag_name: {
          [Op.iLike]: `%${query}%`
        }
      },
      limit,
      order: [['tag_name', 'ASC']]
    });
    
    res.json(tags);
  } catch (error) {
    console.error('Error searching tags:', error);
    res.status(500).json({ error: 'Failed to search tags' });
  }
});

// Seed initial tags
router.post('/seed', async (req, res) => {
  try {
    const defaultTags = [
      { tag_name: 'JavaScript', description: 'JavaScript programming language', color_code: '#F7DF1E' },
      { tag_name: 'Python', description: 'Python programming language', color_code: '#3776AB' },
      { tag_name: 'React', description: 'React JavaScript library', color_code: '#61DAFB' },
      { tag_name: 'Node.js', description: 'Node.js runtime environment', color_code: '#339933' },
      { tag_name: 'HTML', description: 'HyperText Markup Language', color_code: '#E34F26' },
      { tag_name: 'CSS', description: 'Cascading Style Sheets', color_code: '#1572B6' },
      { tag_name: 'SQL', description: 'Structured Query Language', color_code: '#4479A1' },
      { tag_name: 'Algorithms', description: 'Algorithm design and analysis', color_code: '#FF6B6B' },
      { tag_name: 'Data Structures', description: 'Data structure concepts', color_code: '#4ECDC4' },
      { tag_name: 'Web Development', description: 'Web development concepts', color_code: '#45B7D1' },
      { tag_name: 'Backend', description: 'Backend development', color_code: '#96CEB4' },
      { tag_name: 'Frontend', description: 'Frontend development', color_code: '#FFEAA7' },
      { tag_name: 'Database', description: 'Database concepts', color_code: '#DDA0DD' },
      { tag_name: 'API', description: 'Application Programming Interface', color_code: '#98D8C8' },
      { tag_name: 'Testing', description: 'Software testing concepts', color_code: '#F7DC6F' }
    ];

    const createdTags = [];
    for (const tagData of defaultTags) {
      const existingTag = await Tag.findOne({ 
        where: sequelize.where(
          sequelize.fn('LOWER', sequelize.col('tag_name')),
          sequelize.fn('LOWER', tagData.tag_name)
        )
      });
      if (!existingTag) {
        const tag = await Tag.create(tagData);
        createdTags.push(tag);
      }
    }

    res.json({ 
      message: `Seeded ${createdTags.length} new tags`,
      tags: createdTags 
    });
  } catch (error) {
    console.error('Error seeding tags:', error);
    res.status(500).json({ error: 'Failed to seed tags' });
  }
});

module.exports = router; 