const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;
const sequelize = require('./db');
const cors = require('cors');

// Import rate limiting and caching middleware
const { 
  rateLimiters, 
  speedLimiter, 
  cacheMiddleware, 
  requestDeduplication,
  cacheInvalidation 
} = require('./middleware/rateLimitAndCache');

// Import routes (MUST be at the top, before using them)
const userRoutes = require('./routes/userRoutes');
const questionRoutes = require('./routes/questionRoutes');
const mcqOptionRoutes = require('./routes/mcqOptionRoutes');
const fillBlankAnswerRoutes = require('./routes/fillBlankAnswerRoutes');
const commentRoutes = require('./routes/commentRoutes');
const questionVoteRoutes = require('./routes/questionVoteRoutes');
const tagRoutes = require('./routes/tagRoutes');

// Trust proxy for rate limiting (important for deployed apps)
app.set('trust proxy', 1);

// Apply global rate limiting and speed limiting
app.use(rateLimiters.general);
app.use(speedLimiter);

// Request deduplication to prevent duplicate concurrent requests
app.use(requestDeduplication());

// Middleware
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size

// CORS configuration
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

// Basic route with light caching
app.get('/', cacheMiddleware(1800), (req, res) => { // Cache for 30 minutes
  res.send('Reddit Questions API is running');
});

// API Routes with specific rate limiting and caching
// User routes - stricter rate limiting for auth operations
app.use('/api/users', rateLimiters.auth, cacheInvalidation(['users', 'questions']), userRoutes);

// Question routes - moderate rate limiting, aggressive caching for reads
app.use('/api/questions', 
  rateLimiters.read, 
  cacheMiddleware(600), // Cache for 10 minutes
  cacheInvalidation(['questions', 'options', 'answers', 'votes']),
  questionRoutes
);

// MCQ and Fill Blank routes - cached since they don't change often
app.use('/api/questions', 
  rateLimiters.read,
  cacheMiddleware(900), // Cache for 15 minutes
  cacheInvalidation(['questions', 'options', 'answers']),
  mcqOptionRoutes
);

app.use('/api/questions', 
  rateLimiters.read,
  cacheMiddleware(900), // Cache for 15 minutes
  cacheInvalidation(['questions', 'answers']),
  fillBlankAnswerRoutes
);

// Comment routes - moderate caching, write rate limiting
app.use('/api/comments', 
  rateLimiters.write,
  cacheMiddleware(300), // Cache for 5 minutes
  cacheInvalidation(['comments']),
  commentRoutes
);

// Vote routes - write rate limiting, short caching
app.use('/api/questions', 
  rateLimiters.write,
  cacheMiddleware(180), // Cache for 3 minutes
  cacheInvalidation(['questions', 'votes']),
  questionVoteRoutes
);

// Tag routes - heavy caching since tags don't change often
app.use('/api/tags', 
  rateLimiters.read,
  cacheMiddleware(1800), // Cache for 30 minutes
  cacheInvalidation(['tags']),
  tagRoutes
);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error occurred:', err);
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request payload too large' });
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

// Start server (MUST be at the end)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Rate limiting and caching enabled');
});