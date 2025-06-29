import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Job } from '../models/Job';
import { DocumentGenerator } from '../services/documentGenerator';
import { GeminiService } from '../services/geminiService';
import { AssignmentRequest, AssignmentResponse, DocumentFormat } from '../types/assignment';

const WORDS_PER_PAGE = 500;
const MIN_WORD_COUNT_RATIO = 0.9; // 90% of target word count
const MAX_EXPANSIONS = 3;

function autoGenerateSections(question: string, numberOfPages: number, wordCount?: number) {
  // Calculate total words
  const totalWords = wordCount || numberOfPages * WORDS_PER_PAGE;
  
  // More granular section splitting: aim for 400-600 words per section
  const targetSectionWords = Math.min(Math.max(400, Math.floor(totalWords / 8)), 600);
  
  // Reserve words for intro/conclusion
  const introWords = Math.round(WORDS_PER_PAGE * 0.7);
  const conclusionWords = Math.round(WORDS_PER_PAGE * 0.7);
  const bodyWords = totalWords - introWords - conclusionWords;
  
  // Calculate number of body sections based on target section size
  const numBodySections = Math.max(1, Math.ceil(bodyWords / targetSectionWords));
  const bodySectionWords = Math.floor(bodyWords / numBodySections);
  
  const sections = [
    { title: 'Introduction', prompt: `Write a comprehensive introduction for: ${question} (about ${introWords} words)` }
  ];
  
  // Generate more descriptive section titles for longer assignments
  const sectionTitles = generateSectionTitles(numBodySections, question);
  
  for (let i = 1; i <= numBodySections; i++) {
    sections.push({
      title: sectionTitles[i - 1],
      prompt: `Write a detailed section titled "${sectionTitles[i - 1]}" (about ${bodySectionWords} words) for: ${question}. Do not include a references or bibliography section. Nigerian university assignments do not require references.`
    });
  }
  
  sections.push({ 
    title: 'Conclusion', 
    prompt: `Write a comprehensive conclusion for: ${question} (about ${conclusionWords} words)` 
  });
  
  return sections;
}

function generateSectionTitles(numSections: number, question: string): string[] {
  // For longer assignments, use more descriptive titles
  if (numSections >= 4) {
    return [
      'Background and Context',
      'Main Arguments and Analysis',
      'Case Studies and Examples',
      'Critical Evaluation',
      ...Array.from({ length: numSections - 4 }, (_, i) => `Additional Analysis ${i + 1}`)
    ];
  } else if (numSections === 3) {
    return ['Background and Context', 'Main Analysis', 'Critical Evaluation'];
  } else if (numSections === 2) {
    return ['Main Analysis', 'Critical Evaluation'];
  } else {
    return ['Main Content'];
  }
}

