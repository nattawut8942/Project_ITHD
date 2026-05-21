// backend/src/config/email.js
import nodemailer from 'nodemailer';

/**
 * Email configuration using Nodemailer
 * Supports multiple providers:
 * - Gmail (App Password)
 * - Outlook/Office365
 * - Custom SMTP server
 */

const transporter = nodemailer.createTransport({
    // Option 1: Gmail with App Password
    // service: 'gmail',
    // auth: {
    //     user: process.env.EMAIL_USER,
    //     pass: process.env.EMAIL_PASSWORD // App-specific password
    // }

    // Option 2: Outlook/Office365
    // host: 'smtp.office365.com',
    // port: 587,
    // secure: false,
    // auth: {
    //     user: process.env.EMAIL_USER,
    //     pass: process.env.EMAIL_PASSWORD
    // }

    // Option 3: Custom SMTP Server (Daikin internal)
    host: process.env.SMTP_HOST || 'smtp.dci.daikin.co.jp',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true' ? true : false,
    auth: {
        user: process.env.EMAIL_USER || 'your-email@dci.daikin.co.jp',
        pass: process.env.EMAIL_PASSWORD || 'your-password'
    },
    logger: true,
    debug: true
});

/**
 * Verify SMTP connection on startup
 */
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Email service error:', error);
    } else {
        console.log('✅ Email service ready:', success);
    }
});

/**
 * Send email helper function
 */
export const sendEmail = async (to, subject, htmlContent, textContent = '') => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || `"IT Service Desk" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: htmlContent,
            text: textContent || htmlContent.replace(/<[^>]*>/g, '') // Fallback to plain text
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Failed to send email:', error);
        return { success: false, error: error.message };
    }
};

export default transporter;
