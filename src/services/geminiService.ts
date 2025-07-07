import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { AssignmentRequest } from '../types/assignment';

export class GeminiService {
  private ai: GoogleGenAI;
  private model: string = 'gemini-2.0-flash';

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateAssignment(assignmentData: AssignmentRequest): Promise<string> {
    try {
      const chat = this.ai.chats.create({
        model: this.model,
        history: [
          {
            role: "user",
            parts: [{ text: this.buildSystemPrompt() }],
          },
          {
            role: "model",
            parts: [{ text: "I understand. I'm ready to help Nigerian university students with their assignments. Please provide the assignment details." }],
          },
        ],
      });

      const prompt = this.buildAssignmentPrompt(assignmentData);
      
      const stream = await chat.sendMessageStream({
        message: prompt,
      });

      let fullResponse = '';
      for await (const chunk of stream) {
        if (chunk.text) {
          fullResponse += chunk.text;
        }
      }

      // Save raw response for debugging
      try {
        const outPath = path.join(__dirname, '../../test-output/gemini-raw-response.txt');
        fs.writeFileSync(outPath, fullResponse, 'utf8');
      } catch (err) {
        // Ignore file write errors
      }

      return fullResponse;
    } catch (error) {
      console.error('Error generating assignment:', error);
      throw new Error('Failed to generate assignment. Please try again.');
    }
  }

  async generateContent(prompt: string): Promise<string> {
    try {
      const chat = this.ai.chats.create({
        model: this.model,
      });

      const stream = await chat.sendMessageStream({
        message: prompt,
      });

      let fullResponse = '';
      for await (const chunk of stream) {
        if (chunk.text) {
          fullResponse += chunk.text;
        }
      }

      return fullResponse;
    } catch (error) {
      console.error('Error generating content:', error);
      throw new Error('Failed to generate content. Please try again.');
    }
  }

  private buildSystemPrompt(): string {
    return `You are an expert academic assistant for Nigerian university students. Your role is to help students with their assignments by providing comprehensive, well-structured, and academically sound responses.

Key Guidelines:
1. Provide detailed, comprehensive answers that meet the specified page requirements
2. Use proper academic writing style and formatting
3. Structure your response with clear headings, subheadings, and paragraphs
4. Ensure the content is relevant to Nigerian university standards
5. Use formal academic language while maintaining clarity
6. Include introduction, main body, and conclusion sections
7. Provide practical examples and case studies relevant to the Nigerian context when applicable
8. DO NOT include any header information like student name, matric number, etc. in your response
9. Focus only on the academic content of the assignment
10. DO NOT include any references, bibliography, citations, or works cited section
11. DO NOT include any footnotes or endnotes
12. Write as if this is a standalone academic essay without external citations

Format your response as a complete academic assignment with proper structure and formatting, but without any header information or references.`;
  }

  private buildAssignmentPrompt(data: AssignmentRequest): string {
    const pagesToWords = data.numberOfPages * 500; // Approximately 500 words per A4 page
    
    return `Please generate a comprehensive academic assignment for the following details:

Student Information:
- Name: ${data.name}
- Matric Number: ${data.matric}
- Department: ${data.department}

Course Information:
- Course Code: ${data.courseCode}
- Course Title: ${data.courseTitle}
- Lecturer-in-Charge: ${data.lecturerInCharge}
- Required Length: ${data.numberOfPages} pages (approximately ${pagesToWords} words)

Assignment Question:
${data.question}

Please provide a complete, well-structured assignment that:
1. Directly addresses the question asked
2. Meets the specified page/word count requirement
3. Uses proper academic formatting with headings and subheadings
4. Includes relevant examples and case studies
5. Is suitable for Nigerian university academic standards
6. Has a clear introduction, well-developed main body, and conclusion
7. DOES NOT include any header information (name, matric, etc.) - this will be added separately
8. DOES NOT include any references, bibliography, citations, or works cited section
9. DOES NOT include any footnotes or endnotes
10. Write as a standalone academic essay without external citations

Format the response as a complete academic document ready for submission, starting directly with the content. Do not include any references or bibliography section.`;
  }

  async estimateWordCount(text: string): Promise<number> {
    return text.split(/\s+/).length;
  }

  async estimatePages(text: string): Promise<number> {
    const wordCount = await this.estimateWordCount(text);
    return Math.ceil(wordCount / 500); // Approximately 500 words per A4 page
  }
}

// Standalone function for easy importing
export async function generateContent(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  
  const geminiService = new GeminiService(apiKey);
  return geminiService.generateContent(prompt);
} 