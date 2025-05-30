const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const NodeCache = require('node-cache');

// Initialize cache with 30 minute TTL
const cache = new NodeCache({ 
  stdTTL: 1800, // 30 minutes
  checkperiod: 600 // Check for expired keys every 10 minutes
});

// Rate limiting configurations for different endpoint types
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip successful requests in development
    skip: (req, res) => process.env.NODE_ENV === 'development' && res.statusCode < 400
  });
};

// Different rate limits for different operations
const rateLimiters = {
  // Very strict for expensive operations
  auth: createRateLimiter(15 * 60 * 1000, 5, 'Too many authentication attempts, please try again in 15 minutes'),
  
  // Moderate for write operations
  write: createRateLimiter(60 * 1000, 30, 'Too many write requests, please slow down'),
  
  // Lenient for read operations but still controlled
  read: createRateLimiter(60 * 1000, 100, 'Too many read requests, please slow down'),
  
  // Very lenient for basic operations
  general: createRateLimiter(15 * 60 * 1000, 1000, 'Too many requests, please try again later')
};

// Speed limiting - gradually slow down users making too many requests
const speedLimiter = slowDown({
  windowMs: 60 * 1000, // 1 minute
  delayAfter: 50, // Allow 50 requests per minute at full speed
  delayMs: () => 100, // Add 100ms delay per request after delayAfter
  maxDelayMs: 2000, // Maximum delay of 2 seconds
});

// Cache middleware for GET requests
const cacheMiddleware = (cacheDuration = 300) => { // Default 5 minutes
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Create cache key from URL and query parameters
    const cacheKey = req.originalUrl || req.url;
    
    // Check if we have cached data
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      console.log(`Cache HIT for ${cacheKey}`);
      return res.json(cachedData);
    }

    // Store original res.json
    const originalJson = res.json;
    
    // Override res.json to cache the response
    res.json = function(data) {
      // Only cache successful responses
      if (res.statusCode === 200) {
        cache.set(cacheKey, data, cacheDuration);
        console.log(`Cache SET for ${cacheKey}`);
      }
      
      // Call original res.json
      originalJson.call(this, data);
    };

    next();
  };
};

// Request deduplication middleware
const requestDeduplication = () => {
  const pendingRequests = new Map();
  
  return (req, res, next) => {
    // Only deduplicate GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const requestKey = req.originalUrl || req.url;
    
    // Check if this request is already in progress
    if (pendingRequests.has(requestKey)) {
      console.log(`Request deduplication for ${requestKey}`);
      
      // Wait for the existing request to complete
      pendingRequests.get(requestKey).then(data => {
        res.json(data);
      }).catch(err => {
        res.status(500).json({ error: 'Request failed' });
      });
      
      return;
    }

    // Store original res.json
    const originalJson = res.json;
    let responseData = null;
    
    // Create a promise for this request
    const requestPromise = new Promise((resolve, reject) => {
      res.json = function(data) {
        responseData = data;
        resolve(data);
        
        // Remove from pending requests
        pendingRequests.delete(requestKey);
        
        // Call original res.json
        originalJson.call(this, data);
      };

      // Handle errors
      const originalStatus = res.status;
      res.status = function(code) {
        if (code >= 400) {
          reject(new Error(`Request failed with status ${code}`));
          pendingRequests.delete(requestKey);
        }
        return originalStatus.call(this, code);
      };
    });

    pendingRequests.set(requestKey, requestPromise);
    next();
  };
};

// Clear cache for specific patterns when data is modified
const clearRelatedCache = (pattern) => {
  const keys = cache.keys();
  const keysToDelete = keys.filter(key => key.includes(pattern));
  
  keysToDelete.forEach(key => {
    cache.del(key);
    console.log(`Cache CLEARED for ${key}`);
  });
};

// Middleware to clear cache on write operations
const cacheInvalidation = (patterns) => {
  return (req, res, next) => {
    // Only apply to non-GET requests
    if (req.method === 'GET') {
      return next();
    }

    // Store original res.json
    const originalJson = res.json;
    
    res.json = function(data) {
      // Only clear cache on successful operations
      if (res.statusCode < 300) {
        patterns.forEach(pattern => clearRelatedCache(pattern));
      }
      
      originalJson.call(this, data);
    };

    next();
  };
};

module.exports = {
  rateLimiters,
  speedLimiter,
  cacheMiddleware,
  requestDeduplication,
  cacheInvalidation,
  clearRelatedCache
}; 