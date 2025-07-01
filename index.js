const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;
const sequelize = require('./db');
const cors = require('cors');

// Import associations to set up database relationships
require('./associations/associations');

// Import routes (MUST be at the top, before using them)
const userRoutes = require('./routes/userRoutes');
const questionRoutes = require('./routes/questionRoutes');
const mcqOptionRoutes = require('./routes/mcqOptionRoutes');
const fillBlankAnswerRoutes = require('./routes/fillBlankAnswerRoutes');
const commentRoutes = require('./routes/commentRoutes');
const questionVoteRoutes = require('./routes/questionVoteRoutes');
const tagRoutes = require('./routes/tagRoutes');
const reputationRoutes = require('./routes/reputationRoutes');
const problemSetRoutes = require('./routes/problemSetRoutes');
const problemSetVoteRoutes = require('./routes/problemSetVoteRoutes');
const quizApiRoutes = require('./routes/quizApiRoutes');

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
    console.log('Database connection established successfully.');
    return sequelize.sync({ alter: true }); // Use alter: true for production safety
  })
  .then(() => {
    console.log('Database models synchronized successfully.');
  })
  .catch(err => {
    console.error('Database connection failed:', err.message);
    console.error('Database error details:', {
      code: err.code,
      errno: err.errno,
      syscall: err.syscall,
      hostname: err.hostname,
      port: err.port
    });
    // Don't exit the process, let it continue and Railway will handle restarts
  });

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'Reddit Questions API is running',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
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
app.use('/api/problemsets', problemSetRoutes);
app.use('/api/problemsets', problemSetVoteRoutes);
app.use('/api/quizapi', quizApiRoutes);

// Start server (MUST be at the end)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});