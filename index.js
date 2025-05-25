const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;
const sequelize = require('./db');
const cors = require('cors');

app.use(express.json());

//pull models from associations before inserting into their own vars
const models = require('./associations/associations.js');
const { User, Question, Tag, McqOption, FillBlankAnswer, Comment } = models;

//testing database connection
sequelize.authenticate()
  .then(() => {
    console.log('Database connection established.');
    
    return sequelize.sync();
  })
  .then(() => {
    console.log('Models synchronized with database.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

app.use(cors({
  origin: [
    'https://community-coding-prep-frontend.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.get('/', (req, res) => {
  res.send('Reddit Questions API is running');
});

//creates a new question
app.post('/api/questions', async (req, res) => {
  try {
    const question = await Question.create(req.body);
    res.status(201).json(question);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// this gets all the questions
app.get('/api/questions', async (req, res) => {
  try {
    const questions = await Question.findAll();
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// creates a new user
app.post('/api/users', async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// gets all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});