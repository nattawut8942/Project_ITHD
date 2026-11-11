// frontend/src/pages/AdminUsersPage.jsx
// จัดการบทบาทของผู้ใช้ (admin เท่านั้น)
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';
import Sidebar from '../components/Sidebar';
import MobileNavbar from '../components/MobileNavbar';
import EmployeeAvatar from '../components/EmployeeAvatar';
import { Search, ShieldCheck, Save, X, Loader2, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatThaiDateTime } from '../utils/styleHelpers';

export const ROLE_META = {
    admin: { label: 'ผู้ดูแลระบบ', hint: 'ทำได้ทุกอย่าง', pill: 'text-violet-800 bg-violet-50 border-violet-200' },
    it_staff: { label: 'เจ้าหน้าที่ IT', hint: 'รับและจัดการเคส', pill: 'text-indigo-800 bg-indigo-50 border-indigo-200' },
    user: { label: 'ผู้ใช้ทั่วไป', hint: 'แจ้งและติดตามเคส', pill: 'text-slate-700 bg-slate-100 border-slate-200' },
};
const ROLE_FILTERS = ['all', 'admin', 'it_staff', 'user'];
const PAGE_SIZE = 25;

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('authToken')}` });

export default function AdminUsersPage() {
    const { user, logout, can } = useAuth();
    const navigate = useNavigate();
    const canManage = can('users.manage');
    const [mobileOpen, setMobileOpen] = useState(false);

    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [drafts, setDrafts] = useState({});   // empCode -> role เลือกใหม่ที่ยังไม่บันทึก
    const [savingEmp, setSavingEmp] = useState(null);
    const [notice, setNotice] = useState(null);  // { type: 'ok' | 'error', text }

    useEffect(() => {
        if (!canManage) navigate('/', { replace: true });
    }, [canManage, navigate]);

    const load = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
            if (search.trim()) params.set('search', search.trim());
            if (roleFilter !== 'all') params.set('role', roleFilter);
            const res = await fetch(`${API_BASE}/admin/users?${params}`, { headers: authHeaders() });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'โหลดรายชื่อไม่สำเร็จ');
            setItems(data.data.items || []);
            setTotal(data.data.total || 0);
        } catch (e) {
            setNotice({ type: 'error', text: e.message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (canManage) load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canManage, page, roleFilter]);

    // ค้นหาเมื่อหยุดพิมพ์ 300ms
    useEffect(() => {
        if (!canManage) return;
        const t = setTimeout(() => { setPage(1); load(); }, 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    useEffect(() => {
        if (!notice) return;
        const t = setTimeout(() => setNotice(null), 4000);
        return () => clearTimeout(t);
    }, [notice]);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const selfCode = user?.empcode;

    const saveRole = async (row) => {
        const newRole = drafts[row.empCode];
        if (!newRole || newRole === row.role) return;
        setSavingEmp(row.empCode);
        try {
            const res = await fetch(`${API_BASE}/admin/users/${encodeURIComponent(row.empCode)}/role`, {
                method: 'PUT',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) throw new Error(data.message || 'บันทึกไม่สำเร็จ');
            setDrafts(d => { const n = { ...d }; delete n[row.empCode]; return n; });
            setNotice({ type: 'ok', text: `เปลี่ยนบทบาทของ ${row.name || row.empCode} เป็น ${ROLE_META[newRole].label} แล้ว` });
            await load();
        } catch (e) {
            setNotice({ type: 'error', text: e.message });
        } finally {
            setSavingEmp(null);
        }
    };

    const counts = useMemo(() => ({ total }), [total]);

    if (!canManage) return null;

    return (
        <div className="min-h-screen bg-paper text-ink font-sans flex flex-col md:flex-row overflow-hidden">
            <MobileNavbar user={user} onMenuClick={() => setMobileOpen(true)} />
            <Sidebar user={user} isITStaff={true} logout={logout} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

            <main className="flex-1 flex flex-col h-screen overflow-hidden p-0 md:p-6">
                <div className="bg-surface rounded-lg shadow-soft flex flex-col h-full overflow-hidden border border-line">
                    <header className="px-6 py-5 border-b border-line bg-surface flex flex-col xl:flex-row justify-between gap-4 shrink-0">
                        <div className="flex items-center gap-4">
                            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                                <ShieldCheck className="w-6 h-6" />
                            </span>
                            <div>
                                <h1 className="font-display text-2xl font-bold text-ink">จัดการสิทธิ์ผู้ใช้</h1>
                                <p className="text-sm text-muted mt-1">กำหนดบทบาทของพนักงานทั้งหมด ({counts.total.toLocaleString('th-TH')} คน)</p>
                            </div>
                        </div>
                        <div className="relative w-full xl:w-80">
                            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="search"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="ค้นหาชื่อ รหัส หรืออีเมล"
                                className="w-full rounded-full border border-line bg-paper py-2 pl-9 pr-4 text-sm focus:border-ink focus:bg-surface focus:outline-none focus:ring-4 focus:ring-ink/10"
                            />
                        </div>
                    </header>

                    <div className="px-6 py-3 border-b border-line bg-surface flex flex-wrap items-center gap-2">
                        {ROLE_FILTERS.map(r => (
                            <button
                                key={r}
                                type="button"
                                onClick={() => { setPage(1); setRoleFilter(r); }}
                                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${roleFilter === r ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink-soft hover:bg-paper'}`}
                            >
                                {r === 'all' ? 'ทั้งหมด' : ROLE_META[r].label}
                            </button>
                        ))}
                    </div>

                    {notice && (
                        <div role="status" className={`mx-6 mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${notice.type === 'ok' ? 'border-teal-200 bg-teal-50 text-teal-800' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                            {notice.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            {notice.text}
                        </div>
                    )}

                    <div className="flex-1 overflow-auto custom-scrollbar p-4 sm:p-6">
                        {loading ? (
                            <div className="flex items-center justify-center gap-3 py-20 text-muted">
                                <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลด...
                            </div>
                        ) : items.length === 0 ? (
                            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line bg-paper py-16 text-center">
                                <Users className="w-8 h-8 text-slate-400" />
                                <p className="font-semibold text-ink-soft">ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border border-line">
                                <table className="w-full min-w-[860px] text-left text-sm">
                                    <thead className="bg-paper text-xs font-semibold text-slate-600">
                                        <tr>
                                            <th className="px-4 py-3">พนักงาน</th>
                                            <th className="px-4 py-3">แผนก / cost center</th>
                                            <th className="px-4 py-3">บทบาท</th>
                                            <th className="px-4 py-3">เข้าสู่ระบบล่าสุด</th>
                                            <th className="px-4 py-3">เปลี่ยนล่าสุดโดย</th>
                                            <th className="px-4 py-3 text-right">การกระทำ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-line">
                                        {items.map(row => {
                                            const draft = drafts[row.empCode];
                                            const isSelf = row.empCode === selfCode;
                                            const meta = ROLE_META[row.role] || ROLE_META.user;
                                            return (
                                                <tr key={row.empCode} className="bg-surface hover:bg-paper transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <EmployeeAvatar empCode={row.empCode} name={row.name} size={48} />
                                                            <div className="min-w-0">
                                                                <p className="truncate font-semibold text-slate-900">{row.name || '-'}{isSelf && <span className="ml-2 text-[11px] font-semibold text-violet-700">(คุณ)</span>}</p>
                                                                <p className="truncate text-xs text-slate-500">{row.empCode} · {row.email || 'ไม่มีอีเมล'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-700">
                                                        <p className="truncate max-w-[220px]">{row.sect || '-'}</p>
                                                        <p className="text-xs text-slate-500">{row.costCenter || '-'}{row.position ? ` · ${row.position}` : ''}</p>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <select
                                                                value={draft ?? row.role}
                                                                disabled={savingEmp === row.empCode}
                                                                aria-label={`บทบาทของ ${row.name || row.empCode}`}
                                                                onChange={e => setDrafts(d => ({ ...d, [row.empCode]: e.target.value }))}
                                                                className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm font-semibold focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/10"
                                                            >
                                                                {Object.entries(ROLE_META).map(([key, m]) => (
                                                                    <option key={key} value={key}>{m.label}</option>
                                                                ))}
                                                            </select>
                                                            <span className={`hidden xl:inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.pill}`}>{meta.hint}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-slate-600">
                                                        {row.lastLoginAt ? formatThaiDateTime(row.lastLoginAt) : 'ยังไม่เคยเข้าระบบ'}
                                                        <p className="text-[11px] text-slate-500">รวม {row.loginCount} ครั้ง</p>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-slate-600">
                                                        {row.roleUpdatedBy ? (
                                                            <>
                                                                <p className="font-semibold text-slate-700">{row.roleUpdatedBy}</p>
                                                                <p className="text-[11px] text-slate-500">{row.roleUpdatedAt ? formatThaiDateTime(row.roleUpdatedAt) : ''}</p>
                                                            </>
                                                        ) : <span className="text-slate-400">-</span>}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {draft && draft !== row.role ? (
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setDrafts(d => { const n = { ...d }; delete n[row.empCode]; return n; })}
                                                                    className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-slate-700 hover:bg-paper"
                                                                >
                                                                    <X className="w-3.5 h-3.5" /> ยกเลิก
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={savingEmp === row.empCode}
                                                                    onClick={() => saveRole(row)}
                                                                    className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-ink px-3 text-xs font-semibold text-white hover:bg-ink-soft disabled:opacity-60"
                                                                >
                                                                    {savingEmp === row.empCode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} บันทึก
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <p className="text-right text-xs text-slate-400">{isSelf ? 'บทบาทของคุณ' : ''}</p>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
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
