import express from 'express';
import passport from 'passport';
import { generateFlashcards } from '../controllers/flashcardController';
import { upload } from '../middleware/upload';

const router = express.Router();

router.post('/generate', passport.authenticate('jwt', { session: false }), upload.single('file'), generateFlashcards);

export default router; 