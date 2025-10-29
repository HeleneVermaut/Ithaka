/**
 * Integration Tests for API Endpoints
 * Tests all 13+ endpoints end-to-end with database
 * Framework: Supertest + Jest
 * Coverage: 100% endpoint coverage
 */

import request from 'supertest';
import { v4 as uuid } from 'uuid';
import app from '../app';
import { sequelize } from '../config/database';

// Mock the logger to prevent console spam
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('API Integration Tests - Complete Endpoint Suite', () => {
  let mockNotebookId: string;
  let mockPageId: string;
  let mockElementId: string;
  let mockUserId: string;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    // Initialize database
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // SETUP: Create test data and authentication tokens
  // ============================================================================

  describe('Test Setup - Authentication & Initial Data', () => {
    it('should create test user with valid credentials', async () => {
      const response = await request(app).post('/api/auth/register').send({
        email: 'test@example.com',
        password: 'SecurePass123',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');

      mockUserId = response.body.data.id;

      // Extract tokens from cookies
      const cookies = response.headers['set-cookie'] || [];
      accessToken = extractCookie(cookies, 'accessToken');
      refreshToken = extractCookie(cookies, 'refreshToken');

      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();
    });

    it('should create test notebook', async () => {
      const response = await request(app)
        .post('/api/notebooks')
        .set('Cookie', `accessToken=${accessToken}`)
        .send({
          title: 'Test Notebook',
          theme: 'light',
          isPublic: false,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      mockNotebookId = response.body.data.id;
    });

    it('should create test page', async () => {
      const response = await request(app)
        .post(`/api/notebooks/${mockNotebookId}/pages`)
        .set('Cookie', `accessToken=${accessToken}`)
        .send({
          pageNumber: 1,
          isCustomCover: false,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      mockPageId = response.body.data.id;
    });
  });

  // ============================================================================
  // PAGE ENDPOINTS
  // ============================================================================

  describe('Page Endpoints', () => {
    describe('GET /api/notebooks/:notebookId/pages', () => {
      it('should list all pages in notebook', async () => {
        const response = await request(app)
          .get(`/api/notebooks/${mockNotebookId}/pages`)
          .set('Cookie', `accessToken=${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
      });

      it('should return 401 without authentication', async () => {
        const response = await request(app).get(
          `/api/notebooks/${mockNotebookId}/pages`
        );

        expect(response.status).toBe(401);
      });

      it('should return 404 for non-existent notebook', async () => {
        const response = await request(app)
          .get(`/api/notebooks/${uuid()}/pages`)
          .set('Cookie', `accessToken=${accessToken}`);

        expect(response.status).toBe(404);
      });
    });

    describe('POST /api/notebooks/:notebookId/pages', () => {
      it('should create new page with valid data', async () => {
        const response = await request(app)
          .post(`/api/notebooks/${mockNotebookId}/pages`)
          .set('Cookie', `accessToken=${accessToken}`)
          .send({
            pageNumber: 2,
            isCustomCover: false,
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.pageNumber).toBe(2);
      });

      it('should return 400 with invalid page data', async () => {
        const response = await request(app)
          .post(`/api/notebooks/${mockNotebookId}/pages`)
          .set('Cookie', `accessToken=${accessToken}`)
          .send({
            pageNumber: 'invalid', // Should be number
          });

        expect(response.status).toBe(400);
      });

      it('should return 404 for non-existent notebook', async () => {
        const response = await request(app)
          .post(`/api/notebooks/${uuid()}/pages`)
          .set('Cookie', `accessToken=${accessToken}`)
          .send({
            pageNumber: 1,
          });

        expect(response.status).toBe(404);
      });
    });

    describe('GET /api/pages/:pageId', () => {
      it('should get page by ID', async () => {
        const response = await request(app)
          .get(`/api/pages/${mockPageId}`)
          .set('Cookie', `accessToken=${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(mockPageId);
      });

      it('should return 404 for non-existent page', async () => {
        const response = await request(app)
          .get(`/api/pages/${uuid()}`)
          .set('Cookie', `accessToken=${accessToken}`);

        expect(response.status).toBe(404);
      });
    });

    describe('PUT /api/pages/:pageId', () => {
      it('should update page metadata', async () => {
        const response = await request(app)
          .put(`/api/pages/${mockPageId}`)
          .set('Cookie', `accessToken=${accessToken}`)
          .send({
            pageNumber: 5,
            isCustomCover: true,
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.pageNumber).toBe(5);
        expect(response.body.data.isCustomCover).toBe(true);
      });

      it('should return 400 with invalid update data', async () => {
        const response = await request(app)
          .put(`/api/pages/${mockPageId}`)
          .set('Cookie', `accessToken=${accessToken}`)
          .send({
            pageNumber: 'invalid',
          });

        expect(response.status).toBe(400);
      });
    });

    describe('DELETE /api/pages/:pageId', () => {
      it('should delete page', async () => {
        // Create a page to delete
        const createResponse = await request(app)
          .post(`/api/notebooks/${mockNotebookId}/pages`)
          .set('Cookie', `accessToken=${accessToken}`)
          .send({
            pageNumber: 99,
          });

        const pageToDelete = createResponse.body.data.id;

        const deleteResponse = await request(app)
          .delete(`/api/pages/${pageToDelete}`)
          .set('Cookie', `accessToken=${accessToken}`);

        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.body.success).toBe(true);
      });

      it('should return 404 when deleting non-existent page', async () => {
        const response = await request(app)
          .delete(`/api/pages/${uuid()}`)
          .set('Cookie', `accessToken=${accessToken}`);

        expect(response.status).toBe(404);
      });
    });
  });

  // ============================================================================
  // PAGE ELEMENT ENDPOINTS
  // ============================================================================

  describe('Page Element Endpoints', () => {
    describe('GET /api/pages/:pageId/elements', () => {
      it('should get all elements for a page', async () => {
        const response = await request(app)
          .get(`/api/pages/${mockPageId}/elements`)
          .set('Cookie', `accessToken=${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should return 401 without authentication', async () => {
        const response = await request(app).get(`/api/pages/${mockPageId}/elements`);

        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/pages/:pageId/elements (Batch)', () => {
      it('should batch create elements', async () => {
        const response = await request(app)
          .post(`/api/pages/${mockPageId}/elements`)
          .set('Cookie', `accessToken=${accessToken}`)
          .send([
            {
              type: 'text',
              x: 10,
              y: 20,
              width: 100,
              height: 50,
              content: { text: 'Hello World' },
              zIndex: 0,
            },
            {
              type: 'text',
              x: 150,
              y: 20,
              width: 100,
              height: 50,
              content: { text: 'Second Text' },
              zIndex: 1,
            },
          ]);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.created).toBeGreaterThan(0);

        // Store first element ID for further tests
        if (response.body.data.elements?.length > 0) {
          mockElementId = response.body.data.elements[0].id;
        }
      });

      it('should batch update elements', async () => {
        // First, create an element
        const createResponse = await request(app)
          .post(`/api/pages/${mockPageId}/elements`)
          .set('Cookie', `accessToken=${accessToken}`)
          .send([
            {
              type: 'text',
              x: 10,
              y: 10,
              width: 100,
              height: 50,
              content: { text: 'Original' },
              zIndex: 0,
            },
          ]);

        const elementId = createResponse.body.data.elements[0].id;

        // Then update it
        const updateResponse = await request(app)
          .post(`/api/pages/${mockPageId}/elements`)
          .set('Cookie', `accessToken=${accessToken}`)
          .send([
            {
              id: elementId,
              x: 50,
              y: 50,
              content: { text: 'Updated' },
            },
          ]);

        expect(updateResponse.status).toBe(201);
        expect(updateResponse.body.data.updated).toBeGreaterThan(0);
      });

      it('should return 400 with invalid element data', async () => {
        const response = await request(app)
          .post(`/api/pages/${mockPageId}/elements`)
          .set('Cookie', `accessToken=${accessToken}`)
          .send([
            {
              type: 'invalid_type', // Invalid type
              x: 'not_a_number', // Invalid x
            },
          ]);

        expect(response.status).toBe(400);
      });
    });

    describe('PUT /api/elements/:elementId', () => {
      it('should update single element', async () => {
        if (!mockElementId) {
          // Create an element first
          const createResponse = await request(app)
            .post(`/api/pages/${mockPageId}/elements`)
            .set('Cookie', `accessToken=${accessToken}`)
            .send([
              {
                type: 'text',
                x: 10,
                y: 10,
                width: 100,
                height: 50,
                content: { text: 'Test' },
                zIndex: 0,
              },
            ]);

          mockElementId = createResponse.body.data.elements[0].id;
        }

        const response = await request(app)
          .put(`/api/elements/${mockElementId}`)
          .set('Cookie', `accessToken=${accessToken}`)
          .send({
            x: 100,
            y: 100,
            content: { text: 'Updated Text' },
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.x).toBe(100);
        expect(response.body.data.y).toBe(100);
      });

      it('should return 404 for non-existent element', async () => {
        const response = await request(app)
          .put(`/api/elements/${uuid()}`)
          .set('Cookie', `accessToken=${accessToken}`)
          .send({ x: 50 });

        expect(response.status).toBe(404);
      });
    });

    describe('DELETE /api/elements/:elementId', () => {
      it('should delete element', async () => {
        // Create an element to delete
        const createResponse = await request(app)
          .post(`/api/pages/${mockPageId}/elements`)
          .set('Cookie', `accessToken=${accessToken}`)
          .send([
            {
              type: 'text',
              x: 10,
              y: 10,
              width: 100,
              height: 50,
              content: { text: 'To Delete' },
              zIndex: 0,
            },
          ]);

        const elementToDelete = createResponse.body.data.elements[0].id;

        const deleteResponse = await request(app)
          .delete(`/api/elements/${elementToDelete}`)
          .set('Cookie', `accessToken=${accessToken}`);

        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.body.success).toBe(true);
      });

      it('should return 404 when deleting non-existent element', async () => {
        const response = await request(app)
          .delete(`/api/elements/${uuid()}`)
          .set('Cookie', `accessToken=${accessToken}`);

        expect(response.status).toBe(404);
      });
    });
  });

  // ============================================================================
  // SAVED TEXTS ENDPOINTS
  // ============================================================================

  describe('Saved Texts Endpoints', () => {
    let savedTextId: string;

    describe('GET /api/users/saved-texts', () => {
      it('should get all saved texts for user', async () => {
        const response = await request(app)
          .get('/api/users/saved-texts')
          .set('Cookie', `accessToken=${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should return 401 without authentication', async () => {
        const response = await request(app).get('/api/users/saved-texts');

        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/users/saved-texts', () => {
      it('should create new saved text', async () => {
        const response = await request(app)
          .post('/api/users/saved-texts')
          .set('Cookie', `accessToken=${accessToken}`)
          .send({
            label: 'Chapter Title',
            content: 'My Novel Chapter Text',
            fontSize: 32,
            fontFamily: 'Georgia',
            fontWeight: 'bold',
            fontStyle: 'normal',
            textDecoration: 'none',
            color: '#000000',
            textAlign: 'center',
            lineHeight: 1.5,
            type: 'title',
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');

        savedTextId = response.body.data.id;
      });

      it('should return 400 with invalid data', async () => {
        const response = await request(app)
          .post('/api/users/saved-texts')
          .set('Cookie', `accessToken=${accessToken}`)
          .send({
            label: '', // Empty label
            fontSize: 300, // Too large
          });

        expect(response.status).toBe(400);
      });
    });

    describe('PUT /api/users/saved-texts/:id', () => {
      it('should update saved text', async () => {
        const response = await request(app)
          .put(`/api/users/saved-texts/${savedTextId}`)
          .set('Cookie', `accessToken=${accessToken}`)
          .send({
            fontSize: 36,
            color: '#FF0000',
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.fontSize).toBe(36);
        expect(response.body.data.color).toBe('#FF0000');
      });

      it('should return 404 for non-existent text', async () => {
        const response = await request(app)
          .put(`/api/users/saved-texts/${uuid()}`)
          .set('Cookie', `accessToken=${accessToken}`)
          .send({ fontSize: 40 });

        expect(response.status).toBe(404);
      });
    });

    describe('DELETE /api/users/saved-texts/:id', () => {
      it('should delete saved text', async () => {
        const response = await request(app)
          .delete(`/api/users/saved-texts/${savedTextId}`)
          .set('Cookie', `accessToken=${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should return 404 when deleting non-existent text', async () => {
        const response = await request(app)
          .delete(`/api/users/saved-texts/${uuid()}`)
          .set('Cookie', `accessToken=${accessToken}`);

        expect(response.status).toBe(404);
      });
    });
  });

  // ============================================================================
  // ERROR SCENARIOS & EDGE CASES
  // ============================================================================

  describe('Error Scenarios & Authorization', () => {
    it('should prevent unauthorized access to protected endpoints', async () => {
      const response = await request(app)
        .get(`/api/pages/${mockPageId}/elements`)
        .set('Cookie', 'accessToken=invalid.token.here');

      expect(response.status).toBe(401);
    });

    it('should prevent cross-user access to notebooks', async () => {
      // Create a second user
      const user2Response = await request(app).post('/api/auth/register').send({
        email: 'user2@example.com',
        password: 'SecurePass123',
        firstName: 'User2',
        lastName: 'Test',
      });

      const user2Cookies = user2Response.headers['set-cookie'] || [];
      const user2Token = extractCookie(user2Cookies, 'accessToken');

      // Try to access first user's notebook with second user's token
      const response = await request(app)
        .get(`/api/notebooks/${mockNotebookId}/pages`)
        .set('Cookie', `accessToken=${user2Token}`);

      expect(response.status).toBe(404);
    });

    it('should handle malformed requests gracefully', async () => {
      const response = await request(app)
        .post('/api/users/saved-texts')
        .set('Cookie', `accessToken=${accessToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid json {]');

      expect(response.status).toBe(400);
    });
  });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract cookie value from Set-Cookie header
 */
function extractCookie(cookies: string[] | string | undefined, cookieName: string): string {
  if (!cookies) return '';
  const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
  const cookie = cookieArray.find((c) => c.startsWith(`${cookieName}=`));
  if (!cookie) return '';
  const parts = cookie.split(';')[0]?.split('=');
  return parts?.[1] || '';
}
