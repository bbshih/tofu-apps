import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login } from '../controllers/authController.js';

const router = Router();

// Strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 minutes
  skipSuccessfulRequests: false,
  standardHeaders: true,
  message: 'Too many authentication attempts, please try again later',
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

export default router;
