import { Router } from 'express';
import { getProfile, getMyHistory } from '../controllers/userController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Protected: a registered user's own match history.
router.get('/me/history', requireAuth, getMyHistory);

// Public profile by username.
router.get('/:username', getProfile);

export default router;
