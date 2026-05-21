// backend/src/utils/emailTemplates.js

/**
 * Email templates for IT Service Desk notifications
 */

/**
 * Template: New Ticket Created
 * Sent to: User who created the ticket
 */
export const ticketCreatedTemplate = (ticket, userName) => {
    return {
        subject: `[${ticket.req_id}] Ticket Created: ${ticket.project_name}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0;">✓ Ticket Created Successfully</h1>
                </div>
                
                <div style="background: #f5f5f5; padding: 20px;">
                    <p>Hi ${userName},</p>
                    
                    <p>Your IT service request has been successfully created and is now in our queue for processing.</p>
                    
                    <div style="background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0;">
                        <p><strong>Ticket Details:</strong></p>
                        <table style="width: 100%; font-size: 14px;">
                            <tr>
                                <td style="padding: 5px; color: #666;"><strong>Ticket ID:</strong></td>
                                <td>${ticket.req_id}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px; color: #666;"><strong>Request Type:</strong></td>
                                <td>${ticket.request_type}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px; color: #666;"><strong>Project:</strong></td>
                                <td>${ticket.project_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px; color: #666;"><strong>Location:</strong></td>
                                <td>${ticket.location}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px; color: #666;"><strong>Priority:</strong></td>
                                <td>
                                    <span style="background: ${getPriorityColor(ticket.priority)}; color: white; padding: 3px 8px; border-radius: 3px;">
                                        ${ticket.priority}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 5px; color: #666;"><strong>Target Date:</strong></td>
                                <td>${new Date(ticket.target_date).toLocaleDateString()}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px; color: #666;"><strong>Status:</strong></td>
                                <td>
                                    <span style="background: #ffc107; color: white; padding: 3px 8px; border-radius: 3px;">
                                        ${ticket.status}
                                    </span>
                                </td>
                            </tr>
                        </table>
                    </div>

                    <p><strong>What happens next?</strong></p>
                    <ul>
                        <li>Our IT team will review your request</li>
                        <li>You'll receive updates via email</li>
                        <li>Check your dashboard for ticket status</li>
                    </ul>

                    <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px;">
                        <strong>Reference ID:</strong> ${ticket.req_id}<br>
                        <strong>Created:</strong> ${new Date(ticket.created_at).toLocaleString()}<br>
                        Do not reply to this email. Use the IT Service Desk portal instead.
                    </p>
                </div>

                <div style="background: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px;">
                    <p style="margin: 0;">IT Service Desk | Daikin Thailand</p>
                    <p style="margin: 0;">© 2026 All Rights Reserved</p>
                </div>
            </div>
        `
    };
};

/**
 * Template: Ticket Status Updated
 * Sent to: User who created the ticket
 */
export const ticketUpdatedTemplate = (ticket, userName, changeDetails) => {
    const statusColors = {
        'Pending': '#ffc107',
        'In Progress': '#17a2b8',
        'Completed': '#28a745',
        'Rejected': '#dc3545'
    };

    return {
        subject: `[${ticket.req_id}] Status Update: ${ticket.project_name}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0;">📢 Ticket Status Updated</h1>
                </div>
                
                <div style="background: #f5f5f5; padding: 20px;">
                    <p>Hi ${userName},</p>
                    
                    <p>Your IT service ticket has been updated. Please see the details below.</p>
                    
                    <div style="background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0;">
                        <p><strong>Ticket Update:</strong></p>
                        <table style="width: 100%; font-size: 14px;">
                            <tr>
                                <td style="padding: 5px; color: #666;"><strong>Ticket ID:</strong></td>
                                <td>${ticket.req_id}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px; color: #666;"><strong>Project:</strong></td>
                                <td>${ticket.project_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px; color: #666;"><strong>New Status:</strong></td>
                                <td>
                                    <span style="background: ${statusColors[ticket.status] || '#999'}; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold;">
                                        ${ticket.status}
                                    </span>
                                </td>
                            </tr>
                            ${changeDetails ? `
                            <tr>
                                <td style="padding: 5px; color: #666;"><strong>Changes:</strong></td>
                                <td>${changeDetails}</td>
                            </tr>
                            ` : ''}
                            <tr>
                                <td style="padding: 5px; color: #666;"><strong>Updated:</strong></td>
                                <td>${new Date().toLocaleString()}</td>
                            </tr>
                        </table>
                    </div>

                    ${ticket.notes ? `
                    <div style="background: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Notes from IT Team:</strong></p>
                        <p style="margin: 0; color: #333;">${ticket.notes}</p>
                    </div>
                    ` : ''}

                    <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px;">
                        <strong>Reference ID:</strong> ${ticket.req_id}<br>
                        <strong>Updated:</strong> ${new Date().toLocaleString()}<br>
                        Do not reply to this email. Use the IT Service Desk portal instead.
                    </p>
                </div>

                <div style="background: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px;">
                    <p style="margin: 0;">IT Service Desk | Daikin Thailand</p>
                    <p style="margin: 0;">© 2026 All Rights Reserved</p>
                </div>
            </div>
        `
    };
};

