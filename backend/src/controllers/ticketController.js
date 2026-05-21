// backend/src/controller/ticketController.js (UPDATED with dbo.ithd_)
import { sql, getPool } from '../config/db.js';
import { sendEmail } from '../config/emailConfig.js';
import { 
    ticketCreatedTemplate,
    ticketUpdatedTemplate,
    ticketAssignedTemplate,
    ticketCompletedTemplate 
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
        let query = 'SELECT * FROM dbo.ithd_tickets ORDER BY created_at DESC';
        const request = pool.request();

        if (!req.isITStaff) {
            query = 'SELECT * FROM dbo.ithd_tickets WHERE empCode_created = @empCode ORDER BY created_at DESC';
            request.input('empCode', sql.NVarChar, req.empCode);
        }

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
        const request = pool.request()
            .input('id', sql.Int, ticketId);

        let query = 'SELECT * FROM dbo.ithd_tickets WHERE id = @id';
        if (!req.isITStaff) {
            query += ' AND empCode_created = @empCode';
            request.input('empCode', sql.NVarChar, req.empCode);
        }

        const result = await request.query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        res.json({
            success: true,
            data: result.recordset[0]
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
        const reqId = `REQ-${Math.floor(Date.now() / 1000).toString().slice(-6)}`;

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
            .input('device_count', sql.Int, device_count || 1)
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

        let ticketId = result.recordset?.[0]?.id;

        if (!ticketId) {
            const fallbackResult = await pool.request()
                .input('req_id', sql.NVarChar, reqId)
                .query('SELECT TOP 1 id FROM dbo.ithd_tickets WHERE req_id = @req_id ORDER BY id DESC');

            ticketId = fallbackResult.recordset?.[0]?.id;
        }

        if (!ticketId) {
            throw new Error('Ticket creation succeeded but ticket ID could not be determined.');
        }

        // ✅ GET ticket details for email
        const ticketDetails = await pool.request()
            .input('id', sql.Int, ticketId)
            .query('SELECT * FROM dbo.ithd_tickets WHERE id = @id');

        const ticket = ticketDetails.recordset[0];
        if (!ticket) {
            throw new Error('Ticket was created but could not be loaded from the database.');
        }

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
        res.status(500).json({ success: false, message: 'Failed to create ticket', error: error.message });
    }
};

/**
 * UPDATE ticket in dbo.ithd_tickets (IT Staff only)
 * ✅ Sends updates to requester + assignment to staff
 */
export const updateTicket = async (req, res) => {
    try {
        if (!req.isITStaff) {
            return res.status(403).json({
                success: false,
                message: 'Only IT Staff (CC 7510) can update tickets'
            });
        }

        const { ticketId } = req.params;
        const { status, empCode_assigned, notes } = req.body;

        const pool = getPool();
        
        // GET original ticket data
        const originalTicket = await pool.request()
            .input('id', sql.Int, ticketId)
            .query('SELECT * FROM dbo.ithd_tickets WHERE id = @id');

        if (originalTicket.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        const ticket = originalTicket.recordset[0];

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

        if (status === 'Completed') {
            request.input('completed_at', sql.DateTime, new Date());
            updateFields.push('completed_at = @completed_at');
        }

        const query = `UPDATE dbo.ithd_tickets SET ${updateFields.join(', ')} WHERE id = @id`;
        await request.query(query);

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

        // ✅ EMAIL #2: Assignment notification to staff
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
        if (!req.isITStaff) {
            return res.status(403).json({
                success: false,
                message: 'Only IT Staff can delete tickets'
            });
        }

        const { ticketId } = req.params;
        const pool = getPool();

        // GET ticket before deleting
        const ticketData = await pool.request()
            .input('id', sql.Int, ticketId)
            .query('SELECT * FROM dbo.ithd_tickets WHERE id = @id');

        if (ticketData.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        const ticket = ticketData.recordset[0];

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
        let query = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed
            FROM dbo.ithd_tickets
        `;

        const request = pool.request();

        if (!req.isITStaff) {
            query += ' WHERE empCode_created = @empCode';
            request.input('empCode', sql.NVarChar, req.empCode);
        }

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
