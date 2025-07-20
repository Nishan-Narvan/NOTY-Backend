/**
 * Authentication Middleware
 * This middleware protects routes by verifying JWT tokens and loading user data
 */

// Import required dependencies
const { verifyToken } = require('../utils/auth');
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client for database operations
const prisma = new PrismaClient();

/**
 * JWT TOKEN AUTHENTICATION MIDDLEWARE
 * This middleware function:
 * 1. Extracts JWT token from Authorization header
 * 2. Verifies the token's validity and expiration
 * 3. Fetches user data from database
 * 4. Attaches user data to request object for use in route handlers
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authenticateToken = async (req, res, next) => {
  try {
    /**
     * STEP 1: EXTRACT TOKEN FROM HEADER
     * Get the Authorization header and extract the token part
     */
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

    // Check if token exists
    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.' 
      });
    }

    /**
     * STEP 2: VERIFY JWT TOKEN
     * Decode and verify the token's signature and expiration
     */
    const decoded = verifyToken(token);
    
    /**
     * STEP 3: FETCH USER FROM DATABASE
     * Get user data from database using the decoded user ID
     * Only select necessary fields (exclude password for security)
     */
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { 
        id: true, 
        email: true, 
        name: true 
      } // Don't include password for security
    });

    // Check if user exists in database
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid token. User not found.' 
      });
    }

    /**
     * STEP 4: ATTACH USER TO REQUEST
     * Make user data available to subsequent middleware and route handlers
     */
    req.user = user;
    next(); // Continue to next middleware/route handler

  } catch (error) {
    console.error('Authentication error:', error);
    
    /**
     * STEP 5: HANDLE SPECIFIC JWT ERRORS
     * Provide specific error messages for different JWT validation failures
     */
    
    // Handle expired token error
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired. Please login again.' 
      });
    }
    
    // Handle malformed token error
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token format.' 
      });
    }

    // Handle any other authentication errors
    return res.status(500).json({ 
      error: 'Authentication failed.' 
    });
  }
};

// Export the authentication middleware
module.exports = {
  authenticateToken
};