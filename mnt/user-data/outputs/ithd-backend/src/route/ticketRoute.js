// backend/src/route/ticketRoute.js
import express from 'express';
import {
    getTickets,
    getTicketById,
    createTicket,
    updateTicket,
    deleteTicket,
    getTicketStats
} from '../controller/ticketController.js';
import { verifyToken, filterByEmpCode, checkCC7510 } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Ticket routes
 * All routes require verifyToken middleware
 * filterByEmpCode extracts user info and sets isITStaff flag
 */

// GET all tickets (filtered by empCode for end users)
router.get('/tickets', verifyToken, filterByEmpCode, getTickets);

// GET single ticket
router.get('/tickets/:ticketId', verifyToken, filterByEmpCode, getTicketById);

// GET ticket statistics
router.get('/tickets/stats', verifyToken, filterByEmpCode, getTicketStats);

// CREATE new ticket (any authenticated user)
router.post('/tickets', verifyToken, filterByEmpCode, createTicket);

// UPDATE ticket (IT Staff only - CC 7510)
router.put('/tickets/:ticketId', verifyToken, filterByEmpCode, checkCC7510, updateTicket);

// DELETE ticket (IT Staff only - CC 7510)
router.delete('/tickets/:ticketId', verifyToken, filterByEmpCode, checkCC7510, deleteTicket);

export default router;
