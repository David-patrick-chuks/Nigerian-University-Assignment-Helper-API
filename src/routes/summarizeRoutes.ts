import express from 'express';
import passport from 'passport';
import { summarize } from '../controllers/summarizeController';
import { upload } from '../middleware/upload';

const router = express.Router();

router.post('/', passport.authenticate('jwt', { session: false }), upload.single('file'), summarize);

export default router; 