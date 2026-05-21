import express from 'express';
import { login, logout, verifyToken } from '../controllers/authController.js';
import { verifyToken as verifyTokenMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/authen', login);
router.post('/logout', logout);
router.get('/verify', verifyTokenMiddleware, verifyToken);

export default router;
