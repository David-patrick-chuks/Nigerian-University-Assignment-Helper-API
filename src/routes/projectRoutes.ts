import express from 'express';
import passport from 'passport';
import { generateProject } from '../controllers/projectController';
import { upload } from '../middleware/upload';

const router = express.Router();

router.post('/generate', passport.authenticate('jwt', { session: false }), upload.single('file'), generateProject);

export default router; 