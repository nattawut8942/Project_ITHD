// Use these color mappings across the application for consistency
import { Monitor, Laptop, Wifi, Key, Shield, Headphones, Factory, Briefcase, Database, LayoutDashboard, Wrench, MapPin, Paperclip } from 'lucide-react';
import React from 'react';

export const getDeviceTypeColor = (type) => {
    if (!type) {
        return {
            bg: 'bg-slate-100',
            text: 'text-slate-600',
            border: 'border-slate-200',
            gradient: 'from-slate-500 to-slate-600',
            hex: '#64748b'
        };
    }

    const t = type.toUpperCase().trim();

    if (t.includes('HARDWARE') || t.includes('MONITOR') || t.includes('SETUP') || t.includes('REPAIR')) {
        return {
            bg: 'bg-indigo-50/70',
            text: 'text-indigo-600',
            border: 'border-indigo-150',
            gradient: 'from-indigo-500 to-indigo-600',
            hex: '#4f46e5'
        };
    }
    if (t.includes('SOFTWARE') || t.includes('SYSTEM') || t.includes('PROGRAM')) {
        return {
            bg: 'bg-purple-50/70',
            text: 'text-purple-600',
            border: 'border-purple-150',
            gradient: 'from-purple-500 to-purple-600',
            hex: '#9333ea'
        };
    }
    if (t.includes('NETWORK') || t.includes('WIFI') || t.includes('INTERNET') || t.includes('PRINTER')) {
        return {
            bg: 'bg-sky-50/70',
            text: 'text-sky-600',
            border: 'border-sky-150',
            gradient: 'from-sky-500 to-sky-600',
            hex: '#0284c7'
        };
    }
    if (t.includes('ACCOUNT') || t.includes('ACCESS') || t.includes('KEY') || t.includes('PERMISSION')) {
        return {
            bg: 'bg-amber-50/70',
            text: 'text-amber-700',
            border: 'border-amber-150',
            gradient: 'from-amber-500 to-amber-600',
            hex: '#b45309'
        };
    }
    if (t.includes('SECURITY') || t.includes('SHIELD') || t.includes('ANTIVIRUS')) {
        return {
            bg: 'bg-rose-50/70',
            text: 'text-rose-600',
            border: 'border-rose-150',
            gradient: 'from-rose-500 to-rose-600',
            hex: '#e11d48'
        };
    }
    if (t.includes('RELOCATION') || t.includes('MOVE') || t.includes('MAP')) {
        return {
            bg: 'bg-teal-50/70',
            text: 'text-teal-600',
            border: 'border-teal-150',
            gradient: 'from-teal-500 to-teal-600',
            hex: '#0d9488'
        };
    }
    if (t.includes('PRODUCTION') || t.includes('FACTORY')) {
        return {
            bg: 'bg-emerald-50/70',
            text: 'text-emerald-600',
            border: 'border-emerald-150',
            gradient: 'from-emerald-500 to-emerald-600',
            hex: '#059669'
        };
    }
    if (t.includes('OFFICE') || t.includes('BRIEFCASE') || t.includes('SERVICE') || t.includes('REQUEST')) {
        return {
            bg: 'bg-fuchsia-50/70',
            text: 'text-fuchsia-600',
            border: 'border-fuchsia-150',
            gradient: 'from-fuchsia-500 to-fuchsia-600',
            hex: '#c026d3'
        };
    }

    return {
        bg: 'bg-slate-100',
        text: 'text-slate-600',
        border: 'border-slate-200',
        gradient: 'from-slate-550 to-slate-650',
        hex: '#475569'
    };
};

