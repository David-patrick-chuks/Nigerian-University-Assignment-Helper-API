import { NextFunction, Request, Response } from 'express';
import User from '../models/User';
import { generateContent } from '../services/geminiService';

export const generateProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // @ts-ignore
    const userId = req.user?.userId || req.user?._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.credits < 5) {
      return res.status(402).json({ error: 'Insufficient credits. Project generation costs 5 credits.' });
    }

    let content = '';
    if (req.file) {
      // Handle file upload
      const fileBuffer = req.file.buffer;
      const fileText = fileBuffer.toString('utf-8');
      content = fileText;
    } else if (req.body.topic) {
      // Handle text input
      content = req.body.topic;
    } else {
      return res.status(400).json({ error: 'Either file or topic is required' });
    }

    const prompt = `Generate a comprehensive final year project document for the topic: "${content}". 
    Include the following sections:
    1. Chapter 1: Introduction
    2. Chapter 2: Literature Review
    3. Chapter 3: Methodology
    4. Chapter 4: System Design
    5. Chapter 5: Implementation
    6. Chapter 6: Testing and Results
    7. Chapter 7: Conclusion and Recommendations
    
    Make it suitable for Nigerian university standards. Be detailed and academic.`;

    const projectContent = await generateContent(prompt);

    // Deduct credits
    user.credits -= 5;
    await user.save();

    return res.json({ project: projectContent });
  } catch (err) {
    return next(err);
  }
}; 