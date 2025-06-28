import request from 'supertest';
import app from '../index';

// Mock the Gemini service to avoid actual API calls during testing
jest.mock('../services/geminiService', () => ({
  GeminiService: jest.fn().mockImplementation(() => ({
    generateAssignment: jest.fn().mockResolvedValue('Mock assignment content for testing purposes.'),
    estimateWordCount: jest.fn().mockResolvedValue(500),
    estimatePages: jest.fn().mockResolvedValue(1)
  }))
}));

// Mock the document generator to avoid file system operations
jest.mock('../services/documentGenerator', () => ({
  DocumentGenerator: jest.fn().mockImplementation(() => ({
    generateDocument: jest.fn().mockResolvedValue({
      buffer: Buffer.from('mock content'),
      fileName: 'test-assignment.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    })
  }))
}));

describe('Basic API Functionality', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Assignment Helper API is running');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.version).toBe('1.0.0');
    });
  });

  describe('API Information', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/api/info')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Nigerian University Assignment Helper API');
      expect(response.body.data.version).toBe('1.0.0');
      expect(response.body.data.supportedFileTypes).toContain('docx');
      expect(response.body.data.supportedFileTypes).toContain('pdf');
    });
  });

  describe('Root Endpoint', () => {
    it('should return welcome message', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Nigerian University Assignment Helper API');
      expect(response.body.version).toBe('1.0.0');
    });
  });

  describe('404 Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Endpoint not found');
      expect(response.body.availableEndpoints).toBeDefined();
    });
  });

  describe('Assignment Generation (JSON)', () => {
    const validAssignmentData = {
      name: 'John Doe',
      matric: '2021/123456',
      department: 'Computer Science',
      courseCode: 'CSC301',
      courseTitle: 'Software Engineering',
      lecturerInCharge: 'Dr. Smith',
      numberOfPages: 3,
      question: 'Explain the waterfall model in software development lifecycle.',
      fileType: 'docx'
    };

    it('should generate assignment JSON successfully', async () => {
      const response = await request(app)
        .post('/api/assignments/generate-json')
        .send(validAssignmentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.assignment).toBeDefined();
      expect(response.body.data.pages).toBeDefined();
      expect(response.body.data.wordCount).toBeDefined();
      expect(response.body.data.timestamp).toBeDefined();
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: 'John Doe',
        // Missing required fields
        question: 'Test question'
      };

      const response = await request(app)
        .post('/api/assignments/generate-json')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should validate file type', async () => {
      const invalidData = {
        ...validAssignmentData,
        fileType: 'invalid'
      };

      const response = await request(app)
        .post('/api/assignments/generate-json')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    });
  });

  describe('CORS', () => {
    it('should allow requests from localhost', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });
  });
}); 