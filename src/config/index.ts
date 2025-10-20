import dotenv from 'dotenv';

dotenv.config();

export default {
  port: parseInt(process.env.PORT || '8080'),
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
};
