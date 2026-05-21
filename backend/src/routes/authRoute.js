// backend/src/routes/authRoute.js
import express from 'express';
import { login, logout, verifyToken } from '../controllers/authController.js';

const router = express.Router();

router.post('/authen', login);
router.post('/logout', logout);
router.get('/verify', verifyToken);

export default router;