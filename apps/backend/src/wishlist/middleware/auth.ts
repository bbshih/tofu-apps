import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { WishlistAuthRequest } from '../types/index.js';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'default_secret';
    const decoded = jwt.verify(token, secret) as { id: number; email: string };
    (req as WishlistAuthRequest).user = decoded;
    next();
  } catch (_error) {
    return res.status(403).json({ _error: 'Invalid or expired token' });
  }
};
