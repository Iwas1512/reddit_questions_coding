const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User } = require('../associations/associations.js');
const ReputationService = require('../services/reputationService');
const validator = require('validator');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, first_name, last_name } = req.body;

    // Validate email format
    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({ 
        error: 'Please provide a valid email address' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { username }]
      }
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: 'User with this email or username already exists' 
      });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await User.create({
      username,
      email,
      password_hash,
      first_name,
      last_name
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.user_id, 
        username: user.username,
        email: user.email 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Return user data without password
    const { password_hash: _, ...userWithoutPassword } = user.toJSON();
    
    res.status(201).json({
      message: 'User registered successfully',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.user_id, 
        username: user.username,
        email: user.email 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Return user data without password
    const { password_hash: _, ...userWithoutPassword } = user.toJSON();
    
    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user (protected route)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get reputation details
    try {
      const reputationInfo = await ReputationService.getUserReputation(req.user.userId);
      res.json({
        ...user.toJSON(),
        reputation_details: reputationInfo
      });
    } catch (reputationError) {
      // If reputation service fails, still return user data
      res.json(user);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Logout (client-side will handle token removal)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logout successful' });
});

// OAuth sign-in (creates user if doesn't exist)
router.post('/oauth-signin', async (req, res) => {
  try {
    const { email, username, first_name, last_name, provider, provider_id } = req.body;

    if (!email || !provider) {
      return res.status(400).json({ error: 'Email and provider are required' });
    }

    // Validate email format
    if (!validator.isEmail(email)) {
      return res.status(400).json({ 
        error: 'Please provide a valid email address' 
      });
    }

    // Check if user already exists by email
    let user = await User.findOne({ where: { email } });

    if (!user) {
      // Generate a unique username if the provided one already exists
      let uniqueUsername = username || email.split('@')[0];
      let usernameExists = await User.findOne({ where: { username: uniqueUsername } });
      let counter = 1;
      
      while (usernameExists) {
        uniqueUsername = `${username || email.split('@')[0]}_${counter}`;
        usernameExists = await User.findOne({ where: { username: uniqueUsername } });
        counter++;
      }

      // Create new user for OAuth
      user = await User.create({
        username: uniqueUsername,
        email,
        password_hash: 'oauth_user', // OAuth users don't have passwords
        first_name: first_name || '',
        last_name: last_name || '',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.user_id, 
        username: user.username,
        email: user.email 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Return user data without password
    const { password_hash: _, ...userWithoutPassword } = user.toJSON();
    
    res.json({
      message: 'OAuth sign-in successful',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('OAuth sign-in error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new user
router.post('/', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate email format if email is provided
    if (email && !validator.isEmail(email)) {
      return res.status(400).json({ 
        error: 'Please provide a valid email address' 
      });
    }

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

// Get a single user by ID with reputation info
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get reputation details
    try {
      const reputationInfo = await ReputationService.getUserReputation(req.params.id);
      res.json({
        ...user.toJSON(),
        reputation_details: reputationInfo
      });
    } catch (reputationError) {
      // If reputation service fails, still return user data
      res.json(user);
    }
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