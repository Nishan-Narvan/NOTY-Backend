/**
 * Express Application Configuration
 * This file sets up the Express app with middleware, routes, and error handling
 */

// Import required dependencies
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Import route handlers
const authRoutes = require('./routes/auth');
const notesRoutes = require('./routes/notes');

// Initialize Express application
const app = express();

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

// Apply rate limiting to all routes
app.use(limiter);

// Configure CORS for cross-origin requests
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000', // Allow requests from frontend
  credentials: true // Allow cookies and authentication headers
}));

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
 */

// 404 handler - catch all unmatched routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler - catch all unhandled errors
app.use((error, req, res, next) => {
  console.error('Global error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

module.exports = app;