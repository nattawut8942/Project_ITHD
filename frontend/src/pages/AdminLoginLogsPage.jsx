// frontend/src/pages/AdminLoginLogsPage.jsx
// ประวัติการเข้าสู่ระบบของทุกคน (ดูได้เฉพาะผู้มีสิทธิ์ logs.view คือ admin)
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';
import Sidebar from '../components/Sidebar';
import MobileNavbar from '../components/MobileNavbar';
import { Search, History, Loader2, CheckCircle2, XCircle, Filter } from 'lucide-react';
import { formatThaiDateTime } from '../utils/styleHelpers';

const PAGE_SIZE = 50;

export const REASON_LABEL = {
    success: 'สำเร็จ',
    invalid_credentials: 'รหัสผ่านไม่ถูกต้อง',
    ad_timeout: 'ระบบยืนยันตัวตนไม่ตอบสนอง',
    ad_unavailable: 'เชื่อมต่อระบบยืนยันตัวตนไม่ได้',
    error: 'เกิดข้อผิดพลาดในระบบ',
};

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('authToken')}` });

export default function AdminLoginLogsPage() {
    const { user, logout, can } = useAuth();
    const navigate = useNavigate();
    const canView = can('logs.view');
    const [mobileOpen, setMobileOpen] = useState(false);

    const [filters, setFilters] = useState({ empCode: '', username: '', success: 'all', from: '', to: '' });
    const [applied, setApplied] = useState(filters);
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!canView) navigate('/', { replace: true });
    }, [canView, navigate]);

    useEffect(() => {
        if (!canView) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError('');
            try {
                const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
                if (applied.empCode.trim()) params.set('empCode', applied.empCode.trim());
                if (applied.username.trim()) params.set('username', applied.username.trim());
                if (applied.success !== 'all') params.set('success', applied.success);
                if (applied.from) params.set('from', applied.from);
                if (applied.to) params.set('to', applied.to);
                const res = await fetch(`${API_BASE}/admin/login-logs?${params}`, { headers: authHeaders() });
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.message || 'โหลดประวัติไม่สำเร็จ');
                if (!cancelled) {
                    setItems(data.data.items || []);
                    setTotal(data.data.total || 0);
                }
            } catch (e) {
                if (!cancelled) setError(e.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [canView, applied, page]);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const apply = (e) => {
        e?.preventDefault();
        setPage(1);
        setApplied(filters);
    };

    if (!canView) return null;

    return (
        <div className="min-h-screen bg-paper text-ink font-sans flex flex-col md:flex-row overflow-hidden">
            <MobileNavbar user={user} onMenuClick={() => setMobileOpen(true)} />
            <Sidebar user={user} isITStaff={true} logout={logout} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

            <main className="flex-1 flex flex-col h-screen overflow-hidden p-0 md:p-6">
                <div className="bg-surface rounded-lg shadow-soft flex flex-col h-full overflow-hidden border border-line">
                    <header className="px-6 py-5 border-b border-line bg-surface flex items-center gap-4 shrink-0">
                        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                            <History className="w-6 h-6" />
                        </span>
                        <div>
                            <h1 className="font-display text-2xl font-bold text-ink">ประวัติการเข้าสู่ระบบ</h1>
                            <p className="text-sm text-muted mt-1">ทุกครั้งที่เข้าสู่ระบบ ทั้งสำเร็จและไม่สำเร็จ ({total.toLocaleString('th-TH')} รายการ)</p>
                        </div>
                    </header>

                    <form onSubmit={apply} className="px-6 py-4 border-b border-line bg-surface grid grid-cols-1 md:grid-cols-5 gap-3 items-end shrink-0">
                        <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-slate-600">รหัสพนักงาน</span>
                            <input value={filters.empCode} onChange={e => setFilters(f => ({ ...f, empCode: e.target.value }))} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/10" placeholder="เช่น 41329" />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-slate-600">ชื่อผู้ใช้</span>
                            <input value={filters.username} onChange={e => setFilters(f => ({ ...f, username: e.target.value }))} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/10" placeholder="ค้นหาบางส่วนได้" />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-slate-600">ผลการเข้าสู่ระบบ</span>
                            <select value={filters.success} onChange={e => setFilters(f => ({ ...f, success: e.target.value }))} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/10">
                                <option value="all">ทั้งหมด</option>
                                <option value="true">สำเร็จ</option>
                                <option value="false">ไม่สำเร็จ</option>
                            </select>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <label className="block">
                                <span className="mb-1 block text-xs font-semibold text-slate-600">ตั้งแต่</span>
                                <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} className="w-full rounded-lg border border-line bg-surface px-2 py-2 text-sm focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/10" />
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-xs font-semibold text-slate-600">ถึง</span>
                                <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} className="w-full rounded-lg border border-line bg-surface px-2 py-2 text-sm focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/10" />
                            </label>
                        </div>
                        <button type="submit" className="lift inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white shadow-soft hover:bg-ink-soft">
                            <Filter className="w-4 h-4" /> ค้นหา
                        </button>
                    </form>

                    <div className="flex-1 overflow-auto custom-scrollbar p-4 sm:p-6">
                        {error && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}
                        {loading ? (
                            <div className="flex items-center justify-center gap-3 py-20 text-muted">
                                <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลด...
                            </div>
                        ) : items.length === 0 ? (
                            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line bg-paper py-16 text-center">
                                <Search className="w-8 h-8 text-slate-400" />
                                <p className="font-semibold text-ink-soft">ไม่พบประวัติที่ตรงกับเงื่อนไข</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border border-line">
                                <table className="w-full min-w-[820px] text-left text-sm">
                                    <thead className="bg-paper text-xs font-semibold text-slate-600">
                                        <tr>
                                            <th className="px-4 py-3">เวลา</th>
                                            <th className="px-4 py-3">ชื่อผู้ใช้</th>
                                            <th className="px-4 py-3">รหัสพนักงาน</th>
                                            <th className="px-4 py-3">ผล</th>
                                            <th className="px-4 py-3">สาเหตุ</th>
                                            <th className="px-4 py-3">IP</th>
                                            <th className="px-4 py-3">อุปกรณ์ / เบราว์เซอร์</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-line">
                                        {items.map(row => (
                                            <tr key={row.id} className="bg-surface hover:bg-paper transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap text-slate-700">{formatThaiDateTime(row.loggedAt)}</td>
                                                <td className="px-4 py-3 font-semibold text-slate-900">{row.username}</td>
                                                <td className="px-4 py-3 text-slate-700">{row.empCode || '-'}</td>
                                                <td className="px-4 py-3">
                                                    {row.success ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800"><CheckCircle2 className="w-3.5 h-3.5" /> สำเร็จ</span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700"><XCircle className="w-3.5 h-3.5" /> ไม่สำเร็จ</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-600">{REASON_LABEL[row.reason] || row.reason || '-'}</td>
                                                <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.ipAddress || '-'}</td>
                                                <td className="px-4 py-3 text-xs text-slate-500 max-w-[260px] truncate" title={row.userAgent || ''}>{row.userAgent || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-line bg-paper px-6 py-3 shrink-0">
                        <p className="text-xs font-semibold text-slate-600">หน้า {page} จาก {totalPages}</p>
                        <div className="flex gap-2">
                            <button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="min-h-[36px] rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-slate-700 hover:bg-paper disabled:opacity-40">ก่อนหน้า</button>
                            <button type="button" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="min-h-[36px] rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-slate-700 hover:bg-paper disabled:opacity-40">ถัดไป</button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
