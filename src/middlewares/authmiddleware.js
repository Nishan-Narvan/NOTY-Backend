const { verifyToken } = require('../utils/auth');
const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();

/**
 * Middleware to authenticate JWT tokens
 * Protects routes that require user authentication
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.' 
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true } // Don't include password
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid token. User not found.' 
      });
    }

    // Add user to request object
    req.user = user;
    next(); // Continue to next middleware/route handler

  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired. Please login again.' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token format.' 
      });
    }

    return res.status(500).json({ 
      error: 'Authentication failed.' 
    });
  }
};

module.exports = {
  authenticateToken
};