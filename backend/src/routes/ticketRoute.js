// backend/src/route/ticketRoute.js
import express from 'express';
    getTickets,
    getTicketById,
    createTicket,
    updateTicket,
    deleteTicket,
    getTicketStats,
    getTicketHistory,
    addTicketComment
} from '../controllers/ticketController.js';
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

// UPDATE ticket
router.put('/tickets/:ticketId', verifyToken, filterByEmpCode, updateTicket);

// DELETE ticket (ticket owner or IT Staff)
router.delete('/tickets/:ticketId', verifyToken, filterByEmpCode, deleteTicket);

// GET ticket history
router.get('/tickets/:ticketId/history', verifyToken, filterByEmpCode, getTicketHistory);

// POST new comment
router.post('/tickets/:ticketId/comments', verifyToken, filterByEmpCode, addTicketComment);

export default router;
