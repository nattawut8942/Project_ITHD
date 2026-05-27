import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ticketAPI } from '../utils/apiClient';
import Sidebar from '../components/Sidebar';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import {
  Lock, TrendingUp, Users, Clock, CheckCircle, BarChart2,
  AlertTriangle, Target, Activity, Database // <-- Added Database here
} from 'lucide-react';

const COLORS_STATUS = {
  Completed: '#10b981', 'In Progress': '#3b82f6',
  Pending: '#f59e0b', Rejected: '#ef4444', Cancelled: '#64748b'
};
const PALETTE = ['#6366f1','#8b5cf6','#0ea5e9','#f59e0b','#f43f5e','#10b981','#64748b','#ec4899'];

const fmtDays  = (ms) => ms > 0 ? (ms / 86400000).toFixed(1) : '0';
const slaColor = (pct) => pct >= 90 ? 'text-emerald-600' : pct >= 70 ? 'text-amber-500' : 'text-rose-500';
const slaBg    = (pct) => pct >= 90 ? 'bg-emerald-500'   : pct >= 70 ? 'bg-amber-400'   : 'bg-rose-500';

export default function ReportPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const isITStaff = user?.cost_center === '7510';

  useEffect(() => {
    if (!isITStaff) { navigate('/'); return; }
    (async () => {
      setIsLoading(true);
      try {
        const res = await ticketAPI.getTickets();
        const tickets = res.data.data || res.data;
        setRequests(Array.isArray(tickets) ? tickets : []);
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    })();
  }, [isITStaff, navigate]);

  // KPIs
  const kpi = useMemo(() => {
    if (!requests.length) return { total:0,completed:0,rate:0,avgDays:'0',slaRate:0,overdue:0,critical:0,pending:0,inProgress:0,rejected:0,cancelled:0 };
    const completed  = requests.filter(r => r.status === 'Completed');
    const withTime   = completed.filter(r => r.accepted_at && r.completed_at);
    const avgMs      = withTime.length ? withTime.reduce((s,r) => s + (new Date(r.completed_at) - new Date(r.accepted_at)), 0) / withTime.length : 0;
    const onTime     = completed.filter(r => r.target_date && r.completed_at && new Date(r.completed_at) <= new Date(r.target_date)).length;
    const overdue    = requests.filter(r => !['Completed','Rejected','Cancelled'].includes(r.status) && r.target_date && new Date(r.target_date) < new Date()).length;
    return {
      total: requests.length,
      completed: completed.length,
      rejected: requests.filter(r => r.status === 'Rejected').length,
      cancelled: requests.filter(r => r.status === 'Cancelled').length,
      inProgress: requests.filter(r => r.status === 'In Progress').length,
      pending: requests.filter(r => r.status === 'Pending').length,
      rate: Math.round((completed.length / requests.length) * 100),
      avgDays: fmtDays(avgMs),
      slaRate: completed.length ? Math.round((onTime / completed.length) * 100) : 0,
      overdue, critical: requests.filter(r => r.priority === 'Critical' && r.status !== 'Completed').length,
    };
  }, [requests]);

  // Data processing functions
  const monthlyData = useMemo(() => {
    const map = {};
    requests.forEach(r => {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const label = d.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
      if (!map[key]) map[key] = { key, month: label, total: 0, completed: 0 };
      map[key].total++;
      if (r.status === 'Completed') map[key].completed++;
    });
    return Object.values(map).sort((a,b) => a.key.localeCompare(b.key)).slice(-8);
  }, [requests]);

  const statusData = useMemo(() => {
    const map = {};
    requests.forEach(r => { map[r.status] = (map[r.status] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [requests]);

  const typeData = useMemo(() => {
    const map = {};
    requests.forEach(r => {
      const key = r.problem_type_name || r.request_type || 'Other';
      if (!map[key]) map[key] = { name: key, total: 0, completed: 0 };
      map[key].total++;
      if (r.status === 'Completed') map[key].completed++;
    });
    return Object.values(map).sort((a,b) => b.total - a.total);
  }, [requests]);

  const subtypeData = useMemo(() => {
    const map = {};
    requests.forEach(r => { if (r.problem_subtype_name) map[r.problem_subtype_name] = (map[r.problem_subtype_name] || 0) + 1; });
    return Object.entries(map).map(([name,value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 8);
  }, [requests]);

  const staffData = useMemo(() => {
    const map = {};
    requests.forEach(r => {
      if (!r.empCode_assigned) return;
      const key = r.assigned_name || r.empCode_assigned;
      if (!map[key]) map[key] = { name: key, total: 0, completed: 0, totalMs: 0, count: 0, onTime: 0 };
      map[key].total++;
      if (r.status === 'Completed') {
        map[key].completed++;
        if (r.accepted_at && r.completed_at) { map[key].totalMs += new Date(r.completed_at) - new Date(r.accepted_at); map[key].count++; }
        if (r.target_date && r.completed_at && new Date(r.completed_at) <= new Date(r.target_date)) map[key].onTime++;
      }
    });
    return Object.values(map).map(s => ({
      ...s,
      avgDays: s.count ? fmtDays(s.totalMs / s.count) : '-',
      rate: Math.round((s.completed / s.total) * 100),
      sla: s.completed ? Math.round((s.onTime / s.completed) * 100) : 0,
    })).sort((a,b) => b.total - a.total);
  }, [requests]);

  const deptData = useMemo(() => {
    const map = {};
    requests.forEach(r => {
      const key = r.cost_center || 'N/A';
      if (!map[key]) map[key] = { cc: key, total: 0, completed: 0, critical: 0 };
      map[key].total++;
      if (r.status === 'Completed') map[key].completed++;
      if (r.priority === 'Critical') map[key].critical++;
    });
    return Object.values(map).sort((a,b) => b.total - a.total).slice(0, 10);
  }, [requests]);

  const locationData = useMemo(() => {
    const map = {};
    requests.forEach(r => {
      const key = r.location?.split('›')[0]?.trim() || r.location || 'N/A';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([name,value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 6);
  }, [requests]);

  const slaByType = useMemo(() => {
    const map = {};
    requests.filter(r => r.status === 'Completed').forEach(r => {
      const key = r.problem_type_name || r.request_type || 'Other';
      if (!map[key]) map[key] = { type: key, total: 0, onTime: 0, totalMs: 0, count: 0 };
      map[key].total++;
      if (r.target_date && r.completed_at && new Date(r.completed_at) <= new Date(r.target_date)) map[key].onTime++;
      if (r.accepted_at && r.completed_at) { map[key].totalMs += new Date(r.completed_at) - new Date(r.accepted_at); map[key].count++; }
    });
    return Object.values(map).map(d => ({
      ...d,
      sla: Math.round((d.onTime / d.total) * 100),
      avgDays: d.count ? parseFloat(fmtDays(d.totalMs / d.count)) : 0,
    })).sort((a,b) => b.total - a.total);
  }, [requests]);

  const priorityData = useMemo(() =>
    ['Critical','High','Medium','Normal'].map(p => ({ name: p, value: requests.filter(r => r.priority === p).length }))
  , [requests]);

  if (!isITStaff) return null;

  const tabs = [
    { id: 'overview', label: 'ภาพรวม (Overview)' },
    { id: 'type',     label: 'ประเภทปัญหา (Types)' },
    { id: 'staff',    label: 'ทีมงาน (IT Staff)' },
    { id: 'dept',     label: 'แผนก / สถานที่ (Locations)' },
    { id: 'sla',      label: 'SLA (Service Level)' },
  ];

  // Tooltip Style สำหรับ Recharts
  const customTooltipStyle = {
    borderRadius: '12px',
    border: 'none',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    fontSize: '12px',
    fontWeight: 'bold',
    padding: '12px'
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans flex relative overflow-hidden">
      <Sidebar user={user} isITStaff={isITStaff} logout={logout} />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden p-4 pl-0">
        <div className="bg-white rounded-[2rem] flex flex-col h-full shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-200/60 relative">
          
          {/* Header */}
          <header className="px-8 py-6 border-b border-slate-100 bg-white/80 backdrop-blur-md flex justify-between items-center z-10 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                <BarChart2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Analytics & Reports</h1>
                <p className="text-[10px] font-black text-slate-400 mt-0.5 uppercase tracking-widest">ภาพรวมการให้บริการ IT Help Desk</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-200/60 px-4 py-2 rounded-xl font-bold shadow-sm">
              <Lock className="w-3 h-3"/> IT Admin Only
            </span>
          </header>

          {/* Tabs (Modern Pill Style) */}
          <div className="px-8 py-4 bg-slate-50/30 border-b border-slate-100 flex gap-3 overflow-x-auto custom-scrollbar shrink-0">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-5 py-2 text-sm font-bold rounded-xl transition-all duration-300 whitespace-nowrap ${
                  tab === t.id 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                    : 'bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-slate-200'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30 custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                <Activity className="w-8 h-8 animate-spin text-indigo-500" />
                <span className="font-bold tracking-widest uppercase text-xs">กำลังประมวลผลข้อมูล...</span>
              </div>
            ) : (
              <div className="w-full space-y-6">
                
                {/* OVERVIEW TAB */}
                {tab === 'overview' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* Main KPIs */}
                    <div className="grid grid-cols-4 gap-5">
                      {[
                        { label: 'Ticket ทั้งหมด',  value: kpi.total,          icon: <BarChart2 className="w-6 h-6 text-white"/>,   bgIcon: 'bg-indigo-500',  shadow: 'shadow-indigo-200' },
                        { label: 'Completion Rate', value: `${kpi.rate}%`,      icon: <TrendingUp className="w-6 h-6 text-white"/>, bgIcon: 'bg-emerald-500', shadow: 'shadow-emerald-200' },
                        { label: 'Avg. Resolution', value: `${kpi.avgDays} วัน`,icon: <Clock className="w-6 h-6 text-white"/>,      bgIcon: 'bg-sky-500',     shadow: 'shadow-sky-200' },
                        { label: 'SLA On-time',     value: `${kpi.slaRate}%`,   icon: <Target className="w-6 h-6 text-white"/>,     bgIcon: kpi.slaRate>=80 ? 'bg-emerald-500' : 'bg-amber-400', shadow: kpi.slaRate>=80 ? 'shadow-emerald-200' : 'shadow-amber-200' },
                      ].map((s, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center justify-between shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                            <p className="text-3xl font-black text-slate-800 leading-none">{s.value}</p>
                          </div>
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${s.bgIcon} shadow-lg ${s.shadow}`}>
                            {s.icon}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Status Breakdown Mini Cards */}
                    <div className="grid grid-cols-5 gap-4">
                      {[
                        { label: 'รอดำเนินการ',  value: kpi.pending,    color: 'bg-amber-50/50 border-amber-200 text-amber-700' },
                        { label: 'กำลังทำ',       value: kpi.inProgress, color: 'bg-blue-50/50 border-blue-200 text-blue-700' },
                        { label: 'เสร็จแล้ว',     value: kpi.completed,  color: 'bg-emerald-50/50 border-emerald-200 text-emerald-700' },
                        { label: 'Rejected',      value: kpi.rejected,   color: 'bg-rose-50/50 border-rose-200 text-rose-700' },
                        { label: 'เกินกำหนด (Overdue)', value: kpi.overdue,  color: kpi.overdue > 0 ? 'bg-rose-100 border-rose-300 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-500' },
                      ].map((s, i) => (
                        <div key={i} className={`rounded-2xl border p-4 text-center shadow-sm ${s.color}`}>
                          <p className="text-3xl font-black">{s.value}</p>
                          <p className="text-[11px] font-bold mt-1 uppercase tracking-wider">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-3 gap-6">
                      
                      {/* Trend Chart */}
                      <div className="col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-indigo-500"/> Ticket Trend รายเดือน
                        </h3>
                        <ResponsiveContainer width="100%" height={240}>
                          <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#c7d2fe" stopOpacity={0.6}/><stop offset="95%" stopColor="#c7d2fe" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="gDone" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                            <XAxis dataKey="month" tick={{ fontSize:11, fill:'#94a3b8', fontWeight: 'bold' }} axisLine={false} tickLine={false} dy={10}/>
                            <YAxis tick={{ fontSize:11, fill:'#94a3b8', fontWeight: 'bold' }} axisLine={false} tickLine={false}/>
                            <Tooltip contentStyle={customTooltipStyle}/>
                            <Area type="monotone" dataKey="total" name="Ticket ทั้งหมด" stroke="#c7d2fe" fill="url(#gTotal)" strokeWidth={3}/>
                            <Area type="monotone" dataKey="completed" name="เสร็จแล้ว" stroke="#6366f1" fill="url(#gDone)" strokeWidth={3}/>
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Status Pie Chart */}
                      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
                        <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-500"/> Status Distribution
                        </h3>
                        <div className="flex-1 flex items-center justify-center">
                          <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                              <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} dataKey="value" paddingAngle={4}>
                                {statusData.map((e,i) => <Cell key={i} fill={COLORS_STATUS[e.name] || '#94a3b8'} stroke="none"/>)}
                              </Pie>
                              <Legend iconType="circle" iconSize={10} formatter={v => <span className="text-[11px] font-bold text-slate-600 ml-1">{v}</span>}/>
                              <Tooltip contentStyle={customTooltipStyle}/>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Priority Breakdown */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                      <h3 className="text-sm font-bold text-slate-800 mb-5">Priority Breakdown</h3>
                      <div className="grid grid-cols-4 gap-5">
                        {priorityData.map(p => {
                          const cfg = { 
                            Critical:{ color:'bg-rose-500', light:'bg-rose-50', text:'text-rose-700', border:'border-rose-100' }, 
                            High:{ color:'bg-orange-500', light:'bg-orange-50', text:'text-orange-700', border:'border-orange-100' }, 
                            Medium:{ color:'bg-sky-500', light:'bg-sky-50', text:'text-sky-700', border:'border-sky-100' }, 
                            Normal:{ color:'bg-slate-400', light:'bg-slate-50', text:'text-slate-700', border:'border-slate-100' } 
                          }[p.name] || {};
                          const pct = kpi.total ? Math.round((p.value / kpi.total) * 100) : 0;
                          return (
                            <div key={p.name} className={`rounded-2xl border ${cfg.border} ${cfg.light} p-5 shadow-sm`}>
                              <p className={`text-[11px] font-black uppercase tracking-widest mb-3 ${cfg.text}`}>{p.name}</p>
                              <p className="text-4xl font-black text-slate-800">{p.value}</p>
                              <div className="mt-4 h-2 bg-white/70 rounded-full overflow-hidden shadow-inner">
                                <div className={`h-full rounded-full ${cfg.color}`} style={{ width:`${pct}%` }}/>
                              </div>
                              <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase">{pct}% of total requests</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* TYPE TAB */}
                {tab === 'type' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-2 gap-6">
                      
                      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                          <Database className="w-5 h-5 text-indigo-500"/> ประเภทปัญหาหลัก (Main Types)
                        </h3>
                        <div className="space-y-5">
                          {typeData.map((t,i) => {
                            const pct  = kpi.total ? Math.round((t.total / kpi.total) * 100) : 0;
                            const rate = t.total   ? Math.round((t.completed / t.total) * 100) : 0;
                            return (
                              <div key={t.name}>
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ background: PALETTE[i % PALETTE.length] }}/>
                                    {t.name}
                                  </span>
                                  <div className="flex items-center gap-4 text-xs">
                                    <span className="font-bold text-slate-600">{t.total} เคส</span>
                                    <span className={`font-bold ${rate >= 70 ? 'text-emerald-500' : 'text-amber-500'}`}>{rate}% done</span>
                                  </div>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width:`${pct}%`, background: PALETTE[i % PALETTE.length] }}/>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <h3 className="text-sm font-bold text-slate-800 mb-6">ประเภทย่อยที่พบบ่อย (Sub-types)</h3>
                        {subtypeData.length === 0 ? (
                          <div className="flex h-full items-center justify-center pb-10">
                            <p className="text-slate-400 text-sm font-bold">ยังไม่มีข้อมูล</p>
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={subtypeData} layout="vertical" barSize={16} margin={{ top: 0, right: 20, left: -10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
                              <XAxis type="number" tick={{ fontSize:10, fill:'#94a3b8', fontWeight: 'bold' }} axisLine={false} tickLine={false}/>
                              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize:11, fill:'#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false}/>
                              <Tooltip contentStyle={customTooltipStyle} cursor={{fill: '#f8fafc'}}/>
                              <Bar dataKey="value" name="จำนวน (Tickets)" radius={[0,6,6,0]}>
                                {subtypeData.map((_,i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]}/>)}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-sm font-bold text-slate-800">สรุปสถานะแต่ละประเภทปัญหา</h3>
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-white">
                            <th className="text-left px-6 py-4">ประเภทปัญหา</th>
                            <th className="text-center py-4">ทั้งหมด</th>
                            <th className="text-center py-4">รอ (Pending)</th>
                            <th className="text-center py-4">กำลังทำ (In Prog)</th>
                            <th className="text-center py-4">เสร็จ (Done)</th>
                            <th className="text-center py-4">Reject</th>
                            <th className="text-center py-4">Completion</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {typeData.map((t,i) => {
                            const rows      = requests.filter(r => (r.problem_type_name || r.request_type) === t.name);
                            const pending   = rows.filter(r => r.status === 'Pending').length;
                            const inProg    = rows.filter(r => r.status === 'In Progress').length;
                            const completed = rows.filter(r => r.status === 'Completed').length;
                            const rejected  = rows.filter(r => r.status === 'Rejected').length;
                            const rate = rows.length ? Math.round((completed / rows.length) * 100) : 0;
                            return (
                              <tr key={t.name} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-6 py-4 flex items-center gap-3 font-semibold text-slate-700">
                                  <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: PALETTE[i % PALETTE.length] }}/>
                                  {t.name}
                                </td>
                                <td className="text-center font-black text-slate-800">{t.total}</td>
                                <td className="text-center font-bold text-amber-500">{pending}</td>
                                <td className="text-center font-bold text-blue-500">{inProg}</td>
                                <td className="text-center font-bold text-emerald-500">{completed}</td>
                                <td className="text-center font-bold text-rose-400">{rejected}</td>
                                <td className="text-center">
                                  <span className={`px-3 py-1 rounded-full text-xs font-black ${rate >= 70 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                    {rate}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* STAFF TAB */}
                {tab === 'staff' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-3 gap-5">
                      {[
                        { label: 'IT Staff ที่รับเคส',   value: staffData.length,                                                      icon: <Users className="w-6 h-6 text-white"/>,        bgIcon: 'bg-indigo-500',  shadow: 'shadow-indigo-200' },
                        { label: 'เคสที่ Assign แล้ว', value: requests.filter(r => r.empCode_assigned).length,                        icon: <CheckCircle className="w-6 h-6 text-white"/>, bgIcon: 'bg-blue-500',    shadow: 'shadow-blue-200' },
                        { label: 'เคสที่ยังไม่มีคนรับ',  value: requests.filter(r => !r.empCode_assigned && r.status === 'Pending').length, icon: <Clock className="w-6 h-6 text-white"/>,       bgIcon: 'bg-amber-400',   shadow: 'shadow-amber-200' },
                      ].map((s, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center justify-between shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                            <p className="text-4xl font-black text-slate-800 leading-none">{s.value}</p>
                          </div>
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${s.bgIcon} shadow-lg ${s.shadow}`}>
                            {s.icon}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <Users className="w-5 h-5 text-indigo-500"/> IT Staff Performance
                        </h3>
                      </div>
                      {staffData.length === 0 ? (
                        <div className="py-20 text-center">
                          <p className="text-slate-400 text-sm font-bold">ยังไม่มีข้อมูลการมอบหมายงาน</p>
                        </div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-white">
                              <th className="text-left px-6 py-4">ชื่อทีมงาน (Staff Name)</th>
                              <th className="text-center py-4">รับเคสทั้งหมด</th>
                              <th className="text-center py-4">ปิดเคสแล้ว</th>
                              <th className="text-center py-4">อัตราสำเร็จ (Comp.)</th>
                              <th className="text-center py-4">เวลาเฉลี่ย (Avg.)</th>
                              <th className="text-center py-4">SLA (On-time)</th>
                              <th className="px-6 py-4 text-left">Workload Bar</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {staffData.map(s => (
                              <tr key={s.name} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-6 py-4 flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-sm font-black text-indigo-700 shadow-sm border border-indigo-50 shrink-0">
                                    {s.name?.charAt(0) || '?'}
                                  </div>
                                  <span className="font-bold text-slate-700">{s.name}</span>
                                </td>
                                <td className="text-center font-black text-slate-800">{s.total}</td>
                                <td className="text-center font-bold text-emerald-500">{s.completed}</td>
                                <td className="text-center">
                                  <span className={`font-black ${s.rate >= 70 ? 'text-emerald-500' : 'text-amber-500'}`}>{s.rate}%</span>
                                </td>
                                <td className="text-center font-bold text-slate-500">{s.avgDays} <span className="text-xs font-normal">วัน</span></td>
                                <td className="text-center">
                                  <span className={`px-2 py-1 rounded-md text-[11px] font-black ${slaBg(s.sla)} text-white shadow-sm`}>{s.sla}%</span>
                                </td>
                                <td className="px-6">
                                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden w-full max-w-[120px]">
                                    <div className={`h-full rounded-full ${slaBg(s.rate)}`} style={{ width:`${(s.total / (staffData[0]?.total || 1)) * 100}%` }}/>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {/* DEPT TAB */}
                {tab === 'dept' && (
                  <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                      <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-indigo-500"/> แผนกที่แจ้งปัญหามากที่สุด (Top Cost Centers)
                      </h3>
                      <div className="space-y-4">
                        {deptData.map((d, i) => {
                          const pct  = kpi.total ? Math.round((d.total / kpi.total) * 100) : 0;
                          const rate = d.total   ? Math.round((d.completed / d.total) * 100) : 0;
                          return (
                            <div key={d.cc} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white transition-colors">
                              <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-6 h-6 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">{i+1}</div>
                                  <span className="font-mono font-bold text-slate-700 text-sm">CC: {d.cc}</span>
                                </div>
                                <div className="flex items-center gap-4 text-xs font-bold">
                                  {d.critical > 0 && <span className="text-rose-500 px-2 py-0.5 bg-rose-50 rounded text-[10px]">🔴 Critical: {d.critical}</span>}
                                  <span className="text-slate-600">{d.total} เคส</span>
                                  <span className={rate >= 70 ? 'text-emerald-500' : 'text-amber-500'}>{rate}% done</span>
                                </div>
                              </div>
                              <div className="h-2 bg-slate-200/60 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-indigo-500" style={{ width:`${pct}%` }}/>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                      <h3 className="text-sm font-bold text-slate-800 mb-6">สถานที่ที่แจ้งปัญหา (Locations)</h3>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={locationData} layout="vertical" barSize={16} margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
                          <XAxis type="number" tick={{ fontSize:10, fill:'#94a3b8', fontWeight:'bold' }} axisLine={false} tickLine={false}/>
                          <YAxis type="category" dataKey="name" width={130} tick={{ fontSize:11, fill:'#64748b', fontWeight:'bold' }} axisLine={false} tickLine={false}/>
                          <Tooltip contentStyle={customTooltipStyle} cursor={{fill: '#f8fafc'}}/>
                          <Bar dataKey="value" name="จำนวน (Tickets)" radius={[0,6,6,0]}>
                            {locationData.map((_,i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]}/>)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* SLA TAB */}
                {tab === 'sla' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-3 gap-5">
                      {[
                        { label:'SLA Overall',     value:`${kpi.slaRate}%`, sub:'เปอร์เซ็นต์การปิดเคสตามกำหนด', color: kpi.slaRate>=80 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200' },
                        { label:'Overdue Tickets', value: kpi.overdue,      sub:'เคสที่เกินกำหนดเวลาและยังเปิดอยู่', color: kpi.overdue > 0 ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-slate-700 bg-slate-50 border-slate-200' },
                        { label:'Critical Active', value: kpi.critical,     sub:'เคสระดับ Critical ที่กำลังดำเนินการ', color: kpi.critical > 0 ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-slate-700 bg-slate-50 border-slate-200' },
                      ].map((s, i) => (
                        <div key={i} className={`rounded-2xl border p-6 shadow-sm ${s.color}`}>
                          <p className="text-[11px] font-black uppercase tracking-widest opacity-80 mb-2">{s.label}</p>
                          <p className="text-5xl font-black my-2">{s.value}</p>
                          <p className="text-[10px] font-bold opacity-70 uppercase mt-2">{s.sub}</p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <Target className="w-5 h-5 text-indigo-500"/> SLA Performance ตามประเภทปัญหา
                        </h3>
                      </div>
                      {slaByType.length === 0 ? (
                        <div className="py-20 text-center">
                          <p className="text-slate-400 text-sm font-bold">ยังไม่มีข้อมูลการปิดเคสเพื่อคำนวณ SLA</p>
                        </div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-white">
                              <th className="text-left px-6 py-4">ประเภทปัญหา (Type)</th>
                              <th className="text-center py-4">เคสที่ปิดแล้ว (Closed)</th>
                              <th className="text-center py-4">ทันเวลา (On-time)</th>
                              <th className="text-center py-4">เวลาเฉลี่ย (Avg. Time)</th>
                              <th className="px-6 py-4 text-left">SLA Rate</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {slaByType.map((t,i) => (
                              <tr key={t.type} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-6 py-4 flex items-center gap-3 font-bold text-slate-700">
                                  <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: PALETTE[i % PALETTE.length] }}/>
                                  {t.type}
                                </td>
                                <td className="text-center font-black text-slate-800">{t.total}</td>
                                <td className="text-center font-black text-emerald-500">{t.onTime}</td>
                                <td className="text-center font-bold text-slate-500">{t.avgDays} <span className="text-[10px]">วัน</span></td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner max-w-[150px]">
                                      <div className={`h-full rounded-full ${slaBg(t.sla)}`} style={{ width:`${t.sla}%` }}/>
                                    </div>
                                    <span className={`text-[11px] font-black w-10 text-right ${slaColor(t.sla)}`}>{t.sla}%</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}