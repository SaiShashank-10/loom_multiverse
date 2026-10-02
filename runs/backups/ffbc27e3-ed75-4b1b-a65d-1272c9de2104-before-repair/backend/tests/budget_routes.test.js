const request = require('supertest');
const app = require('../../server'); // Adjust the path as necessary

describe('Budget Routes', () => {
  let token;

  beforeAll(async () => {
    // Assuming there's a user creation endpoint for testing purposes
    const res = await request(app)
      .post('/api/user')
      .send({ username: 'testuser', email: 'test@example.com', password: 'password' });

    token = res.body.token;
  });

  describe('GET /api/budget/:userId', () => {
    it('should return a list of budgets for the user', async () => {
      const res = await request(app)
        .get('/api/budget/123') // Replace with actual user ID
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.budgets)).toBe(true);
    });

    it('should return a 404 error if the user has no budgets', async () => {
      const res = await request(app)
        .get('/api/budget/0') // Replace with non-existent user ID
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should return a 401 error if the token is invalid', async () => {
      const res = await request(app)
        .get('/api/budget/123') // Replace with actual user ID
        .set('Authorization', 'Bearer invalid_token');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/budget', () => {
    it('should create a new budget for the user', async () => {
      const res = await request(app)
        .post('/api/budget')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: '123', // Replace with actual user ID
          amount: 500,
          category: 'Groceries',
          date: new Date()
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Budget set successfully');
    });

    it('should return a 400 error if the budget data is invalid', async () => {
      const res = await request(app)
        .post('/api/budget')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: '123', // Replace with actual user ID
          amount: -500,
          category: '',
          date: new Date()
        });

      expect(res.status).toBe(400);
    });

    it('should return a 401 error if the token is invalid', async () => {
      const res = await request(app)
        .post('/api/budget')
        .set('Authorization', 'Bearer invalid_token')
        .send({
          userId: '123', // Replace with actual user ID
          amount: 500,
          category: 'Groceries',
          date: new Date()
        });

      expect(res.status).toBe(401);
    });
  });
});