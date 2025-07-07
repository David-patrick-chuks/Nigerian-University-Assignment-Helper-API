// Load environment variables first
// @ts-ignore
import dotenv from 'dotenv';
dotenv.config();

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import passport from 'passport';
import './middleware/auth';
import { generalRateLimiter } from './middleware/rateLimiter';
import assignmentRoutes from './routes/assignmentRoutes';
import authRoutes from './routes/authRoutes';
import creditsRoutes from './routes/creditsRoutes';
import flashcardRoutes from './routes/flashcardRoutes';
import projectRoutes from './routes/projectRoutes';
import quizRoutes from './routes/quizRoutes';
import summarizeRoutes from './routes/summarizeRoutes';

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// General rate limiting
app.use(generalRateLimiter);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
  next();
});

app.use(passport.initialize());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/project', projectRoutes);
app.use('/api/summarize', summarizeRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/assignments', assignmentRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Assignment Helper API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API information endpoint
app.get('/api/info', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      name: 'Nigerian University Assignment Helper API',
      version: '1.0.0',
      description: 'AI-powered assignment help for Nigerian university students',
      endpoints: {
        'POST /api/assignments/generate': 'Generate an assignment file (doc, docx, pdf, txt)',
        'POST /api/assignments/generate-json': 'Generate an assignment (JSON response)',
        'GET /api/health': 'Health check',
        'GET /api/info': 'API information'
      },
      features: [
        'AI-powered assignment generation',
        'Academic formatting',
        'Nigerian university standards',
        'Customizable page requirements',
        'Multiple file formats (doc, docx, pdf, txt)',
        'Proper document formatting with student info and question header',
        'Rate limiting for fair usage'
      ],
      supportedFileTypes: ['doc', 'docx', 'pdf', 'txt']
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Nigerian University Assignment Helper API',
    version: '1.0.0',
    documentation: '/api/info',
    health: '/api/health'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/info',
      'POST /api/assignments/generate',
      'POST /api/assignments/generate-json'
    ]
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', error);

  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Payload too large'
    });
  }

  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({
      success: false,
      error: 'Malformed JSON'
    });
  }

  return res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message
  });
});

export default app; 