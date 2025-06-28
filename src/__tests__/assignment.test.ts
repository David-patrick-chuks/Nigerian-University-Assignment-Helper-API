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

// Helper function to generate unique IP addresses for rate limiting isolation
let testCounter = 0;
const getUniqueIP = () => {
  testCounter++;
  return `192.168.1.${testCounter}`;
};

describe('Assignment Generation Endpoint', () => {
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

  describe('POST /api/assignments/generate', () => {
    it('should return a file download with correct headers', async () => {
      const response = await request(app)
        .post('/api/assignments/generate')
        .set('X-Forwarded-For', getUniqueIP())
        .send(validAssignmentData)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response.headers['content-disposition']).toContain('attachment; filename="test-assignment.docx"');
      expect(response.body).toBeDefined();
    });
  });

  describe('POST /api/assignments/generate-json', () => {
    it('should generate assignment JSON successfully with valid data', async () => {
      const response = await request(app)
        .post('/api/assignments/generate-json')
        .set('X-Forwarded-For', getUniqueIP())
        .send(validAssignmentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.assignment).toBeDefined();
      expect(response.body.data.pages).toBeDefined();
      expect(response.body.data.wordCount).toBeDefined();
      expect(response.body.data.timestamp).toBeDefined();
    });

    it('should reject request without name', async () => {
      const { name, ...invalidData } = validAssignmentData;
      const response = await request(app)
        .post('/api/assignments/generate-json')
        .set('X-Forwarded-For', getUniqueIP())
        .send(invalidData)
        .expect(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('name');
    });

    it('should reject request without matric', async () => {
      const { matric, ...invalidData } = validAssignmentData;
      const response = await request(app)
        .post('/api/assignments/generate-json')
        .set('X-Forwarded-For', getUniqueIP())
        .send(invalidData)
        .expect(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('matric');
    });

    it('should reject request without department', async () => {
      const { department, ...invalidData } = validAssignmentData;
      const response = await request(app)
        .post('/api/assignments/generate-json')
        .set('X-Forwarded-For', getUniqueIP())
        .send(invalidData)
        .expect(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('department');
    });

    it('should reject request without course code', async () => {
      const { courseCode, ...invalidData } = validAssignmentData;
      const response = await request(app)
        .post('/api/assignments/generate-json')
        .set('X-Forwarded-For', getUniqueIP())
        .send(invalidData)
        .expect(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('courseCode');
    });

    it('should reject request without course title', async () => {
      const { courseTitle, ...invalidData } = validAssignmentData;
      const response = await request(app)
        .post('/api/assignments/generate-json')
        .set('X-Forwarded-For', getUniqueIP())
        .send(invalidData)
        .expect(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('courseTitle');
    });

    it('should reject request without lecturer in charge', async () => {
      const { lecturerInCharge, ...invalidData } = validAssignmentData;
      const response = await request(app)
        .post('/api/assignments/generate-json')
        .set('X-Forwarded-For', getUniqueIP())
        .send(invalidData)
        .expect(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('lecturerInCharge');
    });

    it('should reject request without question', async () => {
      const { question, ...invalidData } = validAssignmentData;
      const response = await request(app)
        .post('/api/assignments/generate-json')
        .set('X-Forwarded-For', getUniqueIP())
        .send(invalidData)
        .expect(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('question');
    });

    it('should reject invalid file type', async () => {
      const invalidData = { ...validAssignmentData, fileType: 'invalid' };
      const response = await request(app)
        .post('/api/assignments/generate-json')
        .set('X-Forwarded-For', getUniqueIP())
        .send(invalidData)
        .expect(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('fileType');
    });

    it('should reject empty strings', async () => {
      const invalidData = {
        ...validAssignmentData,
        name: '',
        question: ''
      };
      const response = await request(app)
        .post('/api/assignments/generate-json')
        .set('X-Forwarded-For', getUniqueIP())
        .send(invalidData)
        .expect(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('name'); // Only the first error is checked
    });

    it('should reject very long question', async () => {
      const longQuestion = 'A'.repeat(5001); // Exceeds 5000 character limit
      const invalidData = { ...validAssignmentData, question: longQuestion };
      const response = await request(app)
        .post('/api/assignments/generate-json')
        .set('X-Forwarded-For', getUniqueIP())
        .send(invalidData)
        .expect(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('question');
    });

    it('should reject invalid number of pages', async () => {
      const invalidData = { ...validAssignmentData, numberOfPages: 0 };
      const response = await request(app)
        .post('/api/assignments/generate-json')
        .set('X-Forwarded-For', getUniqueIP())
        .send(invalidData)
        .expect(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('numberOfPages');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/assignments/generate-json')
        .set('X-Forwarded-For', getUniqueIP())
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Malformed JSON');
    });

    it('should handle missing request body', async () => {
      const response = await request(app)
        .post('/api/assignments/generate-json')
        .set('X-Forwarded-For', getUniqueIP())
        .expect(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('name');
    });

    it('should handle non-JSON content type', async () => {
      const response = await request(app)
        .post('/api/assignments/generate-json')
        .set('X-Forwarded-For', getUniqueIP())
        .set('Content-Type', 'text/plain')
        .send('plain text')
        .expect(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting Tests', () => {
    it('should allow requests within rate limit', async () => {
      const promises = Array(5).fill(null).map((_, index) =>
        request(app)
          .post('/api/assignments/generate-json')
          .set('X-Forwarded-For', `192.168.1.${100 + index}`)
          .send(validAssignmentData)
      );
      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should reject requests when rate limit exceeded', async () => {
      // Use the same IP for all requests to trigger rate limiting
      const promises = Array(15).fill(null).map(() =>
        request(app)
          .post('/api/assignments/generate-json')
          .set('X-Forwarded-For', '192.168.1.999')
          .send(validAssignmentData)
      );
      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      rateLimitedResponses.forEach(response => {
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('rate limit');
      });
    });
  });
}); 