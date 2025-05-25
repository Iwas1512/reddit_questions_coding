const express = require('express');
const router = express.Router();
const { User } = require('../associations/associations.js');

// Create a new user
router.post('/', async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password_hash'] } // Don't send passwords
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a user
router.put('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.update(req.body);
    
    // Return user without password
    const updatedUser = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash'] }
    });
    
    res.json(updatedUser);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a user
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.destroy();
    res.json({ message: `User ${req.params.id} deleted successfully` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete all users
router.delete('/', async (req, res) => {
  try {
    const deletedCount = await User.destroy({
      where: {},
      truncate: true
    });
    res.json({ message: `All users deleted. Count: ${deletedCount}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;