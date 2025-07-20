/**
 * Authentication Utilities
 * This file contains all authentication-related helper functions for password hashing and JWT token management
 */

// Import required dependencies
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Get JWT secret from environment or use fallback (for development only)
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-123';

/**
 * PASSWORD HASHING FUNCTIONS
 * These functions handle secure password storage and verification
 */

/**
 * Hash a plain text password using bcrypt
 * @param {string} password - The plain text password to hash
 * @returns {Promise<string>} The hashed password
 */
const hashPassword = async (password) => {
  const saltRounds = 12; // Number of salt rounds for bcrypt (higher = more secure but slower)
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare a plain text password with its hashed version
 * @param {string} password - The plain text password to check
 * @param {string} hash - The hashed password to compare against
 * @returns {Promise<boolean>} True if passwords match, false otherwise
 */
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * JWT TOKEN FUNCTIONS
 * These functions handle JWT token creation and verification
 */

/**
 * Generate a JWT token for user authentication
 * @param {Object} user - User object containing id and email
 * @returns {string} The generated JWT token
 */
const generateToken = (user) => {
  return jwt.sign({
    id: user.id,        // User ID for identification
    email: user.email   // User email for additional context
  },
  JWT_SECRET,          // Secret key for signing
  {
    expiresIn: '7d'    // Token expires in 7 days
  });
};

/**
 * Verify and decode a JWT token
 * @param {string} token - The JWT token to verify
 * @returns {Object} The decoded token payload containing user information
 * @throws {Error} If token is invalid, expired, or malformed
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

// Export all authentication utility functions
module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken
};