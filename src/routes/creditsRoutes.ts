import express from 'express';
import passport from 'passport';
import { buyCredits, getBalance, verifyPayment } from '../controllers/creditsController';

const router = express.Router();

router.get('/balance', passport.authenticate('jwt', { session: false }), getBalance);
router.post('/buy', passport.authenticate('jwt', { session: false }), buyCredits);
router.get('/verify', passport.authenticate('jwt', { session: false }), verifyPayment);

export default router; 