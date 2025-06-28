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

  private buildSystemPrompt(): string {
    return `You are an expert academic assistant for Nigerian university students. Your role is to help students with their assignments by providing comprehensive, well-structured, and academically sound responses.

Key Guidelines:
1. Provide detailed, comprehensive answers that meet the specified page requirements
2. Use proper academic writing style and formatting
3. Include relevant examples, citations, and references where appropriate
4. Structure your response with clear headings, subheadings, and paragraphs
5. Ensure the content is relevant to Nigerian university standards
6. Use formal academic language while maintaining clarity
7. Include introduction, main body, and conclusion sections
8. Provide practical examples and case studies relevant to the Nigerian context when applicable
9. DO NOT include any header information like student name, matric number, etc. in your response
10. Focus only on the academic content of the assignment

Format your response as a complete academic assignment with proper structure and formatting, but without any header information.`;
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
4. Includes relevant examples and references
5. Is suitable for Nigerian university academic standards
6. Has a clear introduction, well-developed main body, and conclusion
7. DOES NOT include any header information (name, matric, etc.) - this will be added separately

Format the response as a complete academic document ready for submission, starting directly with the content.`;
  }

  async estimateWordCount(text: string): Promise<number> {
    return text.split(/\s+/).length;
  }

  async estimatePages(text: string): Promise<number> {
    const wordCount = await this.estimateWordCount(text);
    return Math.ceil(wordCount / 500); // Approximately 500 words per A4 page
  }
} 