import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import leaderboardRoutes from './leaderboardRoutes.js';
import { wordService } from '../services/wordService.js';

const router = Router();

router.get('/health', (_req, res) =>
  res.json({ status: 'ok', wordPool: wordService.poolSize(), time: Date.now() })
);

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/leaderboard', leaderboardRoutes);

export default router;
