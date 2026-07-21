const test = require('node:test');
const assert = require('node:assert/strict');
const { registerUser, loginUser } = require('./auth.js');

test('registerUser creates a new account and loginUser accepts it', () => {
  const users = registerUser('tester', 'secret123');
  assert.ok(users.tester);
  assert.equal(users.tester.password, 'secret123');
  assert.equal(loginUser('tester', 'secret123'), true);
  assert.equal(loginUser('tester', 'wrong'), false);
});

test('loginUser rejects unknown users', () => {
  assert.equal(loginUser('ghost', 'none'), false);
});
