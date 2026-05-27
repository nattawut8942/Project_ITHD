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

const getBangkokNow = () => {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).formatToParts(now).reduce((acc, part) => {
        if (part.type !== 'literal') acc[part.type] = part.value;
        return acc;
    }, {});

    const iso = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+07:00`;
    return new Date(iso);
};

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
        const query = `
    SELECT 
        t.*,
        u.name AS assigned_name
    FROM dbo.ithd_tickets t
    LEFT JOIN dbo.ithd_users u ON t.empCode_assigned = u.empCode
    ORDER BY t.created_at DESC
`;
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
        const ticketResult = await ticketRequest.query(`
            SELECT 
                t.*,
                ru.sect AS requester_sect,
                u.name AS assigned_name,
                u.email AS assigned_email,
                u.cost_center AS assigned_cost_center,
                u.sect AS assigned_sect
            FROM dbo.ithd_tickets t
            LEFT JOIN dbo.ithd_users ru ON t.empCode_created = ru.empCode
            LEFT JOIN dbo.ithd_users u ON t.empCode_assigned = u.empCode
            WHERE t.id = @id
        `);

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
            notes,
            phone_internal,
            phone_personal,
            emp_pic_url,
            attachments,problem_type_id, problem_subtype_id, problem_type_name, problem_subtype_name,
        } = req.body;

        if (!project_name || !location) {
            return res.status(400).json({
                success: false,
                message: 'project_name and location are required'
            });
        }

        const pool = getPool();

        // Generate req_id in format: TICKET-DDMMYYxxx (3-digit running number, start at 001)
        const now = getBangkokNow();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yy = String(now.getFullYear()).slice(-2);
        const prefix = `TICKET-${dd}${mm}${yy}`;

        const transaction = new sql.Transaction(pool);
        await transaction.begin();
            // Find max existing sequence for today (using RIGHT(req_id, 3)) with UPDLOCK to prevent race condition
            const seqResult = await transaction.request()
                .input('prefix', sql.NVarChar, prefix)
                .query("SELECT MAX(CAST(RIGHT(req_id, 3) AS INT)) AS maxSeq FROM dbo.ithd_tickets WITH (UPDLOCK, HOLDLOCK) WHERE req_id LIKE @prefix + '%'");

            const maxSeq = seqResult.recordset && seqResult.recordset[0] && seqResult.recordset[0].maxSeq != null
                ? parseInt(seqResult.recordset[0].maxSeq, 10)
                : null;

            const nextSeq = (maxSeq !== null) ? (maxSeq + 1) : 1; // start from 001 when none exist
            const seqStr = String(nextSeq).padStart(3, '0');
            const reqId = `${prefix}${seqStr}`;

            const result = await transaction.request()
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
                .input('target_date', sql.DateTime, target_date || getBangkokNow())
                .input('notes', sql.NVarChar, notes || '')
                .input('created_at', sql.DateTime, getBangkokNow())
                .input('updated_at', sql.DateTime, getBangkokNow())
                .input('phone_internal', sql.NVarChar, phone_internal || '')
                .input('phone_personal', sql.NVarChar, phone_personal || '')
                .input('emp_pic_url', sql.NVarChar, emp_pic_url || '')
                .input('attachments', sql.NVarChar, attachments ? JSON.stringify(attachments) : null)
                .input('problem_type_id',      sql.Int,      problem_type_id || null)
                .input('problem_subtype_id',   sql.Int,      problem_subtype_id || null)
                .input('problem_type_name',    sql.NVarChar, problem_type_name || '')
                .input('problem_subtype_name', sql.NVarChar, problem_subtype_name || '')
                .query(`
        INSERT INTO dbo.ithd_tickets (
            req_id, request_type, project_name, requester_name, requester_email,
            empCode_created, cost_center, device_type, device_count,
            location, status, priority, target_date, notes,
            phone_internal, phone_personal, emp_pic_url,attachments,problem_type_id, problem_subtype_id, problem_type_name, problem_subtype_name,
            created_at, updated_at
        ) VALUES (
            @req_id, @request_type, @project_name, @requester_name, @requester_email,
            @empCode_created, @cost_center, @device_type, @device_count,
            @location, @status, @priority, @target_date, @notes,
            @phone_internal, @phone_personal, @emp_pic_url,@attachments,@problem_type_id, @problem_subtype_id, @problem_type_name, @problem_subtype_name,
            @created_at, @updated_at
        );
        SELECT SCOPE_IDENTITY() as id;
    `);

            const ticketId = result.recordset[0].id;
            await transaction.commit();

            // ✅ Sync requester to dbo.ithd_users (outside transaction to avoid keeping lock)
            await syncUserFromDaikinAD(
                req.empCode,
                req.user.name,
                req.user.email,
                req.costCenter,
                req.user.sect
            ).catch(err => console.error('Sync user error:', err));

        // ✅ LOG History: Ticket Created
        await pool.request()
            .input('ticket_id', sql.Int, ticketId)
            .input('action_type', sql.VarChar(50), 'Created')
            .input('actor_empCode', sql.VarChar(50), req.empCode)
            .input('actor_name', sql.NVarChar(100), req.user.name)
            .input('details', sql.NVarChar(sql.MAX), 'Ticket opened by user')
            .input('created_at', sql.DateTime, getBangkokNow())
            .query(`
                INSERT INTO dbo.ithd_ticket_history (ticket_id, action_type, actor_empCode, actor_name, details, created_at)
                VALUES (@ticket_id, @action_type, @actor_empCode, @actor_name, @details, @created_at)
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
            // Rollback transaction if it failed inside try block
            if (transaction) {
                try { await transaction.rollback(); } catch (rollbackErr) { /* ignore rollback error if already rolled back */ }
            }
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
        const { status, empCode_assigned, notes, comment, root_cause, solution } = req.body;

        const pool = getPool();

        // GET original ticket data
        const originalTicket = await pool.request()
            .input('id', sql.Int, ticketId)
            .query('SELECT * FROM dbo.ithd_tickets WHERE id = @id');

        if (originalTicket.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        const ticket = originalTicket.recordset[0];

        // Permission check
        const isCommentOnly = !!comment && !status && !empCode_assigned && !notes;
        if (!req.isITStaff && !isCommentOnly) {
            // Allow cancel own ticket
            const isCancelOwn = status === 'Cancelled' &&
                String(req.empCode || '').trim().toLowerCase() === String(ticket.empCode_created || '').trim().toLowerCase() &&
                ticket.status === 'Pending';
            if (!isCancelOwn) {
                return res.status(403).json({ success: false, message: 'Only IT Staff can update tickets' });
            }
        }

        const isOwner = String(req.empCode || '').trim().toLowerCase() === String(ticket.empCode_created || '').trim().toLowerCase();
        if (isCommentOnly && !req.isITStaff && !isOwner) {
            return res.status(403).json({ success: false, message: 'Only the ticket owner or IT Staff can add comments' });
        }

        if (status === 'Rejected' && (!comment || !String(comment).trim())) {
            return res.status(400).json({ success: false, message: 'A comment reason is required to reject a ticket' });
        }

        if (status === 'Completed') {
            if (ticket.empCode_assigned !== req.empCode) {
                return res.status(403).json({ success: false, message: 'เฉพาะผู้ที่รับเคสเท่านั้นที่ปิดเคสได้' });
            }
            if (!root_cause || !solution) {
                return res.status(400).json({ success: false, message: 'กรุณาระบุสาเหตุของปัญหาและวิธีแก้ก่อนปิดเคส' });
            }
        }

        // ── Build UPDATE ──────────────────────────────────────
        const now = getBangkokNow();
        const request = pool.request()
            .input('id', sql.Int, ticketId)
            .input('updated_at', sql.DateTime, now);

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
            const timestamp = getBangkokNow();
            await pool.request()
                .input('ticket_id', sql.Int, ticketId)
                .input('empCode', sql.NVarChar, req.empCode)
                .input('comment', sql.NVarChar, comment)
                .input('created_at', sql.DateTime, timestamp)
                .query(`INSERT INTO dbo.ithd_comments (ticket_id, empCode, comment, created_at) VALUES (@ticket_id, @empCode, @comment, @created_at)`);
        }

        if (status === 'In Progress') {
            const acceptedAt = ticket.accepted_at || getBangkokNow();
            request.input('accepted_at', sql.DateTime, acceptedAt);
            updateFields.push('accepted_at = @accepted_at');
        }

        if (status === 'Completed') {
            request.input('root_cause', sql.NVarChar, root_cause);
            request.input('solution', sql.NVarChar, solution);
            updateFields.push('root_cause = @root_cause');
            updateFields.push('solution = @solution');
            request.input('completed_at', sql.DateTime, getBangkokNow());
            updateFields.push('completed_at = @completed_at');
            if (!ticket.accepted_at) {
                request.input('accepted_at', sql.DateTime, getBangkokNow());
                updateFields.push('accepted_at = @accepted_at');
            }
        }

        const query = `UPDATE dbo.ithd_tickets SET ${updateFields.join(', ')} WHERE id = @id`;
        await request.query(query);

        // ── LOG History ───────────────────────────────────────
        if (status && status !== ticket.status) {
            const actionType = status; // In Progress, Completed, Rejected, Cancelled
            const details =
                status === 'Completed' ? `ปิดเคสโดย ${req.user.name}\nสาเหตุ: ${root_cause}\nวิธีแก้: ${solution}` :
                    status === 'Rejected' ? `ปฏิเสธโดย ${req.user.name}${comment ? ': ' + comment : ''}` :
                        status === 'Cancelled' ? `ยกเลิกโดย ${req.user.name}` :
                            status === 'In Progress' ? `รับเคสโดย ${req.user.name}` :
                                `Status changed from ${ticket.status} to ${status}`;

            await pool.request()
                .input('ticket_id', sql.Int, ticketId)
                .input('action_type', sql.VarChar(50), actionType)
                .input('actor_empCode', sql.VarChar(50), req.empCode)
                .input('actor_name', sql.NVarChar(100), req.user.name)
                .input('details', sql.NVarChar(sql.MAX), details)
                .input('created_at', sql.DateTime, now)
                .query(`INSERT INTO dbo.ithd_ticket_history (ticket_id, action_type, actor_empCode, actor_name, details, created_at) VALUES (@ticket_id, @action_type, @actor_empCode, @actor_name, @details, @created_at)`);
        }

        if (req.body.priority && req.body.priority !== ticket.priority) {
            await pool.request()
                .input('ticket_id', sql.Int, ticketId)
                .input('action_type', sql.VarChar(50), 'Priority Changed')
                .input('actor_empCode', sql.VarChar(50), req.empCode)
                .input('actor_name', sql.NVarChar(100), req.user.name)
                .input('details', sql.NVarChar(sql.MAX), `Priority changed from ${ticket.priority} to ${req.body.priority}`)
                .input('created_at', sql.DateTime, now)
                .query(`INSERT INTO dbo.ithd_ticket_history (ticket_id, action_type, actor_empCode, actor_name, details, created_at) VALUES (@ticket_id, @action_type, @actor_empCode, @actor_name, @details, @created_at)`);
        }

        if (empCode_assigned && empCode_assigned !== ticket.empCode_assigned) {
            const staffName = await getNameByEmpCode(empCode_assigned) || empCode_assigned;
            await pool.request()
                .input('ticket_id', sql.Int, ticketId)
                .input('action_type', sql.VarChar(50), 'Assigned')
                .input('actor_empCode', sql.VarChar(50), req.empCode)
                .input('actor_name', sql.NVarChar(100), req.user.name)
                .input('details', sql.NVarChar(sql.MAX), `Assigned to IT Staff: ${staffName}`)
                .input('created_at', sql.DateTime, now)
                .query(`INSERT INTO dbo.ithd_ticket_history (ticket_id, action_type, actor_empCode, actor_name, details, created_at) VALUES (@ticket_id, @action_type, @actor_empCode, @actor_name, @details, @created_at)`);
        }

        // ── GET updated ticket for emails ─────────────────────
        const updatedTicket = await pool.request()
            .input('id', sql.Int, ticketId)
            .query('SELECT * FROM dbo.ithd_tickets WHERE id = @id');

        const updatedData = updatedTicket.recordset[0];

        // EMAIL #1: Status update to requester
        if (status || notes) {
            const changeDetails = [];
            if (status && status !== ticket.status) changeDetails.push(`Status: ${ticket.status} → ${status}`);
            if (notes) changeDetails.push('Notes updated');

            const emailTemplate = ticketUpdatedTemplate(updatedData, ticket.requester_name, changeDetails.join(', '));
            const emailResult = await sendEmail(ticket.requester_email, emailTemplate.subject, emailTemplate.html);
            await logEmail(ticketId, ticket.requester_email, 'Status Updated', emailTemplate.subject,
                emailResult.success ? 'Sent' : 'Failed', emailResult.messageId || null, emailResult.success ? null : emailResult.error);
        }

        // EMAIL #2: Comment notification
        if (comment && req.isITStaff) {
            const emailTemplate = ticketCommentTemplate(updatedData, req.user.name || 'IT Staff', comment);
            const emailResult = await sendEmail(ticket.requester_email, emailTemplate.subject, emailTemplate.html);
            await logEmail(ticketId, ticket.requester_email, 'Comment Added', emailTemplate.subject,
                emailResult.success ? 'Sent' : 'Failed', emailResult.messageId || null, emailResult.success ? null : emailResult.error);
        }

        // EMAIL #3: Assignment notification
        if (empCode_assigned && empCode_assigned !== ticket.empCode_assigned) {
            const staffEmail = await getEmailByEmpCode(empCode_assigned);
            const staffName = await getNameByEmpCode(empCode_assigned);
            if (staffEmail) {
                const emailTemplate = ticketAssignedTemplate(updatedData, staffName);
                const emailResult = await sendEmail(staffEmail, emailTemplate.subject, emailTemplate.html);
                await logEmail(ticketId, staffEmail, 'Ticket Assigned', emailTemplate.subject,
                    emailResult.success ? 'Sent' : 'Failed', emailResult.messageId || null, emailResult.success ? null : emailResult.error);
            }
        }

        // EMAIL #4: Completion notification
        if (status === 'Completed' && ticket.status !== 'Completed') {
            const emailTemplate = ticketCompletedTemplate(updatedData, ticket.requester_name);
            const emailResult = await sendEmail(ticket.requester_email, emailTemplate.subject, emailTemplate.html);
            await logEmail(ticketId, ticket.requester_email, 'Ticket Completed', emailTemplate.subject,
                emailResult.success ? 'Sent' : 'Failed', emailResult.messageId || null, emailResult.success ? null : emailResult.error);
        }

        res.json({ success: true, message: 'Ticket updated and notifications sent' });

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
    .query('DELETE FROM dbo.ithd_email_logs WHERE ticket_id = @id');

await pool.request()
    .input('id', sql.Int, ticketId)
    .query('DELETE FROM dbo.ithd_comments WHERE ticket_id = @id');

await pool.request()
    .input('id', sql.Int, ticketId)
    .query('DELETE FROM dbo.ithd_ticket_history WHERE ticket_id = @id');

// ลบ ticket
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
        const historyTimestamp = getBangkokNow();
        await pool.request()
            .input('ticket_id', sql.Int, ticketId)
            .input('action_type', sql.VarChar(50), 'Comment')
            .input('actor_empCode', sql.VarChar(50), req.empCode)
            .input('actor_name', sql.NVarChar(100), req.user.name)
            .input('details', sql.NVarChar(sql.MAX), comment)
            .input('created_at', sql.DateTime, historyTimestamp)
            .query(`
                INSERT INTO dbo.ithd_ticket_history (ticket_id, action_type, actor_empCode, actor_name, details, created_at)
                VALUES (@ticket_id, @action_type, @actor_empCode, @actor_name, @details, @created_at)
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
