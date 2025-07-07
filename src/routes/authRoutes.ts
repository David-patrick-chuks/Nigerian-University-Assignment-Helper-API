import express from 'express';
import passport from 'passport';
import { googleCallback, login, refreshToken, register } from '../controllers/authController';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/' }), googleCallback);
router.post('/refresh', passport.authenticate('jwt', { session: false }), refreshToken);

export default router; 