import express from 'express';
import passport from 'passport';
import { generateQuiz } from '../controllers/quizController';
import { upload } from '../middleware/upload';

const router = express.Router();

router.post('/generate', passport.authenticate('jwt', { session: false }), upload.single('file'), generateQuiz);

export default router; 