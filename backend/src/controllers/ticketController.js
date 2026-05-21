// backend/src/controller/ticketController.js (UPDATED with dbo.ithd_)
import { sql, getPool } from '../config/db.js';
import { sendEmail } from '../config/emailConfig.js';
import { 
    ticketCreatedTemplate,
    ticketUpdatedTemplate,
    ticketAssignedTemplate,
    ticketCompletedTemplate,
    ticketCommentTemplate
} from '../utils/emailTemplates.js';
import { 
    getEmailByEmpCode, 
    getNameByEmpCode,
    syncUserFromDaikinAD 
} from '../services/userService.js';
import { logEmail } from '../services/emailLogService.js';

/**
 * Ticket Controller - Uses dbo.ithd_tickets table
 * All functions include error handling and email logging
 */

/**
 * GET all tickets or filtered by empCode
 */
export const getTickets = async (req, res) => {
    try {
        const pool = getPool();
        const query = 'SELECT * FROM dbo.ithd_tickets ORDER BY created_at DESC';
        const request = pool.request();
        const result = await request.query(query);

        res.json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('Get tickets error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
    }
};

/**
 * GET single ticket by ID
 */
export const getTicketById = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const pool = getPool();

        const ticketRequest = pool.request().input('id', sql.Int, ticketId);
        const ticketResult = await ticketRequest.query('SELECT * FROM dbo.ithd_tickets WHERE id = @id');

        if (ticketResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        const commentsResult = await pool.request()
            .input('ticket_id', sql.Int, ticketId)
            .query('SELECT id, ticket_id, empCode, comment, created_at FROM dbo.ithd_comments WHERE ticket_id = @ticket_id ORDER BY created_at DESC');

        res.json({
            success: true,
            data: {
                ...ticketResult.recordset[0],
                comments: commentsResult.recordset
            }
        });
    } catch (error) {
        console.error('Get ticket error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch ticket' });
    }
};

/**
 * CREATE new ticket in dbo.ithd_tickets
 * ✅ Syncs user to dbo.ithd_users + Sends email confirmation
 */
export const createTicket = async (req, res) => {
    try {
        const {
            request_type,
            project_name,
            device_type,
            device_count,
            location,
            priority,
            target_date,
            notes
        } = req.body;

        if (!project_name || !location) {
            return res.status(400).json({
                success: false,
                message: 'project_name and location are required'
            });
        }

        const pool = getPool();

        // Generate req_id in format: TICKET-DDMMYYxxxxx (5-digit running number, start at 00000)
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yy = String(now.getFullYear()).slice(-2);
        const prefix = `TICKET-${dd}${mm}${yy}`;

        // Find max existing sequence for today
        const seqResult = await pool.request()
            .input('prefix', sql.NVarChar, prefix)
            .query("SELECT MAX(CAST(RIGHT(req_id,5) AS INT)) AS maxSeq FROM dbo.ithd_tickets WHERE req_id LIKE @prefix + '%'");

        const maxSeq = seqResult.recordset && seqResult.recordset[0] && seqResult.recordset[0].maxSeq != null
            ? parseInt(seqResult.recordset[0].maxSeq, 10)
            : null;

        const nextSeq = (maxSeq !== null) ? (maxSeq + 1) : 0; // start from 00000 when none exist
        const seqStr = String(nextSeq).padStart(5, '0');
        const reqId = `${prefix}${seqStr}`;

        // ✅ Sync requester to dbo.ithd_users
        await syncUserFromDaikinAD(
            req.empCode,
            req.user.name,
            req.user.email,
            req.costCenter,
            req.user.sect
        );

        const result = await pool.request()
            .input('req_id', sql.NVarChar, reqId)
            .input('request_type', sql.NVarChar, request_type || 'Hardware Setup')
            .input('project_name', sql.NVarChar, project_name)
            .input('requester_name', sql.NVarChar, req.user.name)
            .input('requester_email', sql.NVarChar, req.user.email)
            .input('empCode_created', sql.NVarChar, req.empCode)
            .input('cost_center', sql.NVarChar, req.costCenter)
            .input('device_type', sql.NVarChar, device_type || 'Not Specified')
            .input('device_count', sql.Int, parseInt(device_count, 10) || 1)
            .input('location', sql.NVarChar, location)
            .input('status', sql.NVarChar, 'Pending')
            .input('priority', sql.NVarChar, priority || 'Normal')
            .input('target_date', sql.DateTime, target_date || new Date())
            .input('notes', sql.NVarChar, notes || '')
            .input('created_at', sql.DateTime, new Date())
            .input('updated_at', sql.DateTime, new Date())
            .query(`
                INSERT INTO dbo.ithd_tickets (
                    req_id, request_type, project_name, requester_name, requester_email,
                    empCode_created, cost_center, device_type, device_count,
                    location, status, priority, target_date, notes,
                    created_at, updated_at
                ) VALUES (
                    @req_id, @request_type, @project_name, @requester_name, @requester_email,
                    @empCode_created, @cost_center, @device_type, @device_count,
                    @location, @status, @priority, @target_date, @notes,
                    @created_at, @updated_at
                );
                SELECT SCOPE_IDENTITY() as id;
            `);

        const ticketId = result.recordset[0].id;

        // ✅ LOG History: Ticket Created
        await pool.request()
            .input('ticket_id', sql.Int, ticketId)
            .input('action_type', sql.VarChar(50), 'Created')
            .input('actor_empCode', sql.VarChar(50), req.empCode)
            .input('actor_name', sql.NVarChar(100), req.user.name)
            .input('details', sql.NVarChar(sql.MAX), 'Ticket opened by user')
            .query(`
                INSERT INTO dbo.ithd_ticket_history (ticket_id, action_type, actor_empCode, actor_name, details, created_at)
                VALUES (@ticket_id, @action_type, @actor_empCode, @actor_name, @details, GETDATE())
            `);

        // ✅ GET ticket details for email
        const ticketDetails = await pool.request()
            .input('id', sql.Int, ticketId)
            .query('SELECT * FROM dbo.ithd_tickets WHERE id = @id');

        const ticket = ticketDetails.recordset[0];

        // ✅ SEND EMAIL: Ticket created confirmation
        const emailTemplate = ticketCreatedTemplate(ticket, req.user.name);
        const emailResult = await sendEmail(
            req.user.email,
            emailTemplate.subject,
            emailTemplate.html
        );

        // ✅ LOG EMAIL
        await logEmail(
            ticketId,
            req.user.email,
            'Ticket Created',
            emailTemplate.subject,
            emailResult.success ? 'Sent' : 'Failed',
            emailResult.messageId || null,
            emailResult.success ? null : emailResult.error
        );

        res.status(201).json({
            success: true,
            message: 'Ticket created successfully',
            emailSent: emailResult.success,
            data: {
                id: ticketId,
                req_id: reqId
            }
        });
    } catch (error) {
        console.error('Create ticket error:', error);
        res.status(500).json({ success: false, message: 'Failed to create ticket' });
    }
};

