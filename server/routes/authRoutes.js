import { Router } from 'express';
import { register, login, guest, me } from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { registerSchema, loginSchema, guestSchema } from '../validation/authSchemas.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/guest', authLimiter, validate(guestSchema), guest);
router.get('/me', requireAuth, me);

export default router;
