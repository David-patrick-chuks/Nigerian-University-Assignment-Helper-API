import { NextFunction, Request, Response } from 'express';
import User from '../models/User';
import { generateContent } from '../services/geminiService';

export const generateFlashcards = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // @ts-ignore
    const userId = req.user?.userId || req.user?._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.credits < 2) {
      return res.status(402).json({ error: 'Insufficient credits. Flashcard generation costs 2 credits.' });
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

    const prompt = `Based on the following content, generate 15 flashcards with a question on the front and answer on the back. Format the response as a JSON array with "front" and "back" properties:

Content: ${content}

Create flashcards that cover key concepts, definitions, important facts, and study points from the content. Make the questions clear and the answers concise but comprehensive.`;

    const flashcardResponse = await generateContent(prompt);

    // Try to parse the response as JSON, if it fails, return as text
    let flashcards;
    try {
      flashcards = JSON.parse(flashcardResponse);
    } catch (e) {
      // If parsing fails, return the raw response
      flashcards = flashcardResponse;
    }

    // Deduct credits
    user.credits -= 2;
    await user.save();

    return res.json({ flashcards });
  } catch (err) {
    return next(err);
  }
}; 