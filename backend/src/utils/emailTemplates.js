// backend/src/utils/emailTemplates.js

const formatThaiDateOnly = (value) => {
    if (!value) return '';
    return new Date(value).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Bangkok'
    });
};

const formatThaiDateTime = (value) => {
    const date = value ? new Date(value) : new Date();
    return date.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Bangkok'
    });
};

/**
 * Email templates for IT Help Desk notifications
 */

const PORTAL_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Template: New Ticket Created
 * Sent to: User who created the ticket
 */
export const ticketCreatedTemplate = (ticket, userName) => {
    return {
        subject: `[${ticket.req_id}] สร้างเคสสำเร็จ: ${ticket.project_name}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px;">
                    <h1 style="margin: 0; font-size: 20px;">✓ สร้างแจ้งซ่อมสำเร็จ</h1>
                </div>
                
                <div style="background: #f8fafc; padding: 20px;">
                    <p style="color: #334155;">สวัสดีคุณ ${userName},</p>
                    
                    <p style="color: #334155;">ระบบได้รับแจ้งปัญหาของคุณเรียบร้อยแล้ว และกำลังรอดำเนินการโดยทีมงาน IT</p>
                    
                    <div style="background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 0 8px 8px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <p style="margin-top: 0; color: #1e293b;"><strong>รายละเอียดเคส:</strong></p>
                        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; width: 35%;"><strong>หมายเลขเคส:</strong></td>
                                <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">${ticket.req_id}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;"><strong>ประเภทคำขอ:</strong></td>
                                <td style="padding: 8px 0; color: #0f172a;">${ticket.problem_type_name || ticket.request_type}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;"><strong>ปัญหา:</strong></td>
                                <td style="padding: 8px 0; color: #0f172a;">${ticket.project_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;"><strong>สถานที่:</strong></td>
                                <td style="padding: 8px 0; color: #0f172a;">${ticket.location}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;"><strong>ความเร่งด่วน:</strong></td>
                                <td style="padding: 8px 0;">
                                    <span style="background: ${getPriorityColor(ticket.priority)}; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                                        ${ticket.priority}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;"><strong>วันที่ต้องการ:</strong></td>
                                <td style="padding: 8px 0; color: #0f172a;">${formatThaiDateOnly(ticket.target_date)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;"><strong>สถานะ:</strong></td>
                                <td style="padding: 8px 0;">
                                    <span style="background: #f59e0b; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                                        ${ticket.status}
                                    </span>
                                </td>
                            </tr>
                        </table>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${PORTAL_URL}/?view=all" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                            ตรวจสอบสถานะเคสของคุณ
                        </a>
                    </div>

                    <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px;">
                        <strong>รหัสอ้างอิง:</strong> ${ticket.req_id}<br>
                        <strong>วันที่สร้าง:</strong> ${formatThaiDateTime(ticket.created_at)}<br>
                        อีเมลฉบับนี้ส่งจากระบบอัตโนมัติ กรุณาอย่าตอบกลับ
                    </p>
                </div>

                <div style="background: #1e293b; color: #cbd5e1; padding: 20px; text-align: center; font-size: 12px;">
                    <p style="margin: 0;">IT Help Desk | Daikin Thailand</p>
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
        subject: `[${ticket.req_id}] อัปเดตสถานะ: ${ticket.project_name}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 20px;">
                    <h1 style="margin: 0; font-size: 20px;">📢 มีการอัปเดตสถานะเคสของคุณ</h1>
                </div>
                
                <div style="background: #f8fafc; padding: 20px;">
                    <p style="color: #334155;">สวัสดีคุณ ${userName},</p>
                    
                    <p style="color: #334155;">เคสแจ้งปัญหา IT ของคุณมีการอัปเดตสถานะ โปรดดูรายละเอียดด้านล่าง</p>
                    
                    <div style="background: white; padding: 20px; border-left: 4px solid #3b82f6; margin: 20px 0; border-radius: 0 8px 8px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <p style="margin-top: 0; color: #1e293b;"><strong>ข้อมูลการอัปเดต:</strong></p>
                        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; width: 35%;"><strong>หมายเลขเคส:</strong></td>
                                <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">${ticket.req_id}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;"><strong>ปัญหา:</strong></td>
                                <td style="padding: 8px 0; color: #0f172a;">${ticket.project_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;"><strong>สถานะใหม่:</strong></td>
                                <td style="padding: 8px 0;">
                                    <span style="background: ${statusColors[ticket.status] || '#94a3b8'}; color: white; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 12px;">
                                        ${ticket.status}
                                    </span>
                                </td>
                            </tr>
                            ${changeDetails ? `
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;"><strong>รายละเอียดที่เปลี่ยน:</strong></td>
                                <td style="padding: 8px 0; color: #0f172a;">${changeDetails}</td>
                            </tr>
                            ` : ''}
                        </table>
                    </div>

                    ${ticket.notes ? `
                    <div style="background: #f0fdf4; padding: 15px; border-left: 4px solid #22c55e; border-radius: 0 8px 8px 0; margin: 20px 0;">
                        <p style="margin-top: 0; color: #166534; font-weight: bold;">บันทึกจากทีมงาน IT (Notes):</p>
                        <p style="margin: 0; color: #15803d;">${ticket.notes}</p>
                    </div>
                    ` : ''}

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${PORTAL_URL}/?view=all" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                            ดูรายละเอียดทั้งหมด
                        </a>
                    </div>

                    <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px;">
                        <strong>รหัสอ้างอิง:</strong> ${ticket.req_id}<br>
                        <strong>อัปเดตเมื่อ:</strong> ${formatThaiDateTime()}<br>
                        อีเมลฉบับนี้ส่งจากระบบอัตโนมัติ กรุณาอย่าตอบกลับ
                    </p>
                </div>

                <div style="background: #1e293b; color: #cbd5e1; padding: 20px; text-align: center; font-size: 12px;">
                    <p style="margin: 0;">IT Help Desk | Daikin Thailand</p>
                    <p style="margin: 0;">© 2026 All Rights Reserved</p>
                </div>
            </div>
        `
    };
};

/**
 * Template: Ticket Comment Added
 * Sent to: Requester when IT staff comments on the ticket
 */
export const ticketCommentTemplate = (ticket, author, comment) => {
    return {
        subject: `[${ticket.req_id}] มีข้อความใหม่ในเคสของคุณ`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: white; padding: 20px;">
                    <h1 style="margin: 0; font-size: 20px;">💬 มีข้อความใหม่ (Comment)</h1>
                </div>
                
                <div style="background: #f8fafc; padding: 20px;">
                    <p style="color: #334155;">สวัสดีคุณ ${ticket.requester_name || 'ผู้แจ้ง'},</p>
                    <p style="color: #334155;"><strong>${author}</strong> ได้เพิ่มข้อความใหม่ในเคสของคุณ</p>
                    <div style="background: white; padding: 20px; border-left: 4px solid #8b5cf6; margin: 20px 0; border-radius: 0 8px 8px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <p style="margin-top: 0; color: #64748b;"><strong>หมายเลขเคส:</strong> <span style="color: #0f172a;">${ticket.req_id}</span></p>
                        <p style="color: #64748b;"><strong>ปัญหา:</strong> <span style="color: #0f172a;">${ticket.project_name}</span></p>
                        <p style="color: #64748b;"><strong>ข้อความ:</strong></p>
                        <div style="background: #f1f5f9; padding: 15px; border-radius: 6px; color: #334155; line-height: 1.6;">${comment}</div>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${PORTAL_URL}/?view=all" style="background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                            ตอบกลับในระบบ
                        </a>
                    </div>

                    <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px;">
                        <strong>รหัสอ้างอิง:</strong> ${ticket.req_id}<br>
                        <strong>อัปเดตเมื่อ:</strong> ${formatThaiDateTime()}<br>
                        อีเมลฉบับนี้ส่งจากระบบอัตโนมัติ กรุณาอย่าตอบกลับ
                    </p>
                </div>
                <div style="background: #1e293b; color: #cbd5e1; padding: 20px; text-align: center; font-size: 12px;">
                    <p style="margin: 0;">IT Help Desk | Daikin Thailand</p>
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
        subject: `[${ticket.req_id}] มีเคสใหม่มอบหมายให้คุณ`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px;">
                    <h1 style="margin: 0; font-size: 20px;">🎯 เคสใหม่ถูกมอบหมายให้คุณ</h1>
                </div>
                
                <div style="background: #f8fafc; padding: 20px;">
                    <p style="color: #334155;">สวัสดีคุณ ${staffName},</p>
                    
                    <p style="color: #334155;">มีงานแจ้งซ่อม IT ใหม่ถูกจ่ายงานมาที่คุณ กรุณาตรวจสอบและดำเนินการ</p>
                    
                    <div style="background: white; padding: 20px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 0 8px 8px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <p style="margin-top: 0; color: #1e293b;"><strong>รายละเอียดเคส:</strong></p>
                        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; width: 35%;"><strong>หมายเลขเคส:</strong></td>
                                <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">${ticket.req_id}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;"><strong>ผู้แจ้ง:</strong></td>
                                <td style="padding: 8px 0; color: #0f172a;">${ticket.requester_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;"><strong>ประเภทคำขอ:</strong></td>
                                <td style="padding: 8px 0; color: #0f172a;">${ticket.problem_type_name || ticket.request_type}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;"><strong>ปัญหา:</strong></td>
                                <td style="padding: 8px 0; color: #0f172a;">${ticket.project_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;"><strong>สถานที่:</strong></td>
                                <td style="padding: 8px 0; color: #0f172a;">${ticket.location}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;"><strong>ความเร่งด่วน:</strong></td>
                                <td style="padding: 8px 0;">
                                    <span style="background: ${getPriorityColor(ticket.priority)}; color: white; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 12px;">
                                        ${ticket.priority}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;"><strong>วันที่ต้องการ:</strong></td>
                                <td style="padding: 8px 0; color: #0f172a;">${formatThaiDateOnly(ticket.target_date)}</td>
                            </tr>
                        </table>
                    </div>

                    ${ticket.notes ? `
                    <div style="background: #fffbeb; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; margin: 20px 0;">
                        <p style="margin-top: 0; color: #b45309; font-weight: bold;">บันทึก/รายละเอียดเพิ่มเติม:</p>
                        <p style="margin: 0; color: #92400e;">${ticket.notes}</p>
                    </div>
                    ` : ''}

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${PORTAL_URL}/?view=all" style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                            เข้าสู่ระบบเพื่อรับเคส
                        </a>
                    </div>

                    <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px;">
                        <strong>รหัสอ้างอิง:</strong> ${ticket.req_id}<br>
                        <strong>มอบหมายเมื่อ:</strong> ${formatThaiDateTime()}<br>
                        อีเมลฉบับนี้ส่งจากระบบอัตโนมัติ กรุณาอย่าตอบกลับ
                    </p>
                </div>

                <div style="background: #1e293b; color: #cbd5e1; padding: 20px; text-align: center; font-size: 12px;">
                    <p style="margin: 0;">IT Help Desk | Daikin Thailand</p>
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
        subject: `[${ticket.req_id}] ปิดเคสสำเร็จ (COMPLETED): ${ticket.project_name}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px;">
                    <h1 style="margin: 0; font-size: 20px;">✅ แก้ไขปัญหาเสร็จสิ้น</h1>
                </div>
                
                <div style="background: #f8fafc; padding: 20px;">
                    <p style="color: #334155;">สวัสดีคุณ ${userName},</p>
                    
                    <p style="color: #334155;">ทีมงาน IT ได้ดำเนินการแก้ไขปัญหาของคุณเรียบร้อยแล้ว และทำการปิดเคส</p>
                    
                    <div style="background: white; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0; border-radius: 0 8px 8px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <p style="margin-top: 0; color: #1e293b;"><strong>ข้อมูลการปิดเคส:</strong></p>
                        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; width: 35%;"><strong>หมายเลขเคส:</strong></td>
                                <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">${ticket.req_id}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;"><strong>ปัญหาที่แจ้ง:</strong></td>
                                <td style="padding: 8px 0; color: #0f172a;">${ticket.project_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;"><strong>สถานะ:</strong></td>
                                <td style="padding: 8px 0;">
                                    <span style="background: #10b981; color: white; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 12px;">
                                        เสร็จสิ้น (COMPLETED)
                                    </span>
                                </td>
                            </tr>
                            ${ticket.root_cause ? `
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; vertical-align: top;"><strong>สาเหตุของปัญหา:</strong></td>
                                <td style="padding: 8px 0; color: #b45309; font-weight: 500;">${ticket.root_cause}</td>
                            </tr>
                            ` : ''}
                            ${ticket.solution ? `
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; vertical-align: top;"><strong>วิธีการแก้ไข:</strong></td>
                                <td style="padding: 8px 0; color: #15803d; font-weight: 500;">${ticket.solution}</td>
                            </tr>
                            ` : ''}
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;"><strong>วันที่ปิดเคส:</strong></td>
                                <td style="padding: 8px 0; color: #0f172a;">${formatThaiDateTime(ticket.completed_at || undefined)}</td>
                            </tr>
                        </table>
                    </div>

                    ${ticket.notes ? `
                    <div style="background: #f0fdf4; padding: 15px; border-left: 4px solid #22c55e; border-radius: 0 8px 8px 0; margin: 20px 0;">
                        <p style="margin-top: 0; color: #166534; font-weight: bold;">บันทึกส่งท้าย (Notes):</p>
                        <p style="margin: 0; color: #15803d;">${ticket.notes}</p>
                    </div>
                    ` : ''}

                    <p style="margin-top: 20px; color: #334155;">หากคุณพบปัญหาเพิ่มเติมหรือต้องการความช่วยเหลืออื่นๆ สามารถแจ้งเคสใหม่ผ่านระบบได้เสมอ</p>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${PORTAL_URL}/?view=all" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                            ประเมินความพึงพอใจ / ดูประวัติ
                        </a>
                    </div>

                    <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px;">
                        <strong>รหัสอ้างอิง:</strong> ${ticket.req_id}<br>
                        <strong>ปิดเคสเมื่อ:</strong> ${formatThaiDateTime(ticket.completed_at || undefined)}<br>
                        อีเมลฉบับนี้ส่งจากระบบอัตโนมัติ กรุณาอย่าตอบกลับ
                    </p>
                </div>

                <div style="background: #1e293b; color: #cbd5e1; padding: 20px; text-align: center; font-size: 12px;">
                    <p style="margin: 0;">IT Help Desk | Daikin Thailand</p>
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
