/**
 * Express Application Configuration
 * This file sets up the Express app with middleware, routes, and error handling
 */

// Import required dependencies
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const session = require('express-session');

// Import route handlers
const authRoutes = require('./routes/auth');
const notesRoutes = require('./routes/notes');

// Initialize Express application
const app = express();
const passport = require("./config/passport");


// Session middleware (must come BEFORE passport.session)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Body parser middleware must come BEFORE passport initialization
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize passport and session support
app.use(passport.initialize());
app.use(passport.session());


/**
 * RATE LIMITING CONFIGURATION
 * Prevents abuse by limiting requests per IP address
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes time window
  max: 100, // Maximum 100 requests per IP per window
  message: { 
    success: false,
    error: 'Too many requests, please try again later' 
  }
});

/**
 * MIDDLEWARE SETUP
 * Apply security and parsing middleware to all routes
 */

// Configure CORS for cross-origin requests FIRST
app.use(cors({
  origin: [
    "http://localhost:5173",                      // 1. Allows your local laptop
    "https://google-keep-clone-lime.vercel.app"   // 2. Allows your live Vercel app
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400
}));
// Apply rate limiting to all routes
app.use(limiter);

// Parse JSON request bodies (max 10MB)
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

/**
 * HEALTH CHECK ENDPOINT
 * Simple endpoint to verify the API is running
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Notes API is running',
    timestamp: new Date().toISOString()
  });
});

/**
 * ROUTE HANDLERS
 * Mount API routes with their respective prefixes
 */
app.use('/api/auth', authRoutes); // Authentication routes
app.use('/api/notes', notesRoutes); // Notes management routes

/**
 * ERROR HANDLING MIDDLEWARE
 * Handle 404 errors and global error catching
 * trying to access non-existent routes and add more comments 
 */
// 404 handler for unmatched routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err); // Log for debugging
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

module.exports = app;