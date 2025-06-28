import request from 'supertest';
import app from '../index';

describe('API Endpoints', () => {
  describe('GET /', () => {
    it('should return welcome message and API information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Nigerian University Assignment Helper API');
      expect(response.body.version).toBe('1.0.0');
      expect(response.body.documentation).toBe('/api/info');
      expect(response.body.health).toBe('/api/health');
    });
  });

  describe('GET /api/info', () => {
    it('should return API documentation and usage information', async () => {
      const response = await request(app)
        .get('/api/info')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Nigerian University Assignment Helper API');
      expect(response.body.data.version).toBe('1.0.0');
      expect(response.body.data.description).toContain('AI-powered assignment help');
      expect(response.body.data.endpoints).toBeDefined();
      expect(response.body.data.endpoints).toHaveProperty('POST /api/assignments/generate');
      expect(response.body.data.endpoints).toHaveProperty('POST /api/assignments/generate-json');
    });

    it('should include supported formats in documentation', async () => {
      const response = await request(app)
        .get('/api/info')
        .expect(200);

      expect(response.body.data.supportedFileTypes).toBeDefined();
      expect(response.body.data.supportedFileTypes).toContain('docx');
      expect(response.body.data.supportedFileTypes).toContain('pdf');
      expect(response.body.data.supportedFileTypes).toContain('doc');
      expect(response.body.data.supportedFileTypes).toContain('txt');
    });

    it('should include features information', async () => {
      const response = await request(app)
        .get('/api/info')
        .expect(200);

      expect(response.body.data.features).toBeDefined();
      expect(Array.isArray(response.body.data.features)).toBe(true);
      expect(response.body.data.features).toContain('AI-powered assignment generation');
    });
  });

  describe('GET /api/health', () => {
    it('should return API health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Assignment Helper API is running');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.version).toBe('1.0.0');
    });

    it('should return valid timestamp', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(0);
      expect(timestamp).toBeInstanceOf(Date);
    });
  });

  describe('404 Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Endpoint not found');
      expect(response.body.availableEndpoints).toBeDefined();
      expect(Array.isArray(response.body.availableEndpoints)).toBe(true);
    });

    it('should return 404 for root level non-existent paths', async () => {
      const response = await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Endpoint not found');
    });

    it('should include available endpoints in 404 response', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      const expectedEndpoints = [
        'GET /',
        'GET /api/health',
        'GET /api/info',
        'POST /api/assignments/generate',
        'POST /api/assignments/generate-json'
      ];

      expectedEndpoints.forEach(endpoint => {
        expect(response.body.availableEndpoints).toContain(endpoint);
      });
    });
  });

  describe('HTTP Method Validation', () => {
    it('should reject POST requests to GET endpoints', async () => {
      const response = await request(app)
        .post('/api/health')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Endpoint not found');
    });

    it('should reject GET requests to POST endpoints', async () => {
      const response = await request(app)
        .get('/api/assignments/generate')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Endpoint not found');
    });

    it('should reject PUT requests', async () => {
      const response = await request(app)
        .put('/api/health')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Endpoint not found');
    });

    it('should reject DELETE requests', async () => {
      const response = await request(app)
        .delete('/api/health')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Endpoint not found');
    });
  });

  describe('Request Logging', () => {
    it('should log requests with proper format', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await request(app)
        .get('/api/health')
        .expect(200);

      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls[0][0];
      expect(logCall).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z - GET \/api\/health - /);
      
      consoleSpy.mockRestore();
    });
  });

  describe('CORS Configuration', () => {
    it('should allow requests from allowed origins', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('should reject requests from disallowed origins', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://malicious-site.com')
        .expect(500); // CORS error

      expect(response.body.error).toContain('Not allowed by CORS');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers from Helmet', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      // Check for Helmet security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(response.headers['x-xss-protection']).toBe('0'); // Updated for newer Helmet versions
    });
  });
}); 