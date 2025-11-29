/**
 * Tests for utility routes
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import utilsRoutes from './utils';

describe('Utils Routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/utils', utilsRoutes);

  describe('POST /api/utils/parse-dates', () => {
    it('should parse "tomorrow" correctly', async () => {
      const response = await request(app)
        .post('/api/utils/parse-dates')
        .send({ input: 'tomorrow' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dates).toHaveLength(1);
      expect(response.body.data.dates[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should parse "next week" correctly', async () => {
      const response = await request(app)
        .post('/api/utils/parse-dates')
        .send({ input: 'next week' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dates.length).toBeGreaterThan(0);
    });

    it('should parse "next Friday and Saturday" correctly', async () => {
      const response = await request(app)
        .post('/api/utils/parse-dates')
        .send({ input: 'next Friday and Saturday' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dates.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array for unparseable input', async () => {
      const response = await request(app)
        .post('/api/utils/parse-dates')
        .send({ input: 'xyz123nonsense' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dates).toHaveLength(0);
    });

    it('should reject missing input', async () => {
      await request(app).post('/api/utils/parse-dates').send({}).expect(400);
    });

    it('should reject empty string', async () => {
      await request(app).post('/api/utils/parse-dates').send({ input: '' }).expect(400);
    });
  });
});