export const getRequestTypeIcon = (type) => {
    if (!type) return <LayoutDashboard className="w-4 h-4 text-slate-600" />;

    const { text } = getDeviceTypeColor(type);
    const t = type.toUpperCase().trim();

    if (t.includes('HARDWARE')) return <Monitor className={`w-4 h-4 ${text}`} />;
    if (t.includes('SOFTWARE')) return <Laptop className={`w-4 h-4 ${text}`} />;
    if (t.includes('NETWORK')) return <Wifi className={`w-4 h-4 ${text}`} />;
    if (t.includes('ACCOUNT') || t.includes('ACCESS')) return <Key className={`w-4 h-4 ${text}`} />;
    if (t.includes('SECURITY')) return <Shield className={`w-4 h-4 ${text}`} />;
    if (t.includes('SERVICE') || t.includes('REQUEST')) return <Headphones className={`w-4 h-4 ${text}`} />;
    if (t.includes('PRODUCTION')) return <Factory className={`w-4 h-4 ${text}`} />;
    if (t.includes('OFFICE')) return <Briefcase className={`w-4 h-4 ${text}`} />;
    if (t.includes('SYSTEM')) return <Database className={`w-4 h-4 ${text}`} />;

    // Fallbacks
    if (t.includes('SETUP')) return <Monitor className={`w-4 h-4 ${text}`} />;
    if (t.includes('REPAIR')) return <Wrench className={`w-4 h-4 ${text}`} />;
    if (t.includes('RELOCATION') || t.includes('MOVE')) return <MapPin className={`w-4 h-4 ${text}`} />;
    if (t.includes('PRINTER')) return <Paperclip className={`w-4 h-4 ${text}`} />;

    return <LayoutDashboard className={`w-4 h-4 ${text}`} />;
};

export const getBadgeStyle = (type) => {
    const { bg, text, border } = getDeviceTypeColor(type);
    return `${bg} ${text} ${border}`;
};

export const getColorGradient = (type) => {
    const { gradient } = getDeviceTypeColor(type);
    return gradient;
};

// For Recharts or other chart libraries
export const getChartColor = (type) => {
    const { hex } = getDeviceTypeColor(type);
    return hex;
};

export const getStatusStyle = (status) => {
    switch (status) {
        case 'Open':
        case 'Pending': return 'text-blue-800 bg-blue-50 border-blue-200';
        case 'In Progress': return 'text-amber-800 bg-amber-50 border-amber-200';
        case 'On Hold': return 'text-orange-800 bg-orange-50 border-orange-200';
        case 'Closed':
        case 'Completed': return 'text-teal-800 bg-teal-50 border-teal-200';
        case 'Rejected': return 'text-rose-800 bg-rose-50 border-rose-200';
        case 'Cancelled': return 'text-slate-600 bg-slate-100 border-slate-200';
        default: return 'text-slate-600 bg-slate-100 border-slate-200';
    }
};

export const getStatusLabel = (status) => {
    switch (status) {
        case 'Open':
        case 'Pending': return 'รอรับเรื่อง';
        case 'In Progress': return 'กำลังดำเนินการ';
        case 'On Hold': return 'พักไว้';
        case 'Closed':
        case 'Completed': return 'ปิดแล้ว';
        case 'Rejected': return 'ปฏิเสธ';
        case 'Cancelled': return 'ยกเลิก';
        default: return status || '';
    }
};

// Dot colour per status (same palette as getStatusStyle)
export const getStatusDot = (status) => {
    switch (status) {
        case 'Open':
        case 'Pending': return 'bg-blue-500';
        case 'In Progress': return 'bg-amber-500';
        case 'On Hold': return 'bg-orange-500';
        case 'Closed':
        case 'Completed': return 'bg-teal-600';
        case 'Rejected': return 'bg-rose-600';
        default: return 'bg-slate-400';
    }
};

// Timeline actions -> Thai label + dot colour. Keys are the action_type values from the API.
const ACTION_META = {
    'Created': { label: 'เปิดงาน', dot: 'bg-blue-500' },
    'Comment': { label: 'ความคิดเห็น', dot: 'bg-slate-400' },
    'Assigned': { label: 'มอบหมายงาน', dot: 'bg-indigo-500' },
    'In Progress': { label: 'รับเคส', dot: 'bg-amber-500' },
    'On Hold': { label: 'พักไว้', dot: 'bg-orange-500' },
    'Closed': { label: 'ปิดงาน', dot: 'bg-teal-600' },
    'Rejected': { label: 'ปฏิเสธ', dot: 'bg-rose-600' },
    'Cancelled': { label: 'ยกเลิก', dot: 'bg-slate-400' },
    'Status Update': { label: 'เปลี่ยนสถานะ', dot: 'bg-slate-400' },
};

