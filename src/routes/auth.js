const express = require('express');
const { PrismaClient } = require('../generated/prisma');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/auth/register - User Registration
router.post('/register', async (req, res) => {
  try {
    // STEP 1: Extract data from request
    const { name, email, password } = req.body;
    
    // STEP 2: Validate input (CRITICAL for security!)
    if (!name || !email || !password) {
      return res.status(400).json({ 
        error: 'Name, email, and password are required' 
      });
    }
    
    // STEP 3: Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Please provide a valid email address' 
      });
    }
    
    // STEP 4: Password strength validation
    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      });
    }
    
    // STEP 5: Check if user already exists (prevent duplicates)
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (existingUser) {
      return res.status(409).json({ 
        error: 'User already exists with this email' 
      });
    }
    
    // STEP 6: Hash the password (NEVER store plain text!)
    const hashedPassword = await hashPassword(password);
    
    // STEP 7: Create user in database
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(), // Store lowercase for consistency
        password: hashedPassword
      }
    });
    
    // STEP 8: Generate JWT token for immediate login
    const token = generateToken(user);
    
    // STEP 9: Return success response (WITHOUT password!)
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
        // Notice: NO password in response!
      },
      token
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Failed to create user' 
    });
  }
});

// POST /api/auth/login - User Login
router.post('/login', async (req, res) => {
  try {
    // STEP 1: Extract credentials
    const { email, password } = req.body;
    
    // STEP 2: Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }
    
    // STEP 3: Find user in database
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }
    
    // STEP 4: Compare password with stored hash
    const isPasswordValid = await comparePassword(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }
    
    // STEP 5: Generate new token
    const token = generateToken(user);
    
    // STEP 6: Return success with token
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      },
      token
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Failed to login' 
    });
  }
});

module.exports = router;