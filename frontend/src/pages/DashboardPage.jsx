import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { ticketAPI } from '../utils/apiClient';
import * as signalR from "@microsoft/signalr";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import Sidebar from '../components/Sidebar';
import MobileNavbar from '../components/MobileNavbar';
import { Clock, CheckCircle, AlertTriangle, Plus, ChevronRight, MapPin, User, Monitor, Wifi, Key, Package, ArrowUpRight, LoaderCircle, Inbox, PauseCircle, Wrench, Sun, Moon, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config/api';
import StatusBadge from '../components/StatusBadge';

const CHART_COLORS = ['#14213d', '#0f766e', '#e0a100', '#5b6779', '#2563eb', '#b42318'];

// Icon and soft tint for each status card, so each stage is recognised at a glance.
const STAGE_ICON = {
  itQueue: { Icon: Inbox, chip: 'bg-blue-50 text-blue-700' },
  itOnHold: { Icon: PauseCircle, chip: 'bg-orange-50 text-orange-700' },
  itInProgress: { Icon: Wrench, chip: 'bg-amber-50 text-amber-800' },
  itClosed: { Icon: CheckCircle, chip: 'bg-teal-50 text-teal-800' },
  userOpen: { Icon: Inbox, chip: 'bg-blue-50 text-blue-700' },
  userInProgress: { Icon: Wrench, chip: 'bg-amber-50 text-amber-800' },
  userClosed: { Icon: CheckCircle, chip: 'bg-teal-50 text-teal-800' },
};

// Colour for each stage of the pipeline.
const STAGE_COLOR = {
  ink: '#14213d',
  amber: '#e0a100',
  teal: '#0f766e',
  muted: '#9aa6b8',
  line: '#dde3ec',
};

// Counts up from 0 to the value once per change. Respects reduced-motion.
const CountUp = ({ value }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (typeof value !== 'number') return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setDisplay(value);
      return undefined;
    }
    let frame;
    const start = performance.now();
    const duration = 700;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(value * eased));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{display}</>;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink shadow-sm">
        <p className="mb-1 font-semibold">{label || payload[0].name}</p>
        <p>จำนวน <span className="font-bold">{payload[0].value}</span></p>
      </div>
    );
  }
  return null;
};

