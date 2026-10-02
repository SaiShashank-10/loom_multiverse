const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
process.env.DB_PATH = ':memory:';
const app = require('../server');
let server, base, token;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(base + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({email:'budget@test.com', password:'test-password'}) });
  token = (await response.json()).token;
});
after(() => new Promise(resolve => server.close(resolve)));
test('budget CRUD and user isolation', async () => {
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const create = await fetch(base + '/api/budget', {method:'POST', headers, body:JSON.stringify({amount:100,category:'Food',date:new Date().toISOString()})});
  assert.equal(create.status, 201);
  const list = await fetch(base + '/api/budget', {headers});
  const values = await list.json(); assert.equal(values.length, 1); assert.equal(values[0].amount, 100);
  const invalid = await fetch(base + '/api/budget', {method:'POST', headers, body:JSON.stringify({amount:'bad',category:'',date:'bad'})});
  assert.equal(invalid.status,400);
  assert.equal((await fetch(base + '/api/budget')).status,401);
  const other = await fetch(base + '/api/auth/register', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'other-budget@test.com',password:'test-password'})});
  const otherToken = (await other.json()).token;
  const isolated = await fetch(base + '/api/budget', {headers:{Authorization:`Bearer ${otherToken}`}});
  assert.deepEqual(await isolated.json(), []);
  assert.equal((await fetch(base + '/api/budget/' + values[0].id, {method:'DELETE',headers:{Authorization:`Bearer ${otherToken}`}})).status,404);
  assert.equal((await fetch(base + '/api/budget/' + values[0].id, {method:'DELETE',headers})).status,204);
});
