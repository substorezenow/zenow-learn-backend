import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getUserByUsername, createUser } from '../utils/userDb';

interface LoginRequest {
  username: string;
  password: string;
}

export const register = async ({ username, password }: LoginRequest): Promise<any> => {
  if (!username || !password) throw new Error('Username and password required');
  const existing = await getUserByUsername(username);
  if (existing) throw new Error('User already exists');
  const hash = await bcrypt.hash(password, 10);
  return createUser({ username, password: hash });
};

export const login = async ({ username, password }: LoginRequest): Promise<string> => {
  const user = await getUserByUsername(username);
  if (!user) throw new Error('Invalid credentials');
  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error('Invalid credentials');
  return jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET as string, { expiresIn: '1d' });
};

export default { register, login };
