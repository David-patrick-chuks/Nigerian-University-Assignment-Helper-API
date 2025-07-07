import bcrypt from 'bcryptjs';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'default_access_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret';

function generateTokens(user: any) {
  const accessToken = jwt.sign({ id: user._id }, JWT_ACCESS_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign({ id: user._id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, fullName } = req.body;
    
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Email, password, and fullName are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      email,
      password: hashedPassword,
      fullName,
      credits: 10 // Give 10 free credits on registration
    });

    const { accessToken, refreshToken } = generateTokens(user);
    
    return res.status(201).json({
      token: accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        credits: user.credits
      }
    });
  } catch (err) {
    return next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    
    return res.json({
      token: accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        credits: user.credits
      }
    });
  } catch (err) {
    return next(err);
  }
};

export async function googleCallback(req: Request, res: Response) {
  try {
    // On success, issue tokens
    const user = req.user as any;
    const tokens = generateTokens(user);
    
    // Find and update the user to store refresh token
    const updatedUser = await User.findById(user._id);
    if (!updatedUser) {
      throw new Error('User not found');
    }
    
    updatedUser.refreshTokens.push(tokens.refreshToken);
    await updatedUser.save();
    
    // Redirect back to the dashboard with the access token
    return res.redirect(`/dashboard.html?token=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`);
  } catch (error) {
    console.error('Google callback error:', error);
    return res.redirect('/login.html?error=auth_failed');
  }
}

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // @ts-ignore
    const userId = req.user?.userId || req.user?._id;
    const { accessToken } = generateTokens({ _id: userId });
    
    return res.json({ token: accessToken });
  } catch (err) {
    return next(err);
  }
}; 