ACTION_META['Helper Added'] = { label: 'เพิ่มผู้ช่วย', dot: 'bg-indigo-400' };
ACTION_META['Helper Removed'] = { label: 'ลบผู้ช่วย', dot: 'bg-slate-400' };
ACTION_META['Priority Changed'] = { label: 'เปลี่ยนความเร่งด่วน', dot: 'bg-amber-400' };

export const getActionLabel = (action) => ACTION_META[action]?.label || action || '-';

const PRIORITY_TH = { Low: 'รอได้', Normal: 'ปกติ', Medium: 'ปานกลาง', High: 'ด่วน', Critical: 'วิกฤต' };
const STATUS_TH = {
    Open: 'รอรับเรื่อง', Pending: 'รอรับเรื่อง', 'In Progress': 'กำลังดำเนินการ', 'On Hold': 'พักไว้',
    Closed: 'ปิดแล้ว', Completed: 'ปิดแล้ว', Rejected: 'ปฏิเสธ', Cancelled: 'ยกเลิก',
};

/**
 * แปลข้อความประวัติเคสที่ยังเป็นภาษาอังกฤษ (ข้อมูลเก่าที่บันทึกไว้ก่อนหน้านี้) ให้เป็นไทย
 * ข้อความที่ไม่ตรงรูปแบบที่รู้จักจะแสดงตามเดิม
 */
export const translateHistoryDetail = (text) => {
    if (!text || typeof text !== 'string') return text || '';
    if (text === 'Ticket opened by user') return 'เปิดเคสโดยผู้แจ้ง';

    let m = text.match(/^Status changed from (.+?) to (.+)$/);
    if (m) return `เปลี่ยนสถานะจาก ${STATUS_TH[m[1]] || m[1]} เป็น ${STATUS_TH[m[2]] || m[2]}`;

    m = text.match(/^Priority changed from (.+?) to (.+)$/);
    if (m) return `เปลี่ยนความเร่งด่วนจาก ${PRIORITY_TH[m[1]] || m[1]} เป็น ${PRIORITY_TH[m[2]] || m[2]}`;

    m = text.match(/^Assigned to IT Staff: (.+)$/);
    if (m) return `มอบหมายให้ ${m[1]}`;

    m = text.match(/^Hold โดย (.*)$/);
    if (m) return `พักไว้โดย ${m[1]}`;

    m = text.match(/^Resume โดย (.*)$/);
    if (m) return `กลับมาดำเนินการโดย ${m[1]}`;

    return text;
};

export const getActionDot = (log) => {
    if (log?.action_type === 'Status Update') {
        const d = log.details || '';
        const hit = ['Closed', 'Rejected', 'Cancelled', 'In Progress', 'On Hold', 'Open'].find(s => d.includes(s));
        return hit ? getStatusDot(hit) : 'bg-slate-400';
    }
    return ACTION_META[log?.action_type]?.dot || 'bg-slate-400';
};

// Priority: Thai label + pill colour. Keys are the stored values.
const PRIORITY_META = {
    'Low': { label: 'รอได้', cls: 'text-slate-600 bg-slate-100 border-slate-200' },
    'Normal': { label: 'ปกติ', cls: 'text-slate-600 bg-slate-100 border-slate-200' },
    'Medium': { label: 'ปานกลาง', cls: 'text-blue-800 bg-blue-50 border-blue-200' },
    'High': { label: 'ด่วน', cls: 'text-amber-800 bg-amber-50 border-amber-200' },
    'Critical': { label: 'วิกฤต', cls: 'text-rose-800 bg-rose-50 border-rose-200' },
};

export const getPriorityLabel = (priority) => PRIORITY_META[priority]?.label || priority || '-';
export const getPriorityPill = (priority) => PRIORITY_META[priority]?.cls || 'text-slate-600 bg-slate-100 border-slate-200';

const parseDate = (value, dateOnlyTimeZone = null) => {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

    const dateOnly = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    const date = dateOnly
        ? dateOnlyTimeZone === 'Asia/Bangkok'
            ? new Date(`${value}T00:00:00+07:00`)
            : new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
        : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDateShort = (value) => {
    const date = parseDate(value);
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
};

export const formatThaiDateTime = (value) => {
    const date = parseDate(value, 'Asia/Bangkok');
    if (!date) return '';
    return date.toLocaleString('th-TH', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Bangkok'
    });
};