/**
 * UPDATE ticket in dbo.ithd_tickets (IT Staff only)
 * ✅ Sends updates to requester + assignment to staff
 */
export const updateTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { status, empCode_assigned, notes, comment } = req.body;

        const pool = getPool();

        // GET original ticket data
        const originalTicket = await pool.request()
            .input('id', sql.Int, ticketId)
            .query('SELECT * FROM dbo.ithd_tickets WHERE id = @id');

        if (originalTicket.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        const ticket = originalTicket.recordset[0];

        // Permission: allow ticket creator to add a comment, otherwise only IT Staff can update
        const isCommentOnly = !!comment && !status && !empCode_assigned && !notes;
        if (!req.isITStaff && !isCommentOnly) {
            return res.status(403).json({
                success: false,
                message: 'Only IT Staff (CC 7510) can update tickets'
            });
        }

        const isOwner = String(req.empCode || '').trim().toLowerCase() === String(ticket.empCode_created || '').trim().toLowerCase();
        if (isCommentOnly && !req.isITStaff && !isOwner) {
            return res.status(403).json({ success: false, message: 'Only the ticket owner or IT Staff can add comments' });
        }

        if (status === 'Rejected' && (!comment || !String(comment).trim())) {
            return res.status(400).json({ success: false, message: 'A comment reason is required to reject a ticket' });
        }

        // Update ticket
        const request = pool.request()
            .input('id', sql.Int, ticketId)
            .input('updated_at', sql.DateTime, new Date());

        let updateFields = ['updated_at = @updated_at'];

        if (status) {
            request.input('status', sql.NVarChar, status);
            updateFields.push('status = @status');
        }

        if (empCode_assigned) {
            request.input('empCode_assigned', sql.NVarChar, empCode_assigned);
            updateFields.push('empCode_assigned = @empCode_assigned');
        }

        if (notes) {
            request.input('notes', sql.NVarChar, notes);
            updateFields.push('notes = @notes');
        }

        if (comment) {
            const timestamp = new Date();
            await pool.request()
                .input('ticket_id', sql.Int, ticketId)
                .input('empCode', sql.NVarChar, req.empCode)
                .input('comment', sql.NVarChar, comment)
                .input('created_at', sql.DateTime, timestamp)
                .query(`INSERT INTO dbo.ithd_comments (ticket_id, empCode, comment, created_at) VALUES (@ticket_id, @empCode, @comment, @created_at)`);
        }

        if (status === 'Completed') {
            request.input('completed_at', sql.DateTime, new Date());
            updateFields.push('completed_at = @completed_at');
        }

        const query = `UPDATE dbo.ithd_tickets SET ${updateFields.join(', ')} WHERE id = @id`;
        await request.query(query);

        // ✅ LOG History updates
        if (status && status !== ticket.status) {
            await pool.request()
                .input('ticket_id', sql.Int, ticketId)
                .input('action_type', sql.VarChar(50), 'Status Update')
                .input('actor_empCode', sql.VarChar(50), req.empCode)
                .input('actor_name', sql.NVarChar(100), req.user.name)
                .input('details', sql.NVarChar(sql.MAX), `Status changed from ${ticket.status} to ${status}`)
                .query(`INSERT INTO dbo.ithd_ticket_history (ticket_id, action_type, actor_empCode, actor_name, details, created_at) VALUES (@ticket_id, @action_type, @actor_empCode, @actor_name, @details, GETDATE())`);
        }
        if (empCode_assigned && empCode_assigned !== ticket.empCode_assigned) {
            const staffName = await getNameByEmpCode(empCode_assigned) || empCode_assigned;
            await pool.request()
                .input('ticket_id', sql.Int, ticketId)
                .input('action_type', sql.VarChar(50), 'Assigned')
                .input('actor_empCode', sql.VarChar(50), req.empCode)
                .input('actor_name', sql.NVarChar(100), req.user.name)
                .input('details', sql.NVarChar(sql.MAX), `Assigned to IT Staff: ${staffName}`)
                .query(`INSERT INTO dbo.ithd_ticket_history (ticket_id, action_type, actor_empCode, actor_name, details, created_at) VALUES (@ticket_id, @action_type, @actor_empCode, @actor_name, @details, GETDATE())`);
        }

        // GET updated ticket
        const updatedTicket = await pool.request()
            .input('id', sql.Int, ticketId)
            .query('SELECT * FROM dbo.ithd_tickets WHERE id = @id');

        const updatedData = updatedTicket.recordset[0];

        // ✅ EMAIL #1: Status update to requester
        if (status || notes) {
            const changeDetails = [];
            if (status && status !== ticket.status) {
                changeDetails.push(`Status: ${ticket.status} → ${status}`);
            }
            if (notes) {
                changeDetails.push('Notes updated');
            }

            const emailTemplate = ticketUpdatedTemplate(
                updatedData,
                ticket.requester_name,
                changeDetails.join(', ')
            );

            const emailResult = await sendEmail(
                ticket.requester_email,
                emailTemplate.subject,
                emailTemplate.html
            );

            await logEmail(
                ticketId,
                ticket.requester_email,
                'Status Updated',
                emailTemplate.subject,
                emailResult.success ? 'Sent' : 'Failed',
                emailResult.messageId || null,
                emailResult.success ? null : emailResult.error
            );
        }

        // ✅ EMAIL #2: Comment notification to requester when IT staff replies
        if (comment && req.isITStaff) {
            const emailTemplate = ticketCommentTemplate(updatedData, req.user.name || 'IT Staff', comment);
            const emailResult = await sendEmail(
                ticket.requester_email,
                emailTemplate.subject,
                emailTemplate.html
            );

            await logEmail(
                ticketId,
                ticket.requester_email,
                'Comment Added',
                emailTemplate.subject,
                emailResult.success ? 'Sent' : 'Failed',
                emailResult.messageId || null,
                emailResult.success ? null : emailResult.error
            );
        }

        // ✅ EMAIL #3: Assignment notification to staff
        if (empCode_assigned && empCode_assigned !== ticket.empCode_assigned) {
            const staffEmail = await getEmailByEmpCode(empCode_assigned);
            const staffName = await getNameByEmpCode(empCode_assigned);

            if (staffEmail) {
                const emailTemplate = ticketAssignedTemplate(updatedData, staffName);
                const emailResult = await sendEmail(
                    staffEmail,
                    emailTemplate.subject,
                    emailTemplate.html
                );

                await logEmail(
                    ticketId,
                    staffEmail,
                    'Ticket Assigned',
                    emailTemplate.subject,
                    emailResult.success ? 'Sent' : 'Failed',
                    emailResult.messageId || null,
                    emailResult.success ? null : emailResult.error
                );
            }
        }

        // ✅ EMAIL #3: Completion notification
        if (status === 'Completed' && ticket.status !== 'Completed') {
            const emailTemplate = ticketCompletedTemplate(updatedData, ticket.requester_name);
            const emailResult = await sendEmail(
                ticket.requester_email,
                emailTemplate.subject,
                emailTemplate.html
            );

            await logEmail(
                ticketId,
                ticket.requester_email,
                'Ticket Completed',
                emailTemplate.subject,
                emailResult.success ? 'Sent' : 'Failed',
                emailResult.messageId || null,
                emailResult.success ? null : emailResult.error
            );
        }

        res.json({
            success: true,
            message: 'Ticket updated and notifications sent'
        });
    } catch (error) {
        console.error('Update ticket error:', error);
        res.status(500).json({ success: false, message: 'Failed to update ticket' });
    }
};