// A horizontal bar row: label, value, and a bar that grows in on load.
const BarRow = ({ label, value, max, color, index = 0 }) => {
  const pct = max ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <li className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate text-ink-soft">{label}</span>
        <span className="shrink-0 tabular-nums font-semibold text-ink">{value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-paper">
        <div
          className="h-full origin-left rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            animation: `grow-x 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${index * 90}ms both`,
          }}
        />
      </div>
    </li>
  );
};

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userTicketView, setUserTicketView] = useState('mine');
  const [dashboardFilter, setDashboardFilter] = useState('');
  const isITStaff = ['admin', 'it_staff'].includes(user?.role);
  const navigate = useNavigate();

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

    const hubUrl = API_BASE.replace('/api', '') + '/hubs/tickets';
    const token = localStorage.getItem('authToken');

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .build();

    connection.on('TicketsUpdated', () => {
      fetchData();
    });

    connection.start().catch(err => console.error('SignalR connect error:', err));

    return () => { connection.stop(); };
  }, []);

  const departmentTickets = useMemo(() =>
    requests.filter(r => r.cost_center === user?.cost_center),
    [requests, user]
  );

  const ownTickets = useMemo(() =>
    requests.filter(r => r.empCode_created === user?.empcode),
    [requests, user?.empcode]
  );

  const userScopeTickets = userTicketView === 'department' ? departmentTickets : ownTickets;

  const assignedTickets = useMemo(() =>
    isITStaff ? requests.filter(r => r.empCode_assigned === user?.empcode) : [],
    [requests, user, isITStaff]
  );

  const pendingQueue = useMemo(() =>
    isITStaff ? requests.filter(r => r.status === 'Open') : [],
    [requests, isITStaff]
  );

  const criticalUnassigned = useMemo(() => {
    if (!isITStaff) return [];
    return requests.filter(r =>
      ['Critical', 'High'].includes(r.priority) &&
      !r.empCode_assigned &&
      !['Closed', 'Rejected', 'Cancelled'].includes(r.status)
    ).sort((a, b) => {
      const priorityOrder = { Critical: 0, High: 1 };
      return priorityOrder[a.priority] - priorityOrder[b.priority] || new Date(a.created_at) - new Date(b.created_at);
    });
  }, [requests, isITStaff]);

  const myStats = {
    total: userScopeTickets.length,
    pending: userScopeTickets.filter(r => r.status === 'Open').length,
    inProgress: userScopeTickets.filter(r => r.status === 'In Progress').length,
    completed: userScopeTickets.filter(r => r.status === 'Closed').length,
  };

  const itStats = {
    assigned: assignedTickets.length,
    inProgress: assignedTickets.filter(r => r.status === 'In Progress').length,
    completed: assignedTickets.filter(r => r.status === 'Closed').length,
    pendingQueue: pendingQueue.length,
    onHold: assignedTickets.filter(r => r.status === 'On Hold').length,
  };

  const dashboardTicketGroups = useMemo(() => ({
    userTotal: userScopeTickets,
    userOpen: userScopeTickets.filter(r => r.status === 'Open'),
    userInProgress: userScopeTickets.filter(r => r.status === 'In Progress'),
    userClosed: userScopeTickets.filter(r => r.status === 'Closed'),
    itQueue: pendingQueue,
    itOnHold: assignedTickets.filter(r => r.status === 'On Hold'),
    itInProgress: assignedTickets.filter(r => r.status === 'In Progress'),
    itClosed: assignedTickets.filter(r => r.status === 'Closed'),
  }), [userScopeTickets, pendingQueue, assignedTickets]);

  const selectedDashboardTickets = dashboardFilter ? dashboardTicketGroups[dashboardFilter] || [] : [];

  const dueSoonTickets = useMemo(() => {
    const source = isITStaff ? requests : userScopeTickets;
    return source
      .filter(r => r.status !== 'Closed' && r.status !== 'Rejected' && r.status !== 'Cancelled' && r.target_date)
      .map(r => ({ ...r, daysLeft: getDaysUntilDue(r.target_date) }))
      .filter(r => r.daysLeft <= 3)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 4);
  }, [requests, userScopeTickets, isITStaff]);

  const agingTickets = useMemo(() => {
    if (!isITStaff) return [];
    const now = new Date();
    return requests
      .filter(r => r.status === 'In Progress' && r.accepted_at)
      .map(r => ({ ...r, hoursOpen: Math.floor((now - new Date(r.accepted_at)) / (1000 * 60 * 60)) }))
      .filter(r => r.hoursOpen >= 24)
      .sort((a, b) => b.hoursOpen - a.hoursOpen)
      .slice(0, 4);
  }, [requests, isITStaff]);

  const recentActivity = useMemo(() => {
    const source = isITStaff ? requests : userScopeTickets;
    return [...source]
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 6);
  }, [requests, userScopeTickets, isITStaff]);

  const problemTypeData = useMemo(() => {
    const source = isITStaff ? requests : userScopeTickets;
    const counts = {};
    source.forEach(r => {
      const type = r.request_type || 'Unknown';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [requests, userScopeTickets, isITStaff]);

  const deviceTypeData = useMemo(() => {
    const source = isITStaff ? requests : userScopeTickets;
    const counts = {};
    source.forEach(r => {
      const dt = r.device_type || 'Unknown';
      counts[dt] = (counts[dt] || 0) + (parseInt(r.device_count, 10) || 1);
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [requests, userScopeTickets, isITStaff]);

  const workloadData = useMemo(() => {
    if (!isITStaff) return [];
    const counts = {};
    requests.forEach(r => {
      if (r.status === 'In Progress' && r.empCode_assigned) {
        const name = r.assigned_name?.split(' ')[0] || r.empCode_assigned;
        counts[name] = (counts[name] || 0) + 1;
      }
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [requests, isITStaff]);

  const staffWorkloadDetails = useMemo(() => {
    if (!isITStaff) return [];
    const staff = new Map();
    const now = new Date();
    requests.filter(ticket =>
      ticket.empCode_assigned &&
      !['Closed', 'Rejected', 'Cancelled'].includes(ticket.status)
    ).forEach(ticket => {
      const code = ticket.empCode_assigned;
      if (!staff.has(code)) {
        staff.set(code, {
          code,
          name: ticket.assigned_name || code,
          active: 0,
          overdue: 0,
          aging: 0,
        });
      }
      const entry = staff.get(code);
      entry.active += 1;
      const due = ticket.target_date ? new Date(ticket.target_date) : null;
      if (due && !Number.isNaN(due.getTime())) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(ticket.target_date)) due.setHours(23, 59, 59, 999);
        if (due < now) entry.overdue += 1;
      }
      if (ticket.status === 'In Progress' && ticket.accepted_at) {
        const acceptedAt = new Date(ticket.accepted_at);
        if (!Number.isNaN(acceptedAt.getTime()) && now - acceptedAt >= 24 * 60 * 60 * 1000) entry.aging += 1;
      }
    });
    return Array.from(staff.values()).sort((a, b) =>
      b.overdue - a.overdue || b.active - a.active || a.name.localeCompare(b.name)
    );
  }, [requests, isITStaff]);

  const recentStockUsage = useMemo(() => {
    if (!isITStaff) return [];
    return requests.flatMap(ticket => {
      const items = Array.isArray(ticket.stockItems)
        ? ticket.stockItems
        : Array.isArray(ticket.stock_items) ? ticket.stock_items : [];
      return items.map(item => ({
        ticket,
        item,
        date: item.withdrawn_at || item.withdrawnAt || ticket.updated_at || ticket.created_at,
      }));
    }).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  }, [requests, isITStaff]);

  const performanceStats = useMemo(() => {
    if (!isITStaff) return null;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const closedTickets = requests.filter(r => {
      if (r.status !== 'Closed') return false;
      const closedAt = new Date(r.completed_at || r.updated_at);
      return !Number.isNaN(closedAt.getTime()) && closedAt >= cutoff;
    });

    const slaSamples = closedTickets.filter(r => r.target_date && (r.completed_at || r.updated_at));
    const onTimeCount = slaSamples.filter(r => {
      const completedAt = new Date(r.completed_at || r.updated_at);
      const targetAt = new Date(r.target_date);
      if (/^\d{4}-\d{2}-\d{2}$/.test(r.target_date)) targetAt.setHours(23, 59, 59, 999);
      return !Number.isNaN(targetAt.getTime()) && completedAt <= targetAt;
    }).length;

    const resolutionSamples = closedTickets.filter(r => r.accepted_at && r.completed_at)
      .map(r => (new Date(r.completed_at) - new Date(r.accepted_at)) / (1000 * 60 * 60))
      .filter(hours => Number.isFinite(hours) && hours >= 0);

    return {
      slaRate: slaSamples.length ? Math.round((onTimeCount / slaSamples.length) * 100) : null,
      avgTime: resolutionSamples.length
        ? Math.round(resolutionSamples.reduce((sum, hours) => sum + hours, 0) / resolutionSamples.length)
        : null
    };
  }, [requests, isITStaff]);

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'Critical': return 'วิกฤต';
      case 'High': return 'สูง';
      case 'Medium': return 'ปานกลาง';
      case 'Normal': return 'ปกติ';
      default: return priority || '-';
    }
  };

  const greetingTime = () => {
    const h = new Date().getHours();
    if (h < 12) return 'สวัสดีตอนเช้า';
    if (h < 17) return 'สวัสดีตอนบ่าย';
    return 'สวัสดีตอนเย็น';
  };

  // Pipeline stages. The total card is kept out of the pipeline.
  const stages = isITStaff
    ? [
      { key: 'itQueue', label: 'รอรับเรื่อง', desc: 'ยังไม่มีผู้รับ', value: itStats.pendingQueue, color: STAGE_COLOR.ink, inBar: true },
      { key: 'itOnHold', label: 'พักไว้', desc: 'งานของฉัน', value: itStats.onHold, color: STAGE_COLOR.amber, inBar: true },
      { key: 'itInProgress', label: 'กำลังทำ', desc: 'งานของฉัน', value: itStats.inProgress, color: STAGE_COLOR.teal, inBar: true },
      { key: 'itClosed', label: 'เสร็จแล้ว', desc: 'งานของฉัน', value: itStats.completed, color: STAGE_COLOR.muted, inBar: true },
    ]
    : [
      { key: 'userOpen', label: 'รอดำเนินการ', desc: 'รอ IT รับเรื่อง', value: myStats.pending, color: STAGE_COLOR.ink, inBar: true },
      { key: 'userInProgress', label: 'กำลังดำเนินการ', desc: 'IT กำลังทำ', value: myStats.inProgress, color: STAGE_COLOR.teal, inBar: true },
      { key: 'userClosed', label: 'ปิดแล้ว', desc: 'แก้ไขเรียบร้อย', value: myStats.completed, color: STAGE_COLOR.muted, inBar: true },
    ];

  const stageTotal = stages.reduce((sum, s) => sum + s.value, 0);
  const doneShare = stageTotal ? Math.round((stages[stages.length - 1].value / stageTotal) * 100) : 0;

  const dashboardFilterLabels = {
    userTotal: 'Ticket ทั้งหมดในมุมมองที่เลือก',
    userOpen: 'Ticket ที่รอดำเนินการ',
    userInProgress: 'Ticket ที่กำลังดำเนินการ',
    userClosed: 'Ticket ที่ปิดแล้ว',
    itQueue: 'คิว Ticket ใหม่',
    itOnHold: 'Ticket ที่พักไว้ในงานของฉัน',
    itInProgress: 'Ticket ที่กำลังดำเนินการในงานของฉัน',
    itClosed: 'Ticket ที่ปิดแล้วในงานของฉัน',
  };

  const openTicket = (id) => navigate('/?view=all', { state: { ticketId: id } });

  // One sentence that says what matters right now.
  const heroLine = isITStaff
    ? (criticalUnassigned.length > 0
      ? `มี ${criticalUnassigned.length} งานวิกฤตที่ยังไม่มีผู้รับ`
      : pendingQueue.length > 0
        ? `มี ${pendingQueue.length} รายการรอรับเรื่อง`
        : 'ทุกงานมีผู้ดูแลแล้ว')
    : (myStats.pending > 0
      ? `คุณมี ${myStats.pending} รายการรอดำเนินการ`
      : 'ไม่มีงานค้างของคุณ');

  const headerNote = isITStaff
    ? 'ภาพรวมงานที่รับอยู่และคิวของระบบ'
    : `ภาพรวม Ticket ของแผนก ${user?.cost_center || ''}`;

  const firstName = user?.name?.split(' ')[0] || 'ผู้ใช้';
  const dateText = new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const maxProblem = Math.max(1, ...problemTypeData.map(d => d.value));
  const maxDevice = Math.max(1, ...deviceTypeData.map(d => d.value));

  const card = 'rounded-lg border border-line bg-surface p-5';
  const cardTitle = 'text-base font-semibold text-ink';

  const listItems = dashboardFilter ? selectedDashboardTickets : recentActivity;
  const listTitle = dashboardFilter
    ? dashboardFilterLabels[dashboardFilter]
    : isITStaff
      ? 'ความเคลื่อนไหวล่าสุด'
      : userTicketView === 'department' ? 'Ticket ล่าสุดของแผนก' : 'Ticket ล่าสุดของคุณ';

  return (
    <div className="flex min-h-screen flex-col bg-paper font-body text-ink-soft md:flex-row">
      <MobileNavbar user={user} onMenuClick={() => setMobileOpen(true)} />
      <Sidebar user={user} isITStaff={isITStaff} logout={logout} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <main className="flex min-w-0 flex-1 flex-col p-0 md:h-screen md:overflow-hidden md:p-6">
        <div className="custom-scrollbar flex-1 overflow-y-auto">
          <div className="w-full space-y-6 px-4 py-6 md:px-2 md:py-2">

            {/* Header: title, one status line, user view switch */}
            <header className="dash-rise flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm text-muted">
                  {new Date().getHours() < 17
                    ? <Sun className="h-4 w-4 text-amber" aria-hidden="true" />
                    : <Moon className="h-4 w-4 text-ink-soft" aria-hidden="true" />}
                  {greetingTime()}, {firstName} · {dateText}
                </p>
                <h1 className="mt-1 font-display text-3xl font-semibold text-ink md:text-4xl">แดชบอร์ด</h1>
                <p className="mt-1 text-sm text-muted">{heroLine} · {headerNote}</p>
              </div>

              {!isITStaff && (
                <div role="group" aria-label="เลือกมุมมอง" className="inline-flex rounded-lg border border-line bg-surface p-1">
                  {[
                    { id: 'mine', label: 'ของฉัน', count: ownTickets.length },
                    { id: 'department', label: 'ทั้งแผนก', count: departmentTickets.length },
                  ].map(view => (
                    <button
                      key={view.id}
                      type="button"
                      onClick={() => { setUserTicketView(view.id); setDashboardFilter(''); }}
                      aria-pressed={userTicketView === view.id}
                      className={`min-h-[40px] rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${userTicketView === view.id ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}
                    >
                      {view.label} <span className="tabular-nums font-normal opacity-80">{view.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </header>

            {/* Status cards: click one to filter the list below */}
            <section aria-label="สรุปสถานะ" className="dash-rise grid grid-cols-2 gap-4 xl:grid-cols-4" style={{ animationDelay: '60ms' }}>
              {stages.map(stage => {
                const active = dashboardFilter === stage.key;
                const { Icon, chip } = STAGE_ICON[stage.key];
                return (
                  <button
                    key={stage.key}
                    type="button"
                    onClick={() => setDashboardFilter(current => current === stage.key ? '' : stage.key)}
                    aria-pressed={active}
                    className={`group chip-wiggle lift flex min-h-[140px] flex-col justify-between rounded-lg border bg-surface p-5 text-left shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${active ? 'border-ink ring-1 ring-ink' : 'border-line hover:border-ink-soft'}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2.5 text-sm font-medium text-ink-soft">
                        <span className={`chip-icon flex h-9 w-9 items-center justify-center rounded-lg ${chip}`} aria-hidden="true">
                          <Icon className="h-4.5 w-4.5" />
                        </span>
                        {stage.label}
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                    </span>
                    <span className="mt-4 font-display text-4xl font-semibold tabular-nums leading-none text-ink">
                      {isLoading ? '—' : <CountUp value={stage.value} />}
                    </span>
                    <span className="mt-3 text-xs text-muted">{stage.desc}</span>
                  </button>
                );
              })}
            </section>

            {/* Main: list on the left, what needs attention on the right */}
            <div className="dash-rise grid grid-cols-1 gap-6 xl:grid-cols-3" style={{ animationDelay: '120ms' }}>
              <section aria-labelledby="list-heading" className="min-w-0 overflow-hidden rounded-lg border border-line bg-surface xl:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
                  <h2 id="list-heading" className={cardTitle}>
                    {listTitle}
                    {dashboardFilter && <span className="ml-2 tabular-nums text-muted">({selectedDashboardTickets.length})</span>}
                  </h2>
                  <div className="flex items-center gap-1">
                    {dashboardFilter && (
                      <button type="button" onClick={() => setDashboardFilter('')} className="min-h-[40px] rounded-md px-3 text-sm font-semibold text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                        ล้างตัวกรอง
                      </button>
                    )}
                    <button type="button" onClick={() => navigate(`/?view=${!isITStaff && userTicketView === 'mine' ? 'mine' : 'all'}`)} className="min-h-[40px] rounded-md px-3 text-sm font-semibold text-ink hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                      ดูทั้งหมด
                    </button>
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex items-center gap-2 px-5 py-10 text-sm text-muted">
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                    กำลังโหลดข้อมูล
                  </div>
                ) : listItems.length === 0 ? (
                  <div className="flex flex-col items-center px-5 py-12 text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-paper text-teal">
                      <Sparkles className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <p className="mt-4 font-display text-lg font-semibold text-ink">
                      {dashboardFilter ? 'ยังไม่มีรายการในหมวดนี้' : isITStaff ? 'ยังไม่มีความเคลื่อนไหว' : 'ยังไม่มี Ticket ของคุณ'}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {dashboardFilter ? 'ลองเลือกหมวดอื่นดูนะ' : 'เมื่อมีการแจ้งปัญหา รายการจะขึ้นที่นี่'}
                    </p>
                    {!isITStaff && !dashboardFilter && (
                      <button type="button" onClick={() => navigate('/?view=all', { state: { openModal: true } })} className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-md bg-ink px-5 text-sm font-semibold text-white hover:bg-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                        <Plus className="h-4 w-4" aria-hidden="true" /> แจ้งปัญหาใหม่
                      </button>
                    )}
                  </div>
                ) : (
                  <ul className="max-h-[520px] divide-y divide-line overflow-y-auto">
                    {listItems.map(req => (
                      <li key={req.id}>
                        <button
                          type="button"
                          onClick={() => openTicket(req.id)}
                          className="group flex min-h-[64px] w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
                        >
                          <span
                            className="hidden h-9 w-1 shrink-0 rounded-full sm:block"
                            style={{ backgroundColor: req.priority === 'Critical' || req.priority === 'High' ? '#b42318' : '#dde3ec' }}
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 text-xs tabular-nums text-muted">
                              <span>{req.req_id}</span>
                              {req.status === 'Open' && <span className="rounded-full bg-rose-50 px-2 font-semibold text-rose-800">ใหม่</span>}
                            </span>
                            <span className="mt-0.5 block truncate text-sm font-semibold text-ink">{req.project_name || 'ไม่ระบุหัวข้อ'}</span>
                            <span className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
                              <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                              <span className="truncate">{req.location || '-'}</span>
                              <span aria-hidden="true">·</span>
                              <User className="h-3 w-3 shrink-0" aria-hidden="true" />
                              <span className="truncate">{req.requester_name?.split(' ')[0] || req.empCode_created || 'ไม่ทราบชื่อ'}</span>
                            </span>
                          </span>
                          <span className="flex shrink-0 flex-col items-end gap-1.5">
                            <StatusBadge status={req.status} />
                            <span className="text-xs text-muted">{getPriorityLabel(req.priority)}</span>
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <aside aria-label="ต้องดูก่อน" className="min-w-0 space-y-6">
                {isITStaff && criticalUnassigned.length > 0 && (
                  <section aria-labelledby="critical-heading" className={card}>
                    <h2 id="critical-heading" className="flex items-center gap-2 text-base font-semibold text-rose-800">
                      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                      วิกฤตหรือสูง ยังไม่มีผู้รับ
                      <span className="tabular-nums">({criticalUnassigned.length})</span>
                    </h2>
                    <ul className="mt-4 space-y-2">
                      {criticalUnassigned.slice(0, 3).map(r => (
                        <li key={r.id}>
                          <button type="button" onClick={() => openTicket(r.id)} className="group flex min-h-[44px] w-full items-center gap-3 rounded-md px-2 text-left hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-ink group-hover:underline">{r.project_name}</span>
                              <span className="block text-xs tabular-nums text-muted">{r.req_id}</span>
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    {criticalUnassigned.length > 3 && (
                      <button type="button" onClick={() => navigate('/?view=all')} className="mt-2 min-h-[44px] px-2 text-sm font-semibold text-ink hover:underline">
                        ดูอีก {criticalUnassigned.length - 3} รายการ
                      </button>
                    )}
                  </section>
                )}

                <section aria-labelledby="due-heading" className={card}>
                  <h2 id="due-heading" className="flex items-center gap-2 text-base font-semibold text-ink">
                    <Clock className="h-4 w-4 text-muted" aria-hidden="true" />
                    ใกล้ครบหรือเกินกำหนด
                  </h2>
                  {dueSoonTickets.length === 0 ? (
                    <p className="mt-4 flex items-center gap-2 text-sm text-muted">
                      <CheckCircle className="h-4 w-4 text-teal" aria-hidden="true" /> ทุกงานยังอยู่ในกำหนด ดีมาก
                    </p>
                  ) : (
                    <ul className="mt-4 space-y-2">
                      {dueSoonTickets.map(r => (
                        <li key={r.id}>
                          <button type="button" onClick={() => openTicket(r.id)} className="group flex min-h-[44px] w-full items-center gap-3 rounded-md px-2 text-left hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-ink group-hover:underline">{r.project_name}</span>
                              <span className="block text-xs tabular-nums text-muted">{r.req_id}</span>
                            </span>
                            <span className={`shrink-0 text-sm font-semibold tabular-nums ${r.daysLeft < 0 ? 'text-rose-800' : 'text-amber-800'}`}>
                              {r.daysLeft < 0 ? 'เกินแล้ว' : r.daysLeft === 0 ? 'วันนี้' : `${r.daysLeft} วัน`}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {isITStaff && agingTickets.length > 0 && (
                  <section aria-labelledby="aging-heading" className={card}>
                    <h2 id="aging-heading" className="flex items-center gap-2 text-base font-semibold text-ink">
                      <Clock className="h-4 w-4 text-muted" aria-hidden="true" />
                      ค้างเกิน 24 ชั่วโมง
                      <span className="tabular-nums">({agingTickets.length})</span>
                    </h2>
                    <ul className="mt-4 space-y-2">
                      {agingTickets.map(r => (
                        <li key={r.id}>
                          <button type="button" onClick={() => openTicket(r.id)} className="group flex min-h-[44px] w-full items-center gap-3 rounded-md px-2 text-left hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-ink group-hover:underline">{r.project_name}</span>
                              <span className="block text-xs tabular-nums text-muted">{r.req_id} · {r.assigned_name?.split(' ')[0] || r.empCode_assigned}</span>
                            </span>
                            <span className="shrink-0 text-sm font-semibold tabular-nums text-amber-800">
                              {r.hoursOpen >= 48 ? `${Math.floor(r.hoursOpen / 24)} วัน` : `${r.hoursOpen} ชม.`}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {isITStaff && (
                  <section aria-labelledby="perf-heading" className={card}>
                    <h2 id="perf-heading" className={cardTitle}>ผลงาน 30 วันที่ผ่านมา</h2>
                    <dl className="mt-4 grid grid-cols-2 gap-4">
                      <div className="rounded-lg bg-paper p-4">
                        <dt className="text-xs text-muted">ปิดงานตาม SLA</dt>
                        <dd className="mt-1 font-display text-3xl font-semibold tabular-nums text-ink">{performanceStats?.slaRate == null ? '—' : `${performanceStats.slaRate}%`}</dd>
                      </div>
                      <div className="rounded-lg bg-paper p-4">
                        <dt className="text-xs text-muted">เวลาเฉลี่ยปิดงาน</dt>
                        <dd className="mt-1 font-display text-3xl font-semibold tabular-nums text-ink">{performanceStats?.avgTime == null ? '—' : `${performanceStats.avgTime} ชม.`}</dd>
                      </div>
                    </dl>
                  </section>
                )}

                {isITStaff && pendingQueue.length > 0 && (
                  <section aria-labelledby="newq-heading" className={card}>
                    <h2 id="newq-heading" className={cardTitle}>
                      คิวใหม่ <span className="tabular-nums text-muted">({pendingQueue.length})</span>
                    </h2>
                    <ul className="mt-4 space-y-2">
                      {pendingQueue.slice(0, 3).map(r => (
                        <li key={r.id}>
                          <button type="button" onClick={() => openTicket(r.id)} className="group flex min-h-[44px] w-full items-center gap-3 rounded-md px-2 text-left hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-ink group-hover:underline">{r.project_name}</span>
                              <span className="block text-xs text-muted">{r.requester_name?.split(' ')[0] || r.empCode_created || 'ไม่ทราบชื่อ'}</span>
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    {pendingQueue.length > 3 && (
                      <button type="button" onClick={() => navigate('/?view=all')} className="mt-2 min-h-[44px] px-2 text-sm font-semibold text-ink hover:underline">
                        ดูอีก {pendingQueue.length - 3} รายการ
                      </button>
                    )}
                  </section>
                )}

                {!isITStaff && (
                  <section aria-labelledby="actions-heading" className={card}>
                    <h2 id="actions-heading" className={cardTitle}>แจ้งปัญหาใหม่</h2>
                    <ul className="mt-4 space-y-1">
                      {[
                        { label: 'คอมพิวเตอร์มีปัญหา', icon: Monitor },
                        { label: 'อินเทอร์เน็ตหรือเครือข่าย', icon: Wifi },
                        { label: 'รีเซ็ตรหัสผ่าน', icon: Key },
                        { label: 'เรื่องอื่น ๆ', icon: Plus },
                      ].map(item => {
                        const Icon = item.icon;
                        return (
                          <li key={item.label}>
                            <button
                              type="button"
                              onClick={() => navigate('/?view=all', { state: { openModal: true } })}
                              className="group flex min-h-[44px] w-full items-center gap-3 rounded-md px-2 text-left text-sm font-medium text-ink-soft transition-colors hover:bg-paper hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                            >
                              <Icon className="h-4 w-4 text-muted group-hover:text-ink" aria-hidden="true" />
                              <span className="flex-1">{item.label}</span>
                              <ArrowUpRight className="h-3.5 w-3.5 text-muted opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}
              </aside>
            </div>

            {/* Insight row */}
            <div className="dash-rise grid grid-cols-1 gap-6 lg:grid-cols-2" style={{ animationDelay: '180ms' }}>
              {isITStaff && (
                <section aria-labelledby="workload-heading" className={card}>
                  <h2 id="workload-heading" className={cardTitle}>กำลังทำอยู่ ตามเจ้าหน้าที่</h2>
                  {workloadData.length === 0 ? (
                    <p className="mt-4 text-sm text-muted">ตอนนี้ไม่มีงานที่กำลังทำ</p>
                  ) : (
                    <div className="mt-4 h-[220px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={workloadData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#dde3ec" />
                          <XAxis type="number" tick={{ fontSize: 12, fill: '#5b6779' }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#3d4a63' }} width={90} axisLine={false} tickLine={false} />
                          <RechartsTooltip cursor={{ fill: '#f5f7fa' }} content={<CustomTooltip />} />
                          <Bar dataKey="value" fill="#0f766e" radius={[0, 6, 6, 0]} barSize={14} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </section>
              )}

              <section aria-labelledby="problem-heading" className={card}>
                <h2 id="problem-heading" className={cardTitle}>
                  {isITStaff ? 'ปัญหาที่พบบ่อย 5 อันดับ' : 'ปัญหาที่พบบ่อยในแผนก'}
                </h2>
                {problemTypeData.length === 0 ? (
                  <p className="mt-4 text-sm text-muted">ยังไม่มีข้อมูล</p>
                ) : (
                  <ul className="mt-5 space-y-4">
                    {problemTypeData.map((item, idx) => (
                      <BarRow key={item.name} label={item.name} value={item.value} max={maxProblem} color={CHART_COLORS[idx % CHART_COLORS.length]} index={idx} />
                    ))}
                  </ul>
                )}
              </section>

              {isITStaff && (
                <section aria-labelledby="device-heading" className={`${card} lg:col-span-2`}>
                  <h2 id="device-heading" className={cardTitle}>ประเภทอุปกรณ์ที่แจ้งมา</h2>
                  {deviceTypeData.length === 0 ? (
                    <p className="mt-4 text-sm text-muted">ยังไม่มีข้อมูล</p>
                  ) : (
                    <ul className="mt-5 grid gap-x-10 gap-y-4 md:grid-cols-2">
                      {deviceTypeData.map((item, idx) => (
                        <BarRow key={item.name} label={item.name} value={item.value} max={maxDevice} color={CHART_COLORS[idx % CHART_COLORS.length]} index={idx} />
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </div>

            {/* IT staff tables */}
            {isITStaff && (
              <div className="dash-rise grid grid-cols-1 gap-6 lg:grid-cols-2" style={{ animationDelay: '240ms' }}>
                <section aria-labelledby="staff-heading" className={`${card} min-w-0`}>
                  <div className="flex items-baseline justify-between gap-4">
                    <h2 id="staff-heading" className={cardTitle}>งานค้างรายเจ้าหน้าที่</h2>
                    <p className="text-xs text-muted">เรียงตามจำนวนที่เกินกำหนด</p>
                  </div>
                  {staffWorkloadDetails.length === 0 ? (
                    <p className="mt-4 text-sm text-muted">ไม่มีงานที่ยังไม่ปิด</p>
                  ) : (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="text-xs text-muted">
                          <tr className="border-b border-line">
                            <th scope="col" className="py-3 pr-3 font-medium">เจ้าหน้าที่</th>
                            <th scope="col" className="px-3 py-3 text-right font-medium">งานค้าง</th>
                            <th scope="col" className="px-3 py-3 text-right font-medium">เกินกำหนด</th>
                            <th scope="col" className="py-3 pl-3 text-right font-medium">ค้างเกิน 24 ชม.</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {staffWorkloadDetails.map(staff => (
                            <tr key={staff.code}>
                              <td className="py-3 pr-3">
                                <span className="block font-semibold text-ink">{staff.name}</span>
                                <span className="text-xs tabular-nums text-muted">{staff.code}</span>
                              </td>
                              <td className="px-3 py-3 text-right tabular-nums text-ink">{staff.active}</td>
                              <td className={`px-3 py-3 text-right tabular-nums font-semibold ${staff.overdue ? 'text-rose-800' : 'text-muted'}`}>{staff.overdue}</td>
                              <td className={`py-3 pl-3 text-right tabular-nums font-semibold ${staff.aging ? 'text-amber-800' : 'text-muted'}`}>{staff.aging}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section aria-labelledby="stock-heading" className={`${card} min-w-0`}>
                  <div className="flex items-baseline justify-between gap-4">
                    <div>
                      <h2 id="stock-heading" className={cardTitle}>Stock ที่เบิกล่าสุด</h2>
                      <p className="mt-1 text-xs text-muted">อุปกรณ์ที่เบิกใช้กับ Ticket</p>
                    </div>
                    <button type="button" onClick={() => navigate('/report', { state: { tab: 'stock' } })} className="inline-flex min-h-[44px] items-center gap-1 px-2 text-sm font-semibold text-ink hover:underline">
                      ดูรายงาน <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                  {recentStockUsage.length === 0 ? (
                    <p className="mt-4 text-sm text-muted">ยังไม่มีประวัติการเบิก Stock</p>
                  ) : (
                    <ul className="mt-2 divide-y divide-line">
                      {recentStockUsage.map(({ ticket, item, date }, index) => (
                        <li key={`${ticket.id}-${item.id ?? index}`}>
                          <button type="button" onClick={() => openTicket(ticket.id)} className="flex min-h-[52px] w-full items-center justify-between gap-3 py-2 text-left hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-ink">{item.product_name || item.productName || 'อุปกรณ์'}</span>
                              <span className="block truncate text-xs text-muted">{ticket.req_id} · {ticket.requester_name || ticket.empCode_created || 'ไม่ระบุผู้แจ้ง'} · {date && !Number.isNaN(new Date(date).getTime()) ? new Date(date).toLocaleDateString('th-TH') : 'ไม่ระบุวันที่เบิก'}</span>
                            </span>
                            <span className="shrink-0 tabular-nums text-sm font-semibold text-ink">×{Number(item.qty) || 0}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
