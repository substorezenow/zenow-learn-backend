const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getUserByUsername, createUser } = require('../utils/userDb');

exports.register = async ({ username, password }) => {
  if (!username || !password) throw new Error('Username and password required');
  const existing = await getUserByUsername(username);
  if (existing) throw new Error('User already exists');
  const hash = await bcrypt.hash(password, 10);
  return createUser({ username, password: hash });
};

exports.login = async ({ username, password }) => {
  const user = await getUserByUsername(username);
  if (!user) throw new Error('Invalid credentials');
  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error('Invalid credentials');
  return jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1d' });
};
