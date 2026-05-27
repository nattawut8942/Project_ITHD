import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { ticketAPI } from '../utils/apiClient';
import Sidebar from '../components/Sidebar';
import {
  LayoutDashboard, Clock, CheckCircle, Loader, AlertTriangle,
  Plus, Search, ChevronRight, MapPin, Ticket, User, Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const isITStaff = user?.cost_center === '7510';
  const navigate = useNavigate();

  const formatDateShort = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (isNaN(date.getTime())) return '';
    return `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}`;
  };

  const getDaysUntilDue = (targetDate) => {
    if (!targetDate) return null;
    const diff = new Date(targetDate) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await ticketAPI.getTickets();
        const tickets = res.data.data || res.data;
        setRequests(Array.isArray(tickets) ? tickets : []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const myTickets = useMemo(() =>
    requests.filter(r => r.empCode_created === user?.empcode),
    [requests, user]
  );

  const assignedTickets = useMemo(() =>
    isITStaff ? requests.filter(r => r.empCode_assigned === user?.empcode) : [],
    [requests, user, isITStaff]
  );

  const pendingQueue = useMemo(() =>
    isITStaff ? requests.filter(r => r.status === 'Pending') : [],
    [requests, isITStaff]
  );

  const myStats = {
    total: myTickets.length,
    pending: myTickets.filter(r => r.status === 'Pending').length,
    inProgress: myTickets.filter(r => r.status === 'In Progress').length,
    completed: myTickets.filter(r => r.status === 'Completed').length,
  };

  const itStats = {
    assigned: assignedTickets.length,
    inProgress: assignedTickets.filter(r => r.status === 'In Progress').length,
    completed: assignedTickets.filter(r => r.status === 'Completed').length,
    pendingQueue: pendingQueue.length,
  };

  const dueSoonTickets = useMemo(() => {
    const source = isITStaff ? requests : myTickets;
    return source
      .filter(r => r.status !== 'Completed' && r.status !== 'Rejected' && r.status !== 'Cancelled' && r.target_date)
      .map(r => ({ ...r, daysLeft: getDaysUntilDue(r.target_date) }))
      .filter(r => r.daysLeft <= 3)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 4);
  }, [requests, myTickets, isITStaff]);

  const recentActivity = useMemo(() => {
    const source = isITStaff ? requests : myTickets;
    return [...source]
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 6);
  }, [requests, myTickets, isITStaff]);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Completed': return 'text-emerald-700 bg-emerald-100/60 ring-emerald-600/20';
      case 'In Progress': return 'text-indigo-700 bg-indigo-100/60 ring-indigo-600/20';
      case 'Rejected': return 'text-rose-700 bg-rose-100/60 ring-rose-600/20';
      case 'Cancelled': return 'text-slate-600 bg-slate-100/60 ring-slate-500/20';
      case 'Pending': return 'text-amber-700 bg-amber-100/60 ring-amber-600/20 animate-pulse';
      default: return 'text-amber-700 bg-amber-100/60 ring-amber-600/20';
    }
  };

