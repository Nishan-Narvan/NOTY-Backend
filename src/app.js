const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('./generated/prisma');
const { timeStamp } = require('console');

const app = express();
const prisma = new PrismaClient();

// Security middlewawre is helmet and cors

app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));


// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 100   //For each IP 100 requests per windowMs

});
app.use(limiter);



// body parsing middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true}));



app.get('/api/health', (req,res)=> {
    res.json({
        status: 'success',
        message: 'Note API is running!',
        timeStamp: new Date().toISOString()
    });
});


// Graceful shutdown wth will it use for a graceful shutdown

process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

module.exports = app;