/**
 * DELETE ticket from dbo.ithd_tickets (IT Staff only)
 * ✅ Sends cancellation email
 */
export const deleteTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const pool = getPool();

        const ticketData = await pool.request()
            .input('id', sql.Int, ticketId)
            .query('SELECT * FROM dbo.ithd_tickets WHERE id = @id');

        if (ticketData.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        const ticket = ticketData.recordset[0];

        const isOwner = String(req.empCode || '').trim().toLowerCase() === String(ticket.empCode_created || '').trim().toLowerCase();
        if (!req.isITStaff && !isOwner) {
            return res.status(403).json({
                success: false,
                message: 'Only the ticket owner or IT Staff can delete tickets'
            });
        }

        // Delete ticket
        await pool.request()
            .input('id', sql.Int, ticketId)
            .query('DELETE FROM dbo.ithd_tickets WHERE id = @id');

        // ✅ SEND EMAIL: Cancellation notification
        const emailResult = await sendEmail(
            ticket.requester_email,
            `[${ticket.req_id}] Ticket Cancelled`,
            `
                <div style="font-family: Arial, sans-serif; max-width: 600px;">
                    <p>Hi ${ticket.requester_name},</p>
                    <p>Your ticket <strong>${ticket.req_id}</strong> (${ticket.project_name}) has been cancelled by the IT team.</p>
                    <p>If you have any questions, please contact IT Support.</p>
                    <p style="color: #999; font-size: 12px;">© 2026 IT Service Desk</p>
                </div>
            `
        );

        await logEmail(
            ticketId,
            ticket.requester_email,
            'Ticket Deleted',
            `[${ticket.req_id}] Ticket Cancelled`,
            emailResult.success ? 'Sent' : 'Failed',
            emailResult.messageId || null,
            emailResult.success ? null : emailResult.error
        );

        res.json({
            success: true,
            message: 'Ticket deleted successfully'
        });
    } catch (error) {
        console.error('Delete ticket error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete ticket' });
    }
};

