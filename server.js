/**
 * Main Server Entry Point
 * This file initializes the Express server and handles graceful shutdown
 */

// Load environment variables from .env file
require('dotenv').config();

// Import the Express app configuration
const app = require('./src/app');

// Set port from environment or default to 5000
const PORT = process.env.PORT || 5000;

/**
 * GRACEFUL SHUTDOWN HANDLERS
 * These handlers ensure the server shuts down properly when receiving termination signals
 */

// Handle SIGTERM signal (termination request)
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

// Handle SIGINT signal (Ctrl+C)
process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

/**
 * START THE SERVER
 * Initialize the Express server and log startup information
 */
app.listen(PORT, () => {
  console.log(`🚀 Notes API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Environment: ${process.env.NODE_ENV || 'development'}`);
});