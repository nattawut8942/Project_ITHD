// backend/src/services/emailLogService.js (UPDATED)
import { sql, getPool } from '../config/db.js';

/**
 * Email Log Service - Track all email sending
 * Uses dbo.ithd_email_logs table
 * Useful for auditing and debugging email delivery
 */

/**
 * Log email sending to dbo.ithd_email_logs database
 */
export const logEmail = async (ticketId, recipientEmail, action, subject, status, messageId = null, errorMsg = null) => {
    try {
        const pool = getPool();
        
        await pool.request()
            .input('ticket_id', sql.Int, ticketId)
            .input('recipient_email', sql.NVarChar, recipientEmail)
            .input('action', sql.NVarChar, action)
            .input('email_subject', sql.NVarChar, subject)
            .input('status', sql.NVarChar, status) // 'Sent', 'Failed', 'Pending'
            .input('message_id', sql.NVarChar, messageId || '')
            .input('error_message', sql.NVarChar, errorMsg || '')
            .query(`
                INSERT INTO dbo.ithd_email_logs (
                    ticket_id, recipient_email, action, email_subject,
                    status, message_id, error_message, sent_at
                ) VALUES (
                    @ticket_id, @recipient_email, @action, @email_subject,
                    @status, @message_id, @error_message, GETDATE()
                )
            `);

        return { success: true };
    } catch (error) {
        console.error('Failed to log email:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get email logs for a ticket
 */
export const getTicketEmailLogs = async (ticketId) => {
    try {
        const pool = getPool();
        
        const result = await pool.request()
            .input('ticket_id', sql.Int, ticketId)
            .query(`
                SELECT 
                    id,
                    ticket_id,
                    recipient_email,
                    action,
                    email_subject,
                    status,
                    message_id,
                    error_message,
                    sent_at
                FROM dbo.ithd_email_logs
                WHERE ticket_id = @ticket_id
                ORDER BY sent_at DESC
            `);

        return result.recordset;
    } catch (error) {
        console.error('Failed to get email logs:', error);
        return [];
    }
};

/**
 * Get email logs for a recipient
 */
export const getRecipientEmailLogs = async (recipientEmail, limit = 50) => {
    try {
        const pool = getPool();
        
        const result = await pool.request()
            .input('email', sql.NVarChar, recipientEmail)
            .input('limit', sql.Int, limit)
            .query(`
                SELECT TOP (@limit)
                    id,
                    ticket_id,
                    recipient_email,
                    action,
                    email_subject,
                    status,
                    message_id,
                    error_message,
                    sent_at
                FROM dbo.ithd_email_logs
                WHERE recipient_email = @email
                ORDER BY sent_at DESC
            `);

        return result.recordset;
    } catch (error) {
        console.error('Failed to get recipient email logs:', error);
        return [];
    }
};

/**
 * Get email statistics from dbo.ithd_email_logs
 */
export const getEmailStats = async () => {
    try {
        const pool = getPool();
        
        const result = await pool.request()
            .query(`
                SELECT 
                    COUNT(*) as total_emails,
                    SUM(CASE WHEN status = 'Sent' THEN 1 ELSE 0 END) as sent,
                    SUM(CASE WHEN status = 'Failed' THEN 1 ELSE 0 END) as failed,
                    SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
                    COUNT(DISTINCT recipient_email) as unique_recipients,
                    COUNT(DISTINCT ticket_id) as tickets_with_emails
                FROM dbo.ithd_email_logs
            `);

        return result.recordset[0];
    } catch (error) {
        console.error('Failed to get email stats:', error);
        return null;
    }
};

/**
 * Get failed emails (for retry logic)
 */
export const getFailedEmails = async (limit = 20) => {
    try {
        const pool = getPool();
        
        const result = await pool.request()
            .input('limit', sql.Int, limit)
            .query(`
                SELECT TOP (@limit)
                    id,
                    ticket_id,
                    recipient_email,
                    action,
                    email_subject,
                    error_message,
                    sent_at
                FROM dbo.ithd_email_logs
                WHERE status = 'Failed'
                ORDER BY sent_at DESC
            `);

        return result.recordset;
    } catch (error) {
        console.error('Failed to get failed emails:', error);
        return [];
    }
};

/**
 * Mark email as resent (update status in dbo.ithd_email_logs)
 */
export const markEmailAsResent = async (emailLogId, newMessageId = null) => {
    try {
        const pool = getPool();
        
        await pool.request()
            .input('id', sql.Int, emailLogId)
            .input('message_id', sql.NVarChar, newMessageId || '')
            .query(`
                UPDATE dbo.ithd_email_logs
                SET status = 'Sent', message_id = @message_id, sent_at = GETDATE()
                WHERE id = @id
            `);

        return { success: true };
    } catch (error) {
        console.error('Failed to mark email as resent:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Clean old email logs (for maintenance)
 * Keep only last N days from dbo.ithd_email_logs
 */
export const cleanOldEmailLogs = async (daysToKeep = 90) => {
    try {
        const pool = getPool();
        
        const result = await pool.request()
            .input('daysToKeep', sql.Int, daysToKeep)
            .query(`
                DELETE FROM dbo.ithd_email_logs
                WHERE sent_at < DATEADD(DAY, -@daysToKeep, GETDATE())
            `);

        return { success: true, deletedRows: result.rowsAffected[0] };
    } catch (error) {
        console.error('Failed to clean email logs:', error);
        return { success: false, error: error.message };
    }
};
