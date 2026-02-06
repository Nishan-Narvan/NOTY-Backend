/**
 * Authentication Routes
 * This file handles all user authentication endpoints: registration, login, profile, and logout
 */

// Import required dependencies
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const passport = require('passport');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');
const { authenticateToken } = require('../middlewares/authmiddleware');

// Initialize Express router and Prisma client
const router = express.Router();
const prisma = new PrismaClient();

/**
 * USER REGISTRATION ENDPOINT
 * POST /api/auth/register
 * Creates a new user account with email and password
 */
router.post('/register', async (req, res) => {
  try {
    /**
     * STEP 1: EXTRACT AND VALIDATE INPUT DATA
     * Get user data from request body and perform basic validation
     */
    const { name, email, password } = req.body;

    // Check if all required fields are provided
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required'
      });
    }

    /**
     * STEP 2: EMAIL FORMAT VALIDATION
     * Use regex to validate email format
     */
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address'
      });
    }

    /**
     * STEP 3: PASSWORD STRENGTH VALIDATION
     * Ensure password meets minimum security requirements
     */
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    /**
     * STEP 4: CHECK FOR EXISTING USER
     * Prevent duplicate email registrations
     */
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists with this email'
      });
    }

    /**
     * STEP 5: HASH PASSWORD
     * Securely hash the password before storing in database
     */
    const hashedPassword = await hashPassword(password);

    /**
     * STEP 6: CREATE USER IN DATABASE
     * Store user data with hashed password and email provider
     */
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(), // Store lowercase for consistency
        password: hashedPassword,
        provider: "email"
      }
    });

    /**
     * STEP 7: GENERATE JWT TOKEN
     * Create authentication token for immediate login
     */
    const token = generateToken(user);

    /**
     * STEP 8: RETURN SUCCESS RESPONSE
     * Send user data and token (excluding password for security)
     */
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt
          // Note: Password is intentionally excluded from response
        },
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    /**
     * STEP 9: HANDLE SPECIFIC DATABASE ERRORS
     * Provide specific error messages for database constraint violations
     */
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'User already exists with this email'
      });
    }

    // Handle any other errors
    res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
});

/**
 * USER LOGIN ENDPOINT
 * POST /api/auth/login
 * Authenticates user with email and password, returns JWT token
 */
router.post('/login', async (req, res) => {
  try {
    /**
     * STEP 1: EXTRACT AND VALIDATE CREDENTIALS
     * Get login credentials from request body
     */
    const { email, password } = req.body;

    // Validate that both email and password are provided
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    /**
     * STEP 2: FIND USER IN DATABASE
     * Search for user by email (case-insensitive)
     */
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    /**
     * STEP 3: VERIFY PASSWORD
     * Compare provided password with stored hash
     */
    const isPasswordValid = await comparePassword(password, user.password);
    
    // Check if password is correct
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    /**
     * STEP 4: GENERATE AUTHENTICATION TOKEN
     * Create JWT token for successful login
     */
    const token = generateToken(user);

    /**
     * STEP 5: RETURN SUCCESS RESPONSE
     * Send user data and authentication token
     */
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to login'
    });
  }
});

/**
 * USER PROFILE ENDPOINT
 * GET /api/auth/profile
 * Returns current user's profile information and note statistics (PROTECTED ROUTE)
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    /**
     * STEP 1: FETCH USER PROFILE WITH STATISTICS
     * Get user data including count of active notes
     */
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        googleId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            notes: {
              where: { status: 'ACTIVE' }
            }
          }
        }
      }
    });

    // Check if user still exists in database
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    /**
     * STEP 2: RETURN PROFILE DATA
     * Send user profile with active notes count
     */
    res.json({
      success: true,
      data: {
        user: {
          ...user,
          activeNotesCount: user._count.notes
        }
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
});

/**
 * USER LOGOUT ENDPOINT
 * POST /api/auth/logout
 * Handles user logout (token invalidation handled client-side) (PROTECTED ROUTE)
 */
router.post('/logout', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful. Please remove the token from client-side storage.'
  });
});

/**
 * GOOGLE OAUTH ROUTES
 * These endpoints handle Google OAuth 2.0 authentication flow
 */

/**
 * INITIATE GOOGLE OAUTH
 * GET /api/auth/google
 * Redirects user to Google's OAuth consent screen
 */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

/**
 * GOOGLE OAUTH CALLBACK
 * GET /api/auth/google/callback
 * Google redirects here after user authorizes the application
 * Redirects to frontend with JWT token
 */
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/api/auth/google/failure',
    session: true
  }),
  (req, res) => {
    try {
      // User is now authenticated by passport
      const user = req.user;
      console.log('✅ Google OAuth successful, user:', { id: user.id, email: user.email, name: user.name });
      
      // Generate JWT token
      const token = generateToken(user);
      console.log('✅ JWT token generated:', token.substring(0, 20) + '...');
      
      // Redirect to frontend with token
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const redirectUrl = `${clientUrl}/auth/callback?token=${token}`;
      console.log('✅ Redirecting to:', redirectUrl);
      
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('❌ Google callback redirect error:', error);
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      res.redirect(`${clientUrl}/login?error=Authentication failed`);
    }
  }
);

/**
 * GOOGLE AUTH FAILURE HANDLER
 * GET /api/auth/google/failure
 * Handles authentication failures
 */
router.get('/google/failure', (req, res) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  res.redirect(`${clientUrl}/login?error=Google authentication failed`);
});

/**
 * GET CURRENT AUTHENTICATED USER (from Google or JWT)
 * GET /api/auth/me
 * Returns current user information
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    });
  }
});

module.exports = router;