/**
 * Template: Ticket Assigned to IT Staff
 * Sent to: IT Staff member
 */
export const ticketAssignedTemplate = (ticket, staffName) => {
    return {
        subject: `[${ticket.req_id}] New Ticket Assigned to You`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0;">🎯 New Ticket Assigned</h1>
                </div>
                
                <div style="background: #f5f5f5; padding: 20px;">
                    <p>Hi ${staffName},</p>
                    
                    <p>A new ticket has been assigned to you. Please review and take action as needed.</p>
                    
                    <div style="background: white; padding: 15px; border-left: 4px solid #f5576c; margin: 20px 0;">
                        <p><strong>Ticket Details:</strong></p>
                        <table style="width: 100%; font-size: 14px;">
                            <tr>
                                <td style="padding: 5px; color: #666;"><strong>Ticket ID:</strong></td>
                                <td>${ticket.req_id}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px; color: #666;"><strong>Request Type:</strong></td>
                                <td>${ticket.request_type}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px; color: #666;"><strong>Requester:</strong></td>
                                <td>${ticket.requester_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px; color: #666;"><strong>Project:</strong></td>
                                <td>${ticket.project_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px; color: #666;"><strong>Location:</strong></td>
                                <td>${ticket.location}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px; color: #666;"><strong>Priority:</strong></td>
                                <td>
                                    <span style="background: ${getPriorityColor(ticket.priority)}; color: white; padding: 3px 8px; border-radius: 3px; font-weight: bold;">
                                        ${ticket.priority}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 5px; color: #666;"><strong>Target Date:</strong></td>
                                <td>${new Date(ticket.target_date).toLocaleDateString()}</td>
                            </tr>
                        </table>
                    </div>

                    ${ticket.notes ? `
                    <div style="background: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Requester Notes:</strong></p>
                        <p style="margin: 0; color: #333;">${ticket.notes}</p>
                    </div>
                    ` : ''}

                    <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px;">
                        <strong>Reference ID:</strong> ${ticket.req_id}<br>
                        <strong>Assigned:</strong> ${new Date().toLocaleString()}<br>
                        Do not reply to this email. Use the IT Service Desk portal instead.
                    </p>
                </div>

                <div style="background: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px;">
                    <p style="margin: 0;">IT Service Desk | Daikin Thailand</p>
                    <p style="margin: 0;">© 2026 All Rights Reserved</p>
                </div>
            </div>
        `
    };
};

/**
 * Template: Ticket Completed
 * Sent to: Requester
 */
export const ticketCompletedTemplate = (ticket, userName) => {
    return {
        subject: `[${ticket.req_id}] COMPLETED: ${ticket.project_name}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0;">✅ Your Request Completed!</h1>
                </div>
                
                <div style="background: #f5f5f5; padding: 20px;">
                    <p>Hi ${userName},</p>
                    
                    <p>Great news! Your IT service request has been successfully completed by our team.</p>
                    
                    <div style="background: white; padding: 15px; border-left: 4px solid #38ef7d; margin: 20px 0;">
                        <p><strong>Completed Details:</strong></p>
                        <table style="width: 100%; font-size: 14px;">
                            <tr>
                                <td style="padding: 5px; color: #666;"><strong>Ticket ID:</strong></td>
                                <td>${ticket.req_id}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px; color: #666;"><strong>Project:</strong></td>
                                <td>${ticket.project_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px; color: #666;"><strong>Status:</strong></td>
                                <td>
                                    <span style="background: #28a745; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold;">
                                        COMPLETED
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 5px; color: #666;"><strong>Completed:</strong></td>
                                <td>${new Date().toLocaleString()}</td>
                            </tr>
                        </table>
                    </div>

                    ${ticket.notes ? `
                    <div style="background: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Final Notes:</strong></p>
                        <p style="margin: 0; color: #333;">${ticket.notes}</p>
                    </div>
                    ` : ''}

                    <p style="margin-top: 20px;">If you need any additional support, please don't hesitate to contact us!</p>

                    <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px;">
                        <strong>Reference ID:</strong> ${ticket.req_id}<br>
                        <strong>Completed:</strong> ${new Date().toLocaleString()}<br>
                        Do not reply to this email. Use the IT Service Desk portal instead.
                    </p>
                </div>

                <div style="background: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px;">
                    <p style="margin: 0;">IT Service Desk | Daikin Thailand</p>
                    <p style="margin: 0;">© 2026 All Rights Reserved</p>
                </div>
            </div>
        `
    };
};

/**
 * Helper function to get priority color
 */
function getPriorityColor(priority) {
    const colors = {
        'Critical': '#dc3545',
        'High': '#fd7e14',
        'Medium': '#0d6efd',
        'Normal': '#6c757d'
    };
    return colors[priority] || '#6c757d';
}
