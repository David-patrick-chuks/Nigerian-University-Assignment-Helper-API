import request from 'supertest';
import app from '../index';

describe('Health Check Endpoint', () => {
  it('should return API health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('message');
  });
}); 