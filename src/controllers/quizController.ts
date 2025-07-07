import { NextFunction, Request, Response } from 'express';
import User from '../models/User';
import { generateContent } from '../services/geminiService';

export const generateQuiz = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // @ts-ignore
    const userId = req.user?.userId || req.user?._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.credits < 3) {
      return res.status(402).json({ error: 'Insufficient credits. Quiz generation costs 3 credits.' });
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

    const prompt = `Based on the following content, generate 10 multiple choice questions with 4 options each (A, B, C, D) and the correct answer. Format the response as a JSON array:

Content: ${content}

Generate questions that test understanding of key concepts, definitions, and important details from the content. Make sure the questions are clear and the options are plausible.`;

    const quizResponse = await generateContent(prompt);

    // Try to parse the response as JSON, if it fails, return as text
    let quiz;
    try {
      quiz = JSON.parse(quizResponse);
    } catch (e) {
      // If parsing fails, return the raw response
      quiz = quizResponse;
    }

    // Deduct credits
    user.credits -= 3;
    await user.save();

    return res.json({ quiz });
  } catch (err) {
    return next(err);
  }
}; 