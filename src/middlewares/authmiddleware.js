const { verifyToken } = require('../utils/auth');
const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();

/**
 * IN the making of this, a function/Middleware to authenticate JWT tokens
 * First we take the header from request body and split it
 * If token does not exist throw an erroe
 * We have also made a utility to verify token, which gives the jwt payload: id ,email, issued, expires at--this gets stored in a const decoded
 * 
 * // Prisma (schema.prisma file)
model User {
  id    String @id @default(cuid())
  email String @unique
  name  String?
}

// Mongoose (models/User.js file)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String }
});
const User = mongoose.model('User', userSchema);


// Prisma - object-based
await prisma.user.findUnique({
  where: { id: decoded.id },
  select: { email: true, name: true }
});

// Mongoose - method chaining
await User.findById(decoded.id).select('email name');

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