const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'Critical': return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'High': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'Medium': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'Normal': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const greetingTime = () => {
    const h = new Date().getHours();
    if (h < 12) return 'GOOD MORNING';
    if (h < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans flex overflow-hidden">
      
      {/* Sidebar */}
      <Sidebar user={user} isITStaff={isITStaff} logout={logout} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden p-4 pl-0">
        <div className="bg-white rounded-[2rem] flex flex-col h-full shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-200/60 relative">
          
          {/* Header */}
          <header className="px-8 py-6 border-b border-slate-100 bg-white/80 backdrop-blur-md flex justify-between items-center z-10 shrink-0">
            <div>
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{greetingTime()}</p>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                {user?.name?.split(' ')[0] || 'User'} 👋
              </h1>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                <Calendar className="w-3.5 h-3.5" />
                {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
              <p className="text-[11px] font-bold text-slate-400 mt-1.5">
                {!isITStaff && myStats.pending > 0 && <span className="text-amber-500">รอรับงาน: {myStats.pending} เคส</span>}
                {isITStaff && itStats.pendingQueue > 0 && <span className="text-amber-500">คิวงานใหม่: {itStats.pendingQueue} เคส</span>}
                {((!isITStaff && myStats.pending === 0) || (isITStaff && itStats.pendingQueue === 0)) && 'All caught up! 🎉'}
              </p>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30 custom-scrollbar">

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {!isITStaff ? (
                <>
                  {[
                    { label: 'Ticket ทั้งหมด', value: myStats.total, icon: <Ticket className="w-6 h-6 text-white"/>, bgIcon: 'bg-indigo-500', shadow: 'shadow-indigo-200' },
                    { label: 'รอดำเนินการ', value: myStats.pending, icon: <Clock className="w-6 h-6 text-white"/>, bgIcon: 'bg-amber-400', shadow: 'shadow-amber-200' },
                    { label: 'กำลังดำเนินการ', value: myStats.inProgress, icon: <Loader className="w-6 h-6 text-white"/>, bgIcon: 'bg-sky-500', shadow: 'shadow-sky-200' },
                    { label: 'เสร็จแล้ว', value: myStats.completed, icon: <CheckCircle className="w-6 h-6 text-white"/>, bgIcon: 'bg-emerald-500', shadow: 'shadow-emerald-200' },
                  ].map((s, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center justify-between shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                        <p className="text-3xl font-black text-slate-800 leading-none">{isLoading ? '—' : s.value}</p>
                      </div>
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${s.bgIcon} shadow-lg ${s.shadow}`}>
                        {s.icon}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {[
                    { label: 'รอรับเคส (Queue)', value: itStats.pendingQueue, icon: <Clock className="w-6 h-6 text-white"/>, bgIcon: 'bg-amber-400', shadow: 'shadow-amber-200' },
                    { label: 'เคสที่รับอยู่', value: itStats.assigned, icon: <Ticket className="w-6 h-6 text-white"/>, bgIcon: 'bg-indigo-500', shadow: 'shadow-indigo-200' },
                    { label: 'กำลังทำ', value: itStats.inProgress, icon: <Loader className="w-6 h-6 text-white"/>, bgIcon: 'bg-sky-500', shadow: 'shadow-sky-200' },
                    { label: 'ปิดสำเร็จ (ฉัน)', value: itStats.completed, icon: <CheckCircle className="w-6 h-6 text-white"/>, bgIcon: 'bg-emerald-500', shadow: 'shadow-emerald-200' },
                  ].map((s, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center justify-between shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                        <p className="text-3xl font-black text-slate-800 leading-none">{isLoading ? '—' : s.value}</p>
                      </div>
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${s.bgIcon} shadow-lg ${s.shadow}`}>
                        {s.icon}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
              
              {/* Left Column: Recent Tickets */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4 text-indigo-500" />
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                      {isITStaff ? 'System Recent Activity' : 'Your Recent Tickets'}
                    </h2>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-200">
                    {recentActivity.length} ITEMS
                  </span>
                </div>
                
                <div className="divide-y divide-slate-50 flex-1">
                  {isLoading ? (
                    <div className="p-16 text-center flex flex-col items-center gap-3 text-slate-400">
                      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm font-bold tracking-widest uppercase">Loading Tickets...</span>
                    </div>
                  ) : recentActivity.length === 0 ? (
                    <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-2">
                        <Ticket className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-slate-600 font-bold text-sm">ยังไม่มีรายการ Ticket</p>
                      {!isITStaff && (
                        <button onClick={() => navigate('/?view=all', { state: { openModal: true } })} className="mt-2 text-xs text-indigo-600 font-bold bg-indigo-50 px-4 py-2 rounded-lg flex items-center gap-1.5 hover:bg-indigo-100 transition-colors">
                          <Plus className="w-3.5 h-3.5"/> สร้าง Ticket แรกเลย
                        </button>
                      )}
                    </div>
                  ) : (
                    recentActivity.map(req => (
                      <div key={req.id} onClick={() => navigate('/?view=all')} className={`relative px-6 py-4 flex items-center gap-4 transition-colors cursor-pointer group ${
                        req.status === 'Pending' || !req.empCode_assigned
                          ? 'bg-orange-50 hover:bg-orange-100/50 border-l-4 border-orange-500'
                          : 'hover:bg-slate-50/80 border-l-4 border-transparent'
                      }`}>
                        
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border shrink-0 ${getPriorityStyle(req.priority)}`}>
                          {req.priority}
                        </span>
                        
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{req.project_name}</p>
                          <div className="text-[11px] font-bold text-slate-400 mt-1 flex items-center gap-2">
                            <span className="text-slate-500 uppercase flex items-center gap-2">
                              {req.req_id}
                              {(req.status === 'Pending' || !req.empCode_assigned) && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500 text-white shadow-sm animate-pulse">
                                  NEW
                                </span>
                              )}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-300"/>{req.location}</span>
                            {isITStaff && <><span>•</span><span className="text-indigo-500"><User className="w-3 h-3 inline mr-1"/>{req.requester_name.split(' ')[0]}</span></>}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ring-1 ring-inset ${getStatusStyle(req.status)}`}>
                            {req.status}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">{formatDateShort(req.target_date)}</span>
                        </div>

                        <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-indigo-50 transition-colors ml-2 shrink-0">
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-transform group-hover:translate-x-1"/>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Side Panels */}
              <div className="space-y-6">
                
                {/* Quick Actions */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Quick Actions</h3>
                  <div className="grid gap-3">
                    <button onClick={() => navigate('/?view=all', { state: { openModal: true } })} className="w-full flex items-center justify-between p-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/30 active:scale-95 group">
                      <span className="flex items-center gap-2"><Plus className="w-4 h-4"/> สร้าง Ticket ใหม่</span>
                      <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all"/>
                    </button>
                    <button onClick={() => navigate('/?view=all')} className="w-full flex items-center justify-between p-3.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 rounded-xl text-sm font-bold transition-colors group shadow-sm">
                      <span className="flex items-center gap-2"><Search className="w-4 h-4 text-slate-400"/> ค้นหา Ticket</span>
                      <ChevronRight className="w-4 h-4 opacity-30 group-hover:opacity-100 transition-all"/>
                    </button>
                  </div>
                </div>

                {/* Due Soon */}
                <div className={`rounded-2xl border p-6 shadow-sm transition-colors duration-300 ${dueSoonTickets.length > 0 ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-slate-100'}`}>
                  <h3 className={`text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${dueSoonTickets.length > 0 ? 'text-amber-800' : 'text-slate-400'}`}>
                    {dueSoonTickets.length > 0 ? <AlertTriangle className="w-4 h-4 text-amber-500"/> : <Clock className="w-4 h-4"/>} 
                    Due Soon / Overdue
                  </h3>
                  
                  {dueSoonTickets.length === 0 ? (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2 border border-slate-100"><CheckCircle className="w-5 h-5 text-emerald-400"/></div>
                      <p className="text-[11px] font-bold text-slate-400">ไม่มีเคสที่ใกล้หมดเวลา 🎉</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dueSoonTickets.map(r => (
                        <div key={r.id} onClick={() => navigate('/?view=all')} className="flex items-center justify-between p-3 bg-white rounded-xl border border-amber-100 shadow-sm hover:shadow-md cursor-pointer transition-shadow">
                          <div className="flex-1 min-w-0 pr-3">
                            <p className="text-xs font-bold text-slate-800 truncate">{r.project_name}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">{r.req_id}</p>
                          </div>
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg shrink-0 ${
                            r.daysLeft < 0 ? 'bg-rose-100 text-rose-700' :
                            r.daysLeft === 0 ? 'bg-rose-50 border border-rose-200 text-rose-600' :
                            r.daysLeft === 1 ? 'bg-orange-50 border border-orange-200 text-orange-600' :
                            'bg-amber-50 border border-amber-200 text-amber-700'
                          }`}>
                            {r.daysLeft < 0 ? 'เกินกำหนด' : r.daysLeft === 0 ? 'วันนี้' : `${r.daysLeft} วัน`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* IT Admin: Pending Queue */}
                {isITStaff && pendingQueue.length > 0 && (
                  <div className="bg-indigo-50/50 rounded-2xl border border-indigo-100 p-6 shadow-sm">
                    <h3 className="text-xs font-black text-indigo-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-500"/> เคสรอรับเข้าระบบ ({pendingQueue.length})
                    </h3>
                    <div className="space-y-2">
                      {pendingQueue.slice(0, 3).map(r => (
                        <div key={r.id} onClick={() => navigate('/?view=all')} className="flex items-center justify-between p-3 bg-white rounded-xl border border-indigo-50 hover:border-indigo-200 cursor-pointer transition-colors group shadow-sm">
                          <div className="flex-1 min-w-0 pr-3">
                            <p className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{r.project_name}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">{r.requester_name.split(' ')[0]}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-transform group-hover:translate-x-1 shrink-0"/>
                        </div>
                      ))}
                      {pendingQueue.length > 3 && (
                        <button onClick={() => navigate('/?view=all')} className="w-full py-2 mt-2 text-[10px] font-black text-indigo-600 bg-indigo-100/50 hover:bg-indigo-100 rounded-lg transition-colors">
                          ดูเคสที่เหลืออีก {pendingQueue.length - 3} รายการ
                        </button>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}