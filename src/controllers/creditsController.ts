import { NextFunction, Request, Response } from 'express';
import User from '../models/User';
import { initializePayment, verifyPayment as paystackVerify } from '../services/paystackService';

export const getBalance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // @ts-ignore
    const userId = req.user?.userId || req.user?._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ credits: user.credits });
  } catch (err) {
    return next(err);
  }
};

export const buyCredits = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount } = req.body;
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    // @ts-ignore
    const userId = req.user?.userId || req.user?._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const paystackRes = await initializePayment(user.email, amount);
    return res.json({ paymentUrl: paystackRes.data.authorization_url });
  } catch (err) {
    return next(err);
  }
};

export const verifyPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reference } = req.query;
    if (!reference || typeof reference !== 'string') {
      return res.status(400).json({ error: 'Missing reference' });
    }
    // @ts-ignore
    const userId = req.user?.userId || req.user?._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const paystackRes = await paystackVerify(reference);
    if (paystackRes.data.status === 'success') {
      // You may want to check if this reference was already used to prevent double crediting
      const creditsAdded = Math.floor(paystackRes.data.amount / 100); // 1 credit = 1 Naira
      user.credits += creditsAdded;
      await user.save();
      return res.json({ success: true, creditsAdded, newBalance: user.credits });
    }
    return res.status(400).json({ success: false, error: 'Payment not successful' });
  } catch (err) {
    return next(err);
  }
}; 