/**
 * GET statistics from dbo.ithd_tickets
 */
export const getTicketStats = async (req, res) => {
    try {
        const pool = getPool();
        const query = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed
            FROM dbo.ithd_tickets
        `;
        const request = pool.request();

        const result = await request.query(query);

        res.json({
            success: true,
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch stats' });
    }
};

/**
 * GET ticket history / timeline
 */
export const getTicketHistory = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const pool = getPool();
        const request = pool.request()
            .input('ticket_id', sql.Int, ticketId);

        const result = await request.query('SELECT * FROM dbo.ithd_ticket_history WHERE ticket_id = @ticket_id ORDER BY created_at ASC');

        res.json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch ticket history' });
    }
};

/**
 * POST a new comment to a ticket
 */
export const addTicketComment = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { comment } = req.body;

        if (!comment) {
            return res.status(400).json({ success: false, message: 'Comment text is required' });
        }

        const pool = getPool();

        // Verify ticket exists and user has access
        const checkReq = pool.request().input('id', sql.Int, ticketId);
        let checkQuery = 'SELECT * FROM dbo.ithd_tickets WHERE id = @id';
        if (!req.isITStaff) {
            checkQuery += ' AND empCode_created = @empCode';
            checkReq.input('empCode', sql.NVarChar, req.empCode);
        }
        const ticketCheck = await checkReq.query(checkQuery);

        if (ticketCheck.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Ticket not found or access denied' });
        }

        // Insert comment to history
        await pool.request()
            .input('ticket_id', sql.Int, ticketId)
            .input('action_type', sql.VarChar(50), 'Comment')
            .input('actor_empCode', sql.VarChar(50), req.empCode)
            .input('actor_name', sql.NVarChar(100), req.user.name)
            .input('details', sql.NVarChar(sql.MAX), comment)
            .query(`
                INSERT INTO dbo.ithd_ticket_history (ticket_id, action_type, actor_empCode, actor_name, details, created_at)
                VALUES (@ticket_id, @action_type, @actor_empCode, @actor_name, @details, GETDATE())
            `);

        res.status(201).json({
            success: true,
            message: 'Comment added successfully'
        });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ success: false, message: 'Failed to add comment' });
    }
};
