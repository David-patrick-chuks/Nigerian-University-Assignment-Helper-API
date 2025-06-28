import { Request, Response } from 'express';
import { DocumentGenerator } from '../services/documentGenerator';
import { GeminiService } from '../services/geminiService';
import { AssignmentRequest, AssignmentResponse, DocumentFormat } from '../types/assignment';

export class AssignmentController {
  private geminiService: GeminiService;
  private documentGenerator: DocumentGenerator;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.geminiService = new GeminiService(apiKey);
    this.documentGenerator = new DocumentGenerator();
  }

  // Function to clean Markdown syntax from text (same as in DocumentGenerator)
  private cleanMarkdown(text: string): string {
    return text
      // Remove markdown headers (##, ###, etc.)
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold syntax (**text** or __text__) - more comprehensive
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      // Remove italic syntax (*text* or _text_) - more comprehensive
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      // Remove code blocks (```text```)
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code (`text`)
      .replace(/`(.*?)`/g, '$1')
      // Remove links [text](url)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove horizontal rules (---, ***, ___)
      .replace(/^[-*_]{3,}$/gm, '')
      // Remove any remaining asterisks that might be used for bullet points
      .replace(/^\s*\*\s+/gm, '• ') // Replace * with bullet point
      // Remove asterisks at the end of words or sentences (like "Lukiiko*")
      .replace(/\*(\s|$)/g, '$1') // Remove asterisks followed by space or end of line
      .replace(/(\w)\*/g, '$1') // Remove asterisks at the end of words
      // Remove any remaining asterisks in the middle of text (but not at the beginning of lines)
      .replace(/(?<!^)\*(?!\s)/g, '') // Remove asterisks not at line start
      // Clean up extra whitespace
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  }

  async generateAssignment(req: Request, res: Response): Promise<void> {
    try {
      const assignmentData: AssignmentRequest = req.body;

      // Generate the assignment content using Gemini AI
      const assignmentContent = await this.geminiService.generateAssignment(assignmentData);

      // Calculate word count and estimated pages
      const wordCount = await this.geminiService.estimateWordCount(assignmentContent);
      const estimatedPages = await this.geminiService.estimatePages(assignmentContent);

      // Prepare document format
      const documentFormat: DocumentFormat = {
        studentInfo: {
          name: assignmentData.name,
          matric: assignmentData.matric,
          department: assignmentData.department,
          courseCode: assignmentData.courseCode,
          courseTitle: assignmentData.courseTitle,
          lecturerInCharge: assignmentData.lecturerInCharge
        },
        question: assignmentData.question,
        content: assignmentContent
      };

      // Generate the document file
      const documentResult = await this.documentGenerator.generateDocument(
        documentFormat, 
        assignmentData.fileType
      );

      // Set response headers for file download
      res.setHeader('Content-Type', documentResult.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${documentResult.fileName}"`);
      res.setHeader('Content-Length', documentResult.buffer.length);

      // Send the file buffer
      res.send(documentResult.buffer);

    } catch (error) {
      console.error('Error in generateAssignment:', error);
      
      // If headers haven't been sent yet, send JSON error response
      if (!res.headersSent) {
        const errorResponse: AssignmentResponse = {
          success: false,
          error: error instanceof Error ? error.message : 'An unexpected error occurred'
        };

        res.status(500).json(errorResponse);
      }
    }
  }

  async generateAssignmentJson(req: Request, res: Response): Promise<void> {
    try {
      const assignmentData: AssignmentRequest = req.body;

      // Generate the assignment content using Gemini AI
      const assignmentContent = await this.geminiService.generateAssignment(assignmentData);

      // Clean the Markdown syntax from the content
      const cleanedContent = this.cleanMarkdown(assignmentContent);

      // Calculate word count and estimated pages
      const wordCount = await this.geminiService.estimateWordCount(cleanedContent);
      const estimatedPages = await this.geminiService.estimatePages(cleanedContent);

      const response: AssignmentResponse = {
        success: true,
        data: {
          assignment: cleanedContent,
          pages: estimatedPages,
          wordCount,
          timestamp: new Date().toISOString()
        }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in generateAssignmentJson:', error);
      
      const errorResponse: AssignmentResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };

      res.status(500).json(errorResponse);
    }
  }

  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        message: 'Assignment Helper API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Health check failed'
      });
    }
  }

  async getApiInfo(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        data: {
          name: 'Nigerian University Assignment Helper API',
          version: '1.0.0',
          description: 'AI-powered assignment help for Nigerian university students',
          endpoints: {
            'POST /api/assignments/generate': 'Generate an assignment file (doc, docx, pdf, txt)',
            'POST /api/assignments/generate-json': 'Generate an assignment (JSON response)',
            'GET /api/health': 'Health check',
            'GET /api/info': 'API information'
          },
          features: [
            'AI-powered assignment generation',
            'Academic formatting',
            'Nigerian university standards',
            'Customizable page requirements',
            'Multiple file formats (doc, docx, pdf, txt)',
            'Proper document formatting with student info and question header',
            'Rate limiting for fair usage'
          ],
          supportedFileTypes: ['doc', 'docx', 'pdf', 'txt']
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get API information'
      });
    }
  }
} 