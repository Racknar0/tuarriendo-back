import express from 'express';
import authRoutes from './auth/index.js';
import userRoutes from './users/index.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);

export default router;