export class AssignmentController {
  private geminiService: GeminiService;
  private documentGenerator: DocumentGenerator | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.geminiService = new GeminiService(apiKey);
    // Lazy load DocumentGenerator to avoid potential circular imports
  }

  private getDocumentGenerator(): DocumentGenerator {
    if (!this.documentGenerator) {
      this.documentGenerator = new DocumentGenerator();
    }
    return this.documentGenerator;
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

  // Unified assignment generation with job status and auto-sectioning
  async generateAssignment(req: Request, res: Response): Promise<void> {
    const assignmentData: AssignmentRequest = req.body;
    const { numberOfPages, wordCount, question } = assignmentData;
    // If a large assignment, use job model and async processing
    const needsJob = (numberOfPages && numberOfPages > 3) || (wordCount && wordCount > 1500);
    if (needsJob) {
      const jobId = uuidv4();
      await Job.create({ jobId, status: 'pending', progress: 0 });
      res.status(202).json({ success: true, jobId });
      (async () => {
        try {
          await Job.updateOne({ jobId }, { status: 'in_progress', progress: 0 });
          
          // Calculate target word count
          const targetWords = wordCount || numberOfPages * WORDS_PER_PAGE;
          
          // Auto-generate sections
          const sections = autoGenerateSections(question, numberOfPages || 0, wordCount);
          let combinedContent = '';
          const totalSections = sections.length;
          
          // Generate all initial sections
          for (let i = 0; i < totalSections; i++) {
            const section = sections[i];
            const aiResponse = await this.geminiService.generateAssignment({ ...assignmentData, question: section.prompt });
            combinedContent += `\n\n## ${section.title}\n\n${aiResponse}`;
            const progress = Math.round(((i + 1) / totalSections) * 100);
            await Job.updateOne({ jobId }, { progress });
          }
          
          // Check word count and expand if needed
          let currentWordCount = await this.geminiService.estimateWordCount(combinedContent);
          let expansionCount = 0;
          
          while (currentWordCount < targetWords * MIN_WORD_COUNT_RATIO && expansionCount < MAX_EXPANSIONS) {
            expansionCount++;
            const remainingWords = targetWords - currentWordCount;
            const expansionWords = Math.min(remainingWords, 800); // Cap expansion at 800 words per iteration
            
            const expansionPrompt = `Expand on the previous content for this assignment. Add more depth, analysis, and examples to reach approximately ${expansionWords} additional words. Do not repeat or summarize what has already been written. Focus on providing new insights, additional examples, or deeper analysis. Do not include references or bibliography. Original question: ${question}`;
            
            const expansionResponse = await this.geminiService.generateAssignment({ 
              ...assignmentData, 
              question: expansionPrompt 
            });
            
            combinedContent += `\n\n## Additional Analysis ${expansionCount}\n\n${expansionResponse}`;
            
            // Update progress to show expansion is happening
            const expansionProgress = Math.round((100 + (expansionCount * 10)) / (1 + MAX_EXPANSIONS * 0.1));
            await Job.updateOne({ jobId }, { progress: Math.min(expansionProgress, 95) });
            
            // Recalculate word count
            currentWordCount = await this.geminiService.estimateWordCount(combinedContent);
          }
          
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
            content: combinedContent.slice(0, 50000) // Cap content to 50,000 chars
          };
          
          // Generate the document file
          const documentResult = await this.getDocumentGenerator().generateDocument(
            documentFormat,
            assignmentData.fileType
          );
          
          await Job.updateOne({ jobId }, { 
            status: 'completed', 
            progress: 100, 
            result: {
              fileName: documentResult.fileName,
              mimeType: documentResult.mimeType,
              buffer: documentResult.buffer.toString('base64'),
              finalWordCount: currentWordCount,
              targetWordCount: targetWords,
              expansionsUsed: expansionCount
            }
          });
        } catch (error) {
          await Job.updateOne({ jobId }, { status: 'failed', error: error instanceof Error ? error.message : 'An unexpected error occurred' });
        }
      })();
      return;
    }
    // For small assignments, generate in one go
    try {
      const assignmentContent = await this.geminiService.generateAssignment(assignmentData);
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
        content: assignmentContent.slice(0, 50000) // Cap content to 50,000 chars
      };
      const documentResult = await this.getDocumentGenerator().generateDocument(
        documentFormat,
        assignmentData.fileType
      );
      res.setHeader('Content-Type', documentResult.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${documentResult.fileName}"`);
      res.setHeader('Content-Length', documentResult.buffer.length);
      res.send(documentResult.buffer);
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' });
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

  // Get job status/result
  async getJobStatus(req: Request, res: Response): Promise<void> {
    const { jobId } = req.params;
    const job = await Job.findOne({ jobId });
    if (!job) {
      res.status(404).json({ success: false, error: 'Job not found' });
      return;
    }
    res.json({
      success: true,
      status: job.status,
      progress: job.progress,
      result: job.status === 'completed' ? job.result : undefined,
      error: job.status === 'failed' ? job.error : undefined
    });
  }
} 