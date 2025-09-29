import { Request, Response } from 'express';
import authService from '../services/authService';

const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({ user });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
};

const login = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('request is comming for login. ');

    const token = await authService.login(req.body);
    res.status(200).json({ token });
  } catch (err) {
    res.status(401).json({ error: (err as Error).message });
  }
};

const tokenValidated = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ valid: true, user: req.user });
};

export const authController = { register, login, tokenValidated };
