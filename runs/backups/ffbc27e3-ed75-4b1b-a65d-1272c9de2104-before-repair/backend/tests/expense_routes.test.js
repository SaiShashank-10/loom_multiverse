const request = require('supertest');
const app = require('../../server'); // Adjust the path as necessary

describe('Expense Routes', () => {
  let token;

  beforeAll(async () => {
    // Assuming there's a user creation endpoint for testing purposes
    const response = await request(app)
      .post('/api/user')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });

    token = response.body.token;
  });

  describe('POST /api/expense', () => {
    it('should record a new expense for a user', async () => {
      const response = await request(app)
        .post('/api/expense')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 100,
          category: 'Groceries',
          date: new Date().toISOString()
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Expense recorded successfully');
    });

    it('should return a 401 error if the token is invalid', async () => {
      const response = await request(app)
        .post('/api/expense')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should return a 400 error if the input is invalid', async () => {
      const response = await request(app)
        .post('/api/expense')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 'invalid',
          category: 'Groceries',
          date: new Date().toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('amount must be a number');
    });
  });

  describe('GET /api/expense/user_id', () => {
    it('should fetch all expenses for a user', async () => {
      const response = await request(app)
        .get('/api/expense/testuser')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.expenses)).toBe(true);
    });

    it('should return a 401 error if the token is invalid', async () => {
      const response = await request(app)
        .get('/api/expense/testuser')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should return a 404 error if the user has no expenses', async () => {
      const response = await request(app)
        .get('/api/expense/nonexistentuser')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('No expenses found');
    });
  });

  afterAll(async () => {
    // Clean up any test data or resources
  });
});