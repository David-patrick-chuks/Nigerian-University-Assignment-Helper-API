import { NextFunction, Request, Response } from 'express';
import User from '../models/User';
import { generateContent } from '../services/geminiService';

export const summarize = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // @ts-ignore
    const userId = req.user?.userId || req.user?._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.credits < 2) {
      return res.status(402).json({ error: 'Insufficient credits. Summarization costs 2 credits.' });
    }

    let content = '';
    if (req.file) {
      // Handle file upload
      const fileBuffer = req.file.buffer;
      const fileText = fileBuffer.toString('utf-8');
      content = fileText;
    } else if (req.body.content) {
      // Handle text input
      content = req.body.content;
    } else {
      return res.status(400).json({ error: 'Either file or content is required' });
    }

    const prompt = `Summarize the following content in a clear and concise manner, highlighting the key points and main ideas:

${content}

Provide a comprehensive summary that captures the essence of the text while maintaining academic standards.`;

    const summary = await generateContent(prompt);

    // Deduct credits
    user.credits -= 2;
    await user.save();

    return res.json({ summary });
  } catch (err) {
    return next(err);
  }
}; 