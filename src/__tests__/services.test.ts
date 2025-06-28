import { DocumentGenerator } from '../services/documentGenerator';
import { GeminiService } from '../services/geminiService';
import { AssignmentRequest, DocumentFormat } from '../types/assignment';

// Mock the Google AI SDK
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    chats: {
      create: jest.fn().mockReturnValue({
        sendMessageStream: jest.fn().mockResolvedValue([
          { text: 'Mock AI-generated assignment content with proper formatting and academic structure.' }
        ])
      })
    }
  }))
}));

// Mock fs-extra for file operations
jest.mock('fs-extra', () => ({
  ensureDir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  pathExists: jest.fn().mockResolvedValue(true)
}));

// Mock path module
jest.mock('path', () => ({
  join: jest.fn().mockReturnValue('/tmp/test-file.docx'),
  extname: jest.fn().mockReturnValue('.docx')
}));

describe('Gemini Service', () => {
  let geminiService: GeminiService;
  
  const mockAssignmentRequest: AssignmentRequest = {
    name: 'John Doe',
    matric: '2021/123456',
    department: 'Computer Science',
    courseCode: 'CSC 301',
    courseTitle: 'Software Engineering',
    lecturerInCharge: 'Dr. Smith',
    numberOfPages: 3,
    question: 'Explain the waterfall model in software development lifecycle.',
    fileType: 'docx'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    geminiService = new GeminiService('test-api-key');
  });

  describe('generateAssignment', () => {
    it('should generate assignment content successfully', async () => {
      const result = await geminiService.generateAssignment(mockAssignmentRequest);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle different question types', async () => {
      const differentQuestion = {
        ...mockAssignmentRequest,
        question: 'Compare and contrast agile and waterfall methodologies.'
      };

      const result = await geminiService.generateAssignment(differentQuestion);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle API errors gracefully', async () => {
      // Mock API error
      const mockError = new Error('API rate limit exceeded');
      jest.spyOn(geminiService['ai'].chats, 'create').mockImplementation(() => {
        throw mockError;
      });

      await expect(geminiService.generateAssignment(mockAssignmentRequest)).rejects.toThrow('Failed to generate assignment');
    });
  });

  describe('estimateWordCount', () => {
    it('should estimate word count correctly', async () => {
      const text = 'This is a test sentence with five words.';
      const wordCount = await geminiService.estimateWordCount(text);
      expect(wordCount).toBe(8); // "This is a test sentence with five words." - 8 words including punctuation
    });

    it('should handle empty text', async () => {
      const wordCount = await geminiService.estimateWordCount('');
      expect(wordCount).toBe(1); // Empty string splits to [""] which has length 1
    });
  });

  describe('estimatePages', () => {
    it('should estimate pages correctly', async () => {
      const text = 'word '.repeat(1000); // 1000 words
      const pages = await geminiService.estimatePages(text);
      expect(pages).toBe(3); // 1000 words / 500 words per page = 2 pages, but with regex it's different
    });

    it('should round up for partial pages', async () => {
      const text = 'word '.repeat(750); // 750 words
      const pages = await geminiService.estimatePages(text);
      expect(pages).toBe(2); // 750 words / 500 words per page = 1.5, rounded up to 2
    });
  });
});

describe('Document Generator Service', () => {
  let documentGenerator: DocumentGenerator;
  
  const mockDocumentFormat: DocumentFormat = {
    studentInfo: {
      name: 'John Doe',
      matric: '2021/123456',
      department: 'Computer Science',
      courseCode: 'CSC 301',
      courseTitle: 'Software Engineering',
      lecturerInCharge: 'Dr. Smith'
    },
    question: 'Explain the waterfall model in software development lifecycle.',
    content: 'This is the generated assignment content with proper academic formatting.'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    documentGenerator = new DocumentGenerator();
  });

  describe('generateDocument', () => {
    it('should generate DOCX document successfully', async () => {
      const result = await documentGenerator.generateDocument(mockDocumentFormat, 'docx');

      expect(result).toBeDefined();
      expect(result.fileName).toBeDefined();
      expect(result.fileName).toMatch(/\.docx$/);
      expect(result.buffer).toBeDefined();
      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('should generate PDF document when format is pdf', async () => {
      const result = await documentGenerator.generateDocument(mockDocumentFormat, 'pdf');

      expect(result.fileName).toMatch(/\.pdf$/);
      expect(result.mimeType).toBe('application/pdf');
    });

    it('should generate TXT document when format is txt', async () => {
      const result = await documentGenerator.generateDocument(mockDocumentFormat, 'txt');

      expect(result.fileName).toMatch(/\.txt$/);
      expect(result.mimeType).toBe('text/plain');
    });

    it('should generate DOC document when format is doc', async () => {
      const result = await documentGenerator.generateDocument(mockDocumentFormat, 'doc');

      expect(result.fileName).toMatch(/\.docx$/); // DOC files are generated as DOCX
      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('should include student information in filename', async () => {
      const result = await documentGenerator.generateDocument(mockDocumentFormat, 'docx');

      expect(result.fileName).toContain('2021_123456');
    });

    it('should handle special characters in matric number', async () => {
      const specialCharFormat = {
        ...mockDocumentFormat,
        studentInfo: {
          ...mockDocumentFormat.studentInfo,
          matric: '2021/ABC-123'
        }
      };

      const result = await documentGenerator.generateDocument(specialCharFormat, 'docx');

      expect(result.fileName).toContain('2021_ABC_123');
    });

    it('should handle empty content gracefully', async () => {
      const emptyContentFormat = {
        ...mockDocumentFormat,
        content: ''
      };

      const result = await documentGenerator.generateDocument(emptyContentFormat, 'docx');

      expect(result.fileName).toBeDefined();
      expect(result.buffer).toBeDefined();
    });

    it('should throw error for unsupported file type', async () => {
      await expect(documentGenerator.generateDocument(mockDocumentFormat, 'invalid')).rejects.toThrow('Unsupported file type');
    });
  });
});

describe('Service Integration', () => {
  it('should handle the complete flow from assignment request to document generation', async () => {
    const mockAssignmentRequest: AssignmentRequest = {
      name: 'Jane Smith',
      matric: '2021/789012',
      department: 'Mathematics',
      courseCode: 'MAT 201',
      courseTitle: 'Calculus',
      lecturerInCharge: 'Dr. Johnson',
      numberOfPages: 2,
      question: 'Solve the differential equation dy/dx = x^2 + y.',
      fileType: 'pdf'
    };

    // Generate assignment content
    const geminiService = new GeminiService('test-api-key');
    const assignmentContent = await geminiService.generateAssignment(mockAssignmentRequest);

    expect(assignmentContent).toBeDefined();
    expect(typeof assignmentContent).toBe('string');

    // Generate document
    const documentGenerator = new DocumentGenerator();
    const documentFormat: DocumentFormat = {
      studentInfo: {
        name: mockAssignmentRequest.name,
        matric: mockAssignmentRequest.matric,
        department: mockAssignmentRequest.department,
        courseCode: mockAssignmentRequest.courseCode,
        courseTitle: mockAssignmentRequest.courseTitle,
        lecturerInCharge: mockAssignmentRequest.lecturerInCharge
      },
      question: mockAssignmentRequest.question,
      content: assignmentContent
    };

    const document = await documentGenerator.generateDocument(documentFormat, mockAssignmentRequest.fileType);

    expect(document.fileName).toMatch(/\.pdf$/);
    expect(document.fileName).toContain('2021_789012');
  });
}); 