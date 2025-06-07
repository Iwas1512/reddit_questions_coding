const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;
const sequelize = require('./db');
const cors = require('cors');

// Import routes (MUST be at the top, before using them)
const userRoutes = require('./routes/userRoutes');
const questionRoutes = require('./routes/questionRoutes');
const mcqOptionRoutes = require('./routes/mcqOptionRoutes');
const fillBlankAnswerRoutes = require('./routes/fillBlankAnswerRoutes');
const commentRoutes = require('./routes/commentRoutes');
const questionVoteRoutes = require('./routes/questionVoteRoutes');
const tagRoutes = require('./routes/tagRoutes');
const reputationRoutes = require('./routes/reputationRoutes');

// Middleware
app.use(express.json());

// CORS configuration
app.use(cors({
  origin: [
    'https://community-coding-prep-frontend.vercel.app',
    'https://community-coding-prep-frontend.vercel.app/',
    'https://algozero.xyz',
    'https://www.algozero.xyz',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Database connection
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

// Basic route
app.get('/', (req, res) => {
  res.send('Reddit Questions API is running');
});

// API Routes (MUST be before server starts)
app.use('/api/users', userRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/questions', mcqOptionRoutes);
app.use('/api/questions', fillBlankAnswerRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/questions', questionVoteRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/reputation', reputationRoutes);

// Start server (MUST be at the end)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});