const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('./generated/prisma');
const { timeStamp } = require('console');

const app = express(); // Move this UP before using app
const prisma = new PrismaClient();

// Security middlewawre is helmet and cors
app.use(helmet());
app.use(cors({
origin: process.env.FRONTEND_URL || 'http://localhost:3000',
credentials: true
}));

// Rate limiting
const limiter = rateLimit({
windowMs: 15 * 60 * 1000, // 15 minutes
max: 100 //For each IP 100 requests per windowMs
});
app.use(limiter);

// body parsing middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true}));



// Updated test route - replace in app.js
app.post('/api/test-token', async (req, res) => {
  try {
    const { generateToken } = require('./utils/auth');
    
    // Create or find test user
    let testUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });
    
    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          password: 'dummy_password_for_testing' // Add this line
        }
      });
    }
    
    const token = generateToken(testUser); 
    res.json({ token, user: testUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Routes - add AFTER middlewares
const notesRoutes = require('./routes/notes');
app.use('/api/notes', notesRoutes);

app.get('/api/health', (req,res)=> {
res.json({
status: 'success',
message: 'Note API is running!',
timeStamp: new Date().toISOString()
 });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
await prisma.$disconnect();
process.exit(0);
});

module.exports = app;