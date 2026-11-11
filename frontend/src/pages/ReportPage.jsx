import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ticketAPI } from '../utils/apiClient';
import Sidebar from '../components/Sidebar';
import MobileNavbar from '../components/MobileNavbar';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import {
  Lock, TrendingUp, Users, Clock, CheckCircle, BarChart2,
  AlertTriangle, Target, Activity, Database, User, Package, Download, FileText,
  Inbox, Wrench, XCircle, Sparkles
} from 'lucide-react';
import { getStatusLabel, getPriorityLabel } from '../utils/styleHelpers';
import StatusBadge from '../components/StatusBadge';
import EmployeeAvatar from '../components/EmployeeAvatar';

// ✅ ปรับสีให้ตรงกับระบบ (Open=ฟ้า, In Progress=เหลือง, Closed=เขียว)
// อัตราปิดงาน = เคสที่ปิดแล้ว / เคสทั้งหมด โดยไม่นับเคสที่ถูกปฏิเสธ (ไม่ใช่งานที่ต้องปิด)
const closeRate = (completed, total, rejected = 0) => {
  const base = total - rejected;
  return base > 0 ? Math.round((completed / base) * 100) : 0;
};

const COLORS_STATUS = {
  Closed: '#0d9488',       // Teal (ปิดแล้ว)
  'In Progress': '#f59e0b',// Amber
  'On Hold': '#f97316',    // Orange
  Open: '#3b82f6',         // Blue
  Rejected: '#e11d48',     // Rose (ปฏิเสธ)
  Cancelled: '#94a3b8'     // Slate (ยกเลิก)
};

// Formal Palette (Suggestion: Muted, professional tones)
const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#8b5cf6', '#ef4444', '#64748b', '#0ea5e9'];

const fmtDays = (ms) => ms > 0 ? (ms / 86400000).toFixed(1) : '0';
const slaColor = (pct) => pct >= 90 ? 'text-emerald-600' : pct >= 70 ? 'text-amber-500' : 'text-rose-500';
const slaBg = (pct) => pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-400' : 'bg-rose-500';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white text-ink p-4 rounded-lg border border-slate-300 shadow-soft text-sm font-semibold">
        <p className="font-bold text-ink-soft mb-2">{label || payload[0].name}</p>
        {payload.map((p, idx) => (
          <p key={idx} className="flex items-center gap-2 mt-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: p.color || p.payload.fill || '#3b82f6' }}></span>
            <span>{p.name}: <span className="font-bold text-ink">{p.value}</span></span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function ReportPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState(location.state?.tab === 'stock' ? 'stock' : 'overview');
  const isITStaff = ['admin', 'it_staff'].includes(user?.role);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedStockMonth, setSelectedStockMonth] = useState('');

  const applyMonthFilter = monthKey => {
    if (!monthKey) return;
    const [year, month] = monthKey.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    setSelectedMonth(monthKey);
    setStartDate(`${monthKey}-01`);
    setEndDate(`${monthKey}-${String(lastDay).padStart(2, '0')}`);
    setSelectedStockMonth('');
  };

  const updateDateFilter = (setter, value) => {
    setSelectedMonth('');
    setSelectedStockMonth('');
    setter(value);
  };

  const filteredByDate = useMemo(() => {
    if (startDate && endDate && startDate > endDate) return [];
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59.999`) : null;
    return requests.filter(r => {
      // เคสที่ยกเลิกโดยผู้แจ้งไม่นับในรายงาน (ไม่ใช่งานที่ IT ต้องทำ จึงไม่ควรลดอัตราปิดงาน)
      if (r.status === 'Cancelled') return false;
      const d = new Date(r.created_at);
      if (Number.isNaN(d.getTime())) return false;
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }, [requests, startDate, endDate]);

  useEffect(() => {
    if (!isITStaff) { navigate('/'); return; }
    let isCurrentRequest = true;
    (async () => {
      setIsLoading(true);
      try {
        const res = await ticketAPI.getTickets({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
        const tickets = res.data.data || res.data;
        if (isCurrentRequest) setRequests(Array.isArray(tickets) ? tickets : []);
      } catch (e) { console.error(e); }
      finally { if (isCurrentRequest) setIsLoading(false); }
    })();
    return () => { isCurrentRequest = false; };
  }, [isITStaff, navigate, startDate, endDate]);

  // KPIs
  const kpi = useMemo(() => {
    if (!filteredByDate.length) return { total: 0, completed: 0, rate: 0, avgDays: '0', slaRate: 0, overdue: 0, critical: 0, pending: 0, inProgress: 0, rejected: 0, cancelled: 0 };
    const completed = filteredByDate.filter(r => r.status === 'Closed');
    const withTime = completed.filter(r => r.accepted_at && r.completed_at);
    const avgMs = withTime.length ? withTime.reduce((s, r) => s + (new Date(r.completed_at) - new Date(r.accepted_at)), 0) / withTime.length : 0;
    const onTime = completed.filter(r => r.target_date && r.completed_at && new Date(r.completed_at) <= new Date(r.target_date)).length;
    const overdue = filteredByDate.filter(r => !['Closed', 'Rejected', 'Cancelled'].includes(r.status) && r.target_date && new Date(r.target_date) < new Date()).length;
    return {
      total: filteredByDate.length,
      completed: completed.length,
      rejected: filteredByDate.filter(r => r.status === 'Rejected').length,
      cancelled: filteredByDate.filter(r => r.status === 'Cancelled').length,
      inProgress: filteredByDate.filter(r => r.status === 'In Progress').length,
      pending: filteredByDate.filter(r => r.status === 'Open').length,
      rate: closeRate(completed.length, filteredByDate.length, filteredByDate.filter(r => r.status === "Rejected").length),
      avgDays: fmtDays(avgMs),
      slaRate: completed.length ? Math.round((onTime / completed.length) * 100) : 0,
      overdue, critical: filteredByDate.filter(r => r.priority === 'Critical' && r.status !== 'Closed').length,
    };
  }, [filteredByDate]);

  const oldestOpenTickets = useMemo(() => {
    const now = new Date();
    return filteredByDate
      .filter(r => !['Closed', 'Rejected', 'Cancelled'].includes(r.status))
      .map(r => ({ ...r, ageDays: Math.floor((now - new Date(r.created_at)) / (1000 * 60 * 60 * 24)) }))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }, [filteredByDate]);

  const [oldestPage, setOldestPage] = useState(1);
  const OLDEST_PER_PAGE = 5;

  const oldestTotalPages = Math.ceil(oldestOpenTickets.length / OLDEST_PER_PAGE);
  const paginatedOldest = oldestOpenTickets.slice(
    (oldestPage - 1) * OLDEST_PER_PAGE,
    oldestPage * OLDEST_PER_PAGE
  );

  useEffect(() => { setOldestPage(1); }, [oldestOpenTickets]);

  const ageSeverity = (days) => {
    if (days >= 14) return { text: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' };
    if (days >= 7) return { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' };
    return { text: 'text-ink-soft', bg: 'bg-paper', border: 'border-line' };
  };

  const lastSixMonths = useMemo(() => {
    const out = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        month: d.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })
      });
    }
    return out;
  }, []);

  const lastTwelveMonths = useMemo(() => {
    const out = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        month: d.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })
      });
    }
    return out;
  }, []);

  // Data processing functions
  const monthlyData = useMemo(() => {
    const map = {};
    filteredByDate.forEach(r => {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
      if (!map[key]) map[key] = { key, month: label, total: 0, completed: 0 };
      map[key].total++;
      if (r.status === 'Closed') map[key].completed++;
    });
    if (selectedMonth) {
      const selected = map[selectedMonth];
      const [year, monthNumber] = selectedMonth.split('-').map(Number);
      return [{
        key: selectedMonth,
        month: new Date(year, monthNumber - 1, 1).toLocaleDateString('th-TH', { month: 'short', year: '2-digit' }),
        total: selected?.total || 0,
        completed: selected?.completed || 0,
      }];
    }
    return lastSixMonths.map(({ key, month }) => ({
      key,
      month,
      total: map[key]?.total || 0,
      completed: map[key]?.completed || 0,
    }));
  }, [filteredByDate, lastSixMonths, selectedMonth]);

  const statusData = useMemo(() => {
    const map = {};
    filteredByDate.forEach(r => { map[r.status] = (map[r.status] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredByDate]);

  const typeData = useMemo(() => {
    const map = {};
    filteredByDate.forEach(r => {
      const key = r.problem_type_name || r.request_type || 'Other';
      if (!map[key]) map[key] = { name: key, total: 0, completed: 0, rejected: 0 };
      if (r.status === 'Rejected') map[key].rejected++;
      map[key].total++;
      if (r.status === 'Closed') map[key].completed++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredByDate]);

  const subtypeData = useMemo(() => {
    const map = {};
    filteredByDate.forEach(r => { if (r.problem_subtype_name) map[r.problem_subtype_name] = (map[r.problem_subtype_name] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [filteredByDate]);

  const staffData = useMemo(() => {
    const map = {};

    filteredByDate.forEach(r => {
      if (!r.empCode_assigned) return;
      const key = r.empCode_assigned;
      if (!map[key]) map[key] = { empCode: key, name: r.assigned_name || r.empCode_assigned, total: 0, completed: 0, rejected: 0, totalMs: 0, count: 0, onTime: 0, asHelper: 0 };
      map[key].total++;
      if (r.status === 'Rejected') map[key].rejected++;
      if (r.status === 'Closed') {
        map[key].completed++;
        if (r.accepted_at && r.completed_at) {
          map[key].totalMs += new Date(r.completed_at) - new Date(r.accepted_at);
          map[key].count++;
        }
        if (r.target_date && r.completed_at && new Date(r.completed_at) <= new Date(r.target_date))
          map[key].onTime++;
      }
    });

    filteredByDate.forEach(r => {
      if (!r.helpers || !r.helpers.length) return;
      r.helpers.forEach(h => {
        const key = h.empCode;
        if (!map[key]) map[key] = { empCode: key, name: h.name || h.empCode, total: 0, completed: 0, totalMs: 0, count: 0, onTime: 0, asHelper: 0 };
        map[key].asHelper = (map[key].asHelper || 0) + 1;
      });
    });

    return Object.values(map).map(s => ({
      ...s,
      asHelper: s.asHelper || 0,
      avgDays: s.count ? fmtDays(s.totalMs / s.count) : '-',
      rate: closeRate(s.completed, s.total, s.rejected),
      sla: s.completed ? Math.round((s.onTime / s.completed) * 100) : 0,
    })).sort((a, b) => b.total - a.total);
  }, [filteredByDate]);


  const technicianMatrix = useMemo(() => {
    const matrix = {};
    const categories = new Set();
    filteredByDate.forEach(r => {
      if (!r.empCode_assigned) return;
      const tech = r.assigned_name || r.empCode_assigned;
      const cat = r.problem_type_name || r.request_type || 'Other';
      categories.add(cat);
      if (!matrix[tech]) matrix[tech] = {};
      matrix[tech][cat] = (matrix[tech][cat] || 0) + 1;
    });
    return {
      rows: Object.entries(matrix).sort((a, b) =>
        Object.values(b[1]).reduce((s, v) => s + v, 0) - Object.values(a[1]).reduce((s, v) => s + v, 0)
      ), categories: Array.from(categories)
    };
  }, [filteredByDate]);

  const topRequestersData = useMemo(() => {
    const map = {};
    filteredByDate.forEach(r => {
      if (!r.empCode_created) return;
      const key = r.empCode_created;
      if (!map[key]) map[key] = { empCode: key, name: r.requester_name || r.empCode_created, cc: r.cost_center, total: 0 };
      map[key].total++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [filteredByDate]);

  const activeRequestersData = useMemo(() => {
    const map = {};
    filteredByDate
      .filter(r => !['Closed', 'Rejected', 'Cancelled'].includes(r.status))
      .forEach(r => {
        if (!r.empCode_created) return;
        const key = r.empCode_created;
        if (!map[key]) map[key] = { empCode: key, name: r.requester_name || r.empCode_created, open: 0, inProgress: 0, hold: 0, total: 0 };
        map[key].total++;
        if (r.status === 'Open') map[key].open++;
        if (r.status === 'In Progress') map[key].inProgress++;
        if (r.status === 'On Hold') map[key].hold++;
      });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [filteredByDate]);

  const deptData = useMemo(() => {
    const map = {};
    filteredByDate.forEach(r => {
      const key = r.cost_center || 'N/A';
      if (!map[key]) map[key] = { cc: key, total: 0, completed: 0, rejected: 0, critical: 0 };
      if (r.status === 'Rejected') map[key].rejected++;
      map[key].total++;
      if (r.status === 'Closed') map[key].completed++;
      if (r.priority === 'Critical') map[key].critical++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [filteredByDate]);

  const locationData = useMemo(() => {
    const mainMap = {};
    const allSubs = new Set();

    filteredByDate.forEach(r => {
      const loc = r.location || 'N/A';
      let main = loc;
      let sub = 'ทั่วไป (General)';
      if (loc.includes('›')) {
        const parts = loc.split('›');
        main = parts[0].trim();
        sub = parts.slice(1).join('›').trim();
      }

      if (!mainMap[main]) mainMap[main] = { name: main, total: 0 };
      mainMap[main].total += 1;
      mainMap[main][sub] = (mainMap[main][sub] || 0) + 1;
    });

    const sortedData = Object.values(mainMap).sort((a, b) => b.total - a.total).slice(0, 8);

    sortedData.forEach(item => {
      Object.keys(item).forEach(k => {
        if (k !== 'name' && k !== 'total') allSubs.add(k);
      });
    });

    return { data: sortedData, subKeys: Array.from(allSubs) };
  }, [filteredByDate]);

  const slaByType = useMemo(() => {
    const map = {};
    filteredByDate.filter(r => r.status === 'Closed').forEach(r => {
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
    })).sort((a, b) => b.total - a.total);
  }, [filteredByDate]);

  const priorityData = useMemo(() =>
    ['Critical', 'High', 'Medium', 'Normal'].map(p => ({ name: p, value: filteredByDate.filter(r => r.priority === p).length }))
    , [filteredByDate]);

  const stockUsage = useMemo(() => {
    const products = new Map();
    const types = new Map();
    const monthly = new Map();
    const employees = new Map();
    const ticketsUsingStock = [];
    let totalQuantity = 0;
    let totalCost = 0;
    let hasPrices = false;

    filteredByDate.forEach(ticket => {
      const items = Array.isArray(ticket.stockItems)
        ? ticket.stockItems
        : Array.isArray(ticket.stock_items) ? ticket.stock_items : [];
      if (!items.length) return;

      const ticketKey = ticket.id ?? ticket.req_id;
      const ticketWithdrawals = [];
      let ticketCost = 0;
      let ticketHasCompletePrice = true;
      const typeName = ticket.problem_type_name || ticket.request_type || 'ไม่ระบุประเภท';
      const typeKey = String(ticket.problem_type_id ?? typeName);
      if (!types.has(typeKey)) {
        types.set(typeKey, {
          key: typeKey,
          name: typeName,
          quantity: 0,
          ticketIds: new Set(),
          cost: 0,
        });
      }
      const type = types.get(typeKey);
      if (ticketKey != null) type.ticketIds.add(String(ticketKey));

      items.forEach(item => {
        const productId = item.product_id ?? item.productId;
        const name = item.product_name || item.productName || (productId != null ? `สินค้า #${productId}` : 'ไม่ระบุชื่ออุปกรณ์');
        const key = String(productId ?? name);
        const parsedQuantity = Number(item.qty);
        const quantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 0;
        totalQuantity += quantity;
        type.quantity += quantity;

        if (!products.has(key)) {
          products.set(key, {
            key,
            name,
            deviceType: item.device_type || item.deviceType || '-',
            quantity: 0,
            ticketIds: new Set(),
            cost: 0,
            hasPrice: false,
          });
        }

        const product = products.get(key);
        product.quantity += quantity;
        if (ticketKey != null) product.ticketIds.add(String(ticketKey));

        const withdrawnBy = item.withdrawn_by_empcode || item.withdrawnByEmpcode || 'ไม่ระบุผู้เบิก';
        const withdrawnByName = item.withdrawn_by_name || item.withdrawnByName || withdrawnBy;
        if (!employees.has(withdrawnBy)) {
          employees.set(withdrawnBy, { empCode: withdrawnBy, name: withdrawnByName, quantity: 0, cost: 0, ticketIds: new Set() });
        }
        const employee = employees.get(withdrawnBy);
        if (employee.name === employee.empCode && withdrawnByName !== withdrawnBy) employee.name = withdrawnByName;
        employee.quantity += quantity;
        if (ticketKey != null) employee.ticketIds.add(String(ticketKey));

        const price = item.unit_price ?? item.unitPrice;
        let itemCost = null;
        if (price !== null && price !== undefined && price !== '') {
          const unitPrice = Number(price);
          if (Number.isFinite(unitPrice) && unitPrice >= 0) {
            itemCost = unitPrice * quantity;
            product.cost += itemCost;
            type.cost += itemCost;
            totalCost += itemCost;
            product.hasPrice = true;
            hasPrices = true;
            ticketCost += itemCost;
            employee.cost += itemCost;
          }
        }

        if (itemCost === null) ticketHasCompletePrice = false;

        const withdrawnAt = item.withdrawn_at || item.withdrawnAt;
        if (withdrawnAt && !Number.isNaN(new Date(withdrawnAt).getTime())) {
          const date = new Date(withdrawnAt);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!monthly.has(monthKey)) {
            monthly.set(monthKey, {
              key: monthKey,
              month: date.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' }),
              quantity: 0,
              cost: 0,
              ticketIds: new Set(),
            });
          }
          const month = monthly.get(monthKey);
          month.quantity += quantity;
          if (itemCost !== null) month.cost += itemCost;
          if (ticketKey != null) month.ticketIds.add(String(ticketKey));
        }

        ticketWithdrawals.push({
          key: item.id ?? `${key}-${ticketWithdrawals.length}`,
          name,
          quantity,
          withdrawnAt,
          withdrawnBy: withdrawnBy === 'ไม่ระบุผู้เบิก' ? '-' : withdrawnBy,
          withdrawnByName,
          unitPrice: itemCost === null ? null : Number(price),
          cost: itemCost,
        });
      });

      ticketsUsingStock.push({
        id: ticketKey,
        reqId: ticket.req_id || `#${ticket.id}`,
        projectName: ticket.project_name || '-',
        status: ticket.status,
        createdAt: ticket.created_at,
        typeName,
        cost: ticketCost,
        hasCompletePrice: ticketHasCompletePrice,
        withdrawals: ticketWithdrawals,
      });
    });

    const monthlyData = lastTwelveMonths.map(({ key, month }) => {
      const data = monthly.get(key);
      return {
        key,
        month,
        quantity: data?.quantity || 0,
        cost: data?.cost || 0,
        ticketCount: data?.ticketIds.size || 0,
      };
    });
    const previousSixMonthData = monthlyData.slice(0, 6);
    const currentSixMonthData = monthlyData.slice(6);
    const summarizeMonths = months => {
      const ticketIds = new Set();
      months.forEach(({ key }) => monthly.get(key)?.ticketIds.forEach(id => ticketIds.add(id)));
      return months.reduce((summary, item) => ({
        quantity: summary.quantity + item.quantity,
        cost: summary.cost + item.cost,
        ticketCount: ticketIds.size,
      }), { quantity: 0, cost: 0, ticketCount: 0 });
    };
    const allProducts = Array.from(products.values())
      .map(({ ticketIds, ...product }) => ({ ...product, ticketCount: ticketIds.size }))
      .sort((a, b) => b.quantity - a.quantity);

    return {
      ticketCount: ticketsUsingStock.length,
      totalQuantity,
      totalCost,
      hasPrices,
      productCount: products.size,
      products: allProducts.slice(0, 8),
      allProducts,
      monthly: monthlyData,
      comparison: {
        previous: summarizeMonths(previousSixMonthData),
        current: summarizeMonths(currentSixMonthData),
      },
      byType: Array.from(types.values())
        .map(({ ticketIds, ...type }) => ({ ...type, ticketCount: ticketIds.size }))
        .sort((a, b) => b.quantity - a.quantity),
      employees: Array.from(employees.values())
        .map(({ ticketIds, ...employee }) => ({ ...employee, ticketCount: ticketIds.size }))
        .sort((a, b) => b.quantity - a.quantity),
      tickets: ticketsUsingStock.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    };
  }, [filteredByDate, lastTwelveMonths]);

  const pricedStockTickets = stockUsage.tickets.filter(ticket => ticket.hasCompletePrice);
  const averageStockCostPerTicket = pricedStockTickets.length
    ? pricedStockTickets.reduce((sum, ticket) => sum + ticket.cost, 0) / pricedStockTickets.length
    : 0;
  const highestCostTickets = [...pricedStockTickets].sort((a, b) => b.cost - a.cost).slice(0, 5);
  const stockMonthlyForChart = stockUsage.monthly.slice(-6);
  const selectedStockMonthData = stockMonthlyForChart.find(month => month.key === selectedStockMonth);
  const selectedStockWithdrawals = useMemo(() => {
    if (!selectedStockMonth) return [];
    return stockUsage.tickets.flatMap(ticket => ticket.withdrawals
      .filter(item => item.withdrawnAt && !Number.isNaN(new Date(item.withdrawnAt).getTime()))
      .filter(item => {
        const date = new Date(item.withdrawnAt);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` === selectedStockMonth;
      })
      .map(item => ({ ...item, ticket })));
  }, [stockUsage.tickets, selectedStockMonth]);
  const selectedStockTicketCount = new Set(selectedStockWithdrawals.map(item => String(item.ticket.id))).size;
  const comparisonMetric = (current, previous) => {
    const difference = current - previous;
    const change = previous ? `${difference > 0 ? '+' : ''}${Math.round((difference / previous) * 100)}%` : difference > 0 ? 'รายการใหม่' : '0%';
    return {
      difference,
      change,
      color: difference > 0 ? 'text-rose-700' : difference < 0 ? 'text-emerald-700' : 'text-muted',
    };
  };

  const exportStockCsv = () => {
    const rows = [
      ['ประเภทรายการ', 'ช่วงเวลา', 'เลขเคส', 'โครงการ', 'สถานะ', 'ประเภทปัญหา', 'อุปกรณ์', 'ประเภทอุปกรณ์', 'ผู้เบิก', 'จำนวน', 'ราคาต่อหน่วย', 'มูลค่ารวม', 'จำนวนเคส'],
      ['ช่วงวันที่เคส', `${startDate || 'ไม่ระบุวันเริ่มต้น'} ถึง ${endDate || 'ไม่ระบุวันสิ้นสุด'}`],
      ['หมายเหตุ', 'มูลค่าคำนวณจากรายการที่มีข้อมูลราคา หากไม่มีราคาจะแสดงเป็นค่าว่าง'],
      ['สรุป', 'ช่วงวันที่เลือก', '', '', '', '', '', '', '', stockUsage.totalQuantity, '', stockUsage.hasPrices ? stockUsage.totalCost : '', stockUsage.ticketCount],
      ['เปรียบเทียบ', '6 เดือนก่อนหน้า', '', '', '', '', '', '', '', stockUsage.comparison.previous.quantity, '', stockUsage.hasPrices ? stockUsage.comparison.previous.cost : '', stockUsage.comparison.previous.ticketCount],
      ['เปรียบเทียบ', '6 เดือนล่าสุด', '', '', '', '', '', '', '', stockUsage.comparison.current.quantity, '', stockUsage.hasPrices ? stockUsage.comparison.current.cost : '', stockUsage.comparison.current.ticketCount],
      ...stockUsage.monthly.map(month => ['รายเดือน', month.month, '', '', '', '', '', '', '', month.quantity, '', stockUsage.hasPrices ? month.cost : '', month.ticketCount]),
      ...stockUsage.allProducts.map(product => ['อุปกรณ์', '', '', '', '', '', product.name, product.deviceType, '', product.quantity, '', product.hasPrice ? product.cost : '', product.ticketCount]),
      ...stockUsage.employees.map(employee => ['ผู้เบิก', '', '', '', '', '', '', '', `${employee.name} (${employee.empCode})`, employee.quantity, '', employee.cost, employee.ticketCount]),
      ...stockUsage.tickets.flatMap(ticket => ticket.withdrawals.map(item => [
        'รายการเบิก',
        item.withdrawnAt ? new Date(item.withdrawnAt).toLocaleDateString('th-TH') : '',
        ticket.reqId,
        ticket.projectName,
        ticket.status,
        ticket.typeName,
        item.name,
        '',
        `${item.withdrawnByName} (${item.withdrawnBy})`,
        item.quantity,
        item.unitPrice ?? '',
        item.cost ?? '',
        '',
      ])),
    ];
    const csvCell = value => {
      const text = String(value ?? '');
      const safeText = /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safeText.replaceAll('"', '""')}"`;
    };
    const csv = `\uFEFF${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportStockPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.alert('เปิดหน้าสำหรับส่งออก PDF ไม่สำเร็จ กรุณาอนุญาต Pop-up แล้วลองอีกครั้ง');
      return;
    }
    printWindow.opener = null;

    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char]));
    const formatCurrency = value => `฿${Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const productsTable = stockUsage.allProducts.map(product => `<tr><td>${escapeHtml(product.name)}</td><td>${escapeHtml(product.deviceType)}</td><td>${product.quantity}</td><td>${product.ticketCount}</td><td>${product.hasPrice ? formatCurrency(product.cost) : '-'}</td></tr>`).join('');
    const monthlyTable = stockUsage.monthly.map(month => `<tr><td>${escapeHtml(month.month)}</td><td>${month.quantity}</td><td>${month.ticketCount}</td><td>${stockUsage.hasPrices ? formatCurrency(month.cost) : '-'}</td></tr>`).join('');
    const employeeTable = stockUsage.employees.map(employee => `<tr><td>${escapeHtml(employee.name)}</td><td>${escapeHtml(employee.empCode)}</td><td>${employee.quantity}</td><td>${employee.ticketCount}</td><td>${stockUsage.hasPrices ? formatCurrency(employee.cost) : '-'}</td></tr>`).join('');
    const withdrawalRows = stockUsage.tickets.flatMap(ticket => ticket.withdrawals.map(item => `<tr><td>${escapeHtml(ticket.reqId)}</td><td>${escapeHtml(ticket.projectName)}</td><td>${escapeHtml(ticket.typeName)}</td><td>${escapeHtml(item.name)}</td><td>${item.quantity}</td><td>${escapeHtml(item.withdrawnAt ? new Date(item.withdrawnAt).toLocaleDateString('th-TH') : '-')}</td><td>${escapeHtml(item.withdrawnByName)} (${escapeHtml(item.withdrawnBy)})</td><td>${item.cost === null ? '-' : formatCurrency(item.cost)}</td></tr>`)).join('');
    const period = [startDate || 'ไม่ระบุวันเริ่มต้น', endDate || 'ไม่ระบุวันสิ้นสุด'].join(' ถึง ');
    const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>Stock Analytics Report</title><style>
      body{font-family:Arial,sans-serif;color:#1e293b;margin:28px;font-size:12px}h1{font-size:22px;margin:0 0 6px}h2{font-size:16px;margin:24px 0 8px}p{margin:4px 0 14px;color:#475569}.metrics{display:flex;gap:12px;margin:18px 0}.metric{flex:1;border:1px solid #cbd5e1;padding:12px}.metric strong{display:block;font-size:18px;margin-top:6px}table{width:100%;border-collapse:collapse;margin:8px 0 18px}th,td{border:1px solid #cbd5e1;padding:6px;text-align:left}th{background:#f1f5f9}td:nth-child(n+3){text-align:right}.note{font-size:10px;color:#64748b}@media print{body{margin:12mm}h2{break-after:avoid}tr{break-inside:avoid}table{break-inside:auto}}
      </style></head><body><h1>รายงานการใช้ Stock</h1><p>วันที่ออกรายงาน ${new Date().toLocaleDateString('th-TH')} · ช่วงวันที่เคส: ${escapeHtml(period)}</p>
      <div class="metrics"><div class="metric">เคสที่ใช้ Stock<strong>${stockUsage.ticketCount.toLocaleString('th-TH')}</strong></div><div class="metric">จำนวนอุปกรณ์<strong>${stockUsage.totalQuantity.toLocaleString('th-TH')}</strong></div><div class="metric">มูลค่ารวมโดยประมาณ<strong>${stockUsage.hasPrices ? formatCurrency(stockUsage.totalCost) : '-'}</strong></div></div>
      <h2>เปรียบเทียบการใช้ Stock: 6 เดือนก่อนหน้าและ 6 เดือนล่าสุด</h2><p class="note">คำนวณตามวันที่เบิกของรายการ stock ใน Ticket ตามช่วงวันที่ที่เลือก มูลค่ารวมเฉพาะรายการที่มีข้อมูลราคา</p><table><thead><tr><th>ช่วงเวลา</th><th>จำนวนอุปกรณ์</th><th>จำนวนเคส</th><th>มูลค่าโดยประมาณ</th></tr></thead><tbody><tr><td>6 เดือนก่อนหน้า</td><td>${stockUsage.comparison.previous.quantity}</td><td>${stockUsage.comparison.previous.ticketCount}</td><td>${stockUsage.hasPrices ? formatCurrency(stockUsage.comparison.previous.cost) : '-'}</td></tr><tr><td>6 เดือนล่าสุด</td><td>${stockUsage.comparison.current.quantity}</td><td>${stockUsage.comparison.current.ticketCount}</td><td>${stockUsage.hasPrices ? formatCurrency(stockUsage.comparison.current.cost) : '-'}</td></tr></tbody></table>
      <h2>แนวโน้มรายเดือน (12 เดือน)</h2><table><thead><tr><th>เดือน</th><th>จำนวนอุปกรณ์</th><th>จำนวนเคส</th><th>มูลค่าโดยประมาณ</th></tr></thead><tbody>${monthlyTable || '<tr><td colspan="4">ไม่มีข้อมูล</td></tr>'}</tbody></table>
      <h2>อุปกรณ์ที่ใช้</h2><table><thead><tr><th>อุปกรณ์</th><th>ประเภท</th><th>จำนวน</th><th>จำนวนเคส</th><th>มูลค่าโดยประมาณ</th></tr></thead><tbody>${productsTable || '<tr><td colspan="5">ไม่มีข้อมูล</td></tr>'}</tbody></table>
      <h2>สรุปตามผู้เบิก</h2><table><thead><tr><th>ชื่อ</th><th>รหัสพนักงาน</th><th>จำนวน</th><th>จำนวนเคส</th><th>มูลค่าโดยประมาณ</th></tr></thead><tbody>${employeeTable || '<tr><td colspan="5">ไม่มีข้อมูล</td></tr>'}</tbody></table>
      <h2>รายละเอียดรายการเบิกแยกตามเคส</h2><table><thead><tr><th>เคส</th><th>โครงการ</th><th>ประเภทปัญหา</th><th>อุปกรณ์</th><th>จำนวน</th><th>วันที่เบิก</th><th>ผู้เบิก</th><th>มูลค่า</th></tr></thead><tbody>${withdrawalRows || '<tr><td colspan="8">ไม่มีข้อมูล</td></tr>'}</tbody></table>
      <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));</script></body></html>`;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const STOCK_TICKETS_PER_PAGE = 10;
  const [stockPage, setStockPage] = useState(1);
  const stockTotalPages = Math.ceil(stockUsage.tickets.length / STOCK_TICKETS_PER_PAGE);
  const paginatedStockTickets = stockUsage.tickets.slice(
    (stockPage - 1) * STOCK_TICKETS_PER_PAGE,
    stockPage * STOCK_TICKETS_PER_PAGE
  );

  useEffect(() => { setStockPage(1); }, [stockUsage.tickets]);

  if (!isITStaff) return null;

  const tabs = [
    { id: 'overview', label: 'ภาพรวม' },
    { id: 'stock', label: 'การใช้ Stock' },
    { id: 'type', label: 'ประเภทปัญหา' },
    { id: 'staff', label: 'ทีมงาน' },
    { id: 'dept', label: 'แผนก / สถานที่' },
    { id: 'sla', label: 'SLA' },
  ];

  return (
    <div className="min-h-screen bg-paper text-ink font-sans flex flex-col md:flex-row overflow-hidden">

      {/* Mobile Navbar */}
      <MobileNavbar user={user} onMenuClick={() => setMobileOpen(true)} />

      {/* Sidebar */}
      <Sidebar user={user} isITStaff={isITStaff} logout={logout} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Content Area - Formal Sharp Borders */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden p-0 md:p-6">
        <div className="bg-white rounded-lg shadow-soft flex flex-col h-full overflow-hidden border border-line">

          {/* Header - Formal without gradients */}
          <header className="dash-rise px-6 py-5 border-b border-line bg-paper flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-ink text-white flex items-center justify-center shadow-soft">
                <BarChart2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-ink tracking-tight">รายงานและสถิติ</h1>
                <p className="text-xs font-bold text-muted mt-1">ภาพรวมการให้บริการ IT Help Desk</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 text-xs bg-paper text-muted border border-line px-4 py-2 rounded-lg font-bold shadow-soft">
                <Lock className="w-4 h-4" /> IT Admin Only
              </span>
            </div>
          </header>

          <div className="px-6 py-3 border-b border-line bg-white flex items-center gap-2 flex-wrap">
            <label htmlFor="report-month-filter" className="text-xs font-semibold text-ink-soft">เลือกเดือน</label>
            <input id="report-month-filter" type="month" value={selectedMonth} onChange={e => applyMonthFilter(e.target.value)}
              className="bg-surface border border-line rounded-lg px-3 py-1.5 text-xs font-medium text-ink-soft focus:outline-none focus:border-ink focus:ring-4 focus:ring-ink/10 shadow-soft" />
            <span className="text-xs text-muted">หรือเลือกช่วงวันที่สร้างเคส</span>
            <input aria-label="วันที่เริ่มต้น" type="date" value={startDate} max={endDate || undefined} onChange={e => updateDateFilter(setStartDate, e.target.value)}
              className="bg-surface border border-line rounded-lg px-3 py-1.5 text-xs font-medium text-ink-soft focus:outline-none focus:border-ink focus:ring-4 focus:ring-ink/10 shadow-soft" />
            <span className="text-xs text-muted">ถึง</span>
            <input aria-label="วันที่สิ้นสุด" type="date" value={endDate} min={startDate || undefined} onChange={e => updateDateFilter(setEndDate, e.target.value)}
              className="bg-surface border border-line rounded-lg px-3 py-1.5 text-xs font-medium text-ink-soft focus:outline-none focus:border-ink focus:ring-4 focus:ring-ink/10 shadow-soft" />
            {(startDate || endDate) && (
              <button onClick={() => { setStartDate(''); setEndDate(''); setSelectedMonth(''); setSelectedStockMonth(''); }}
                className="text-xs font-semibold text-rose-500 hover:text-rose-700 px-2">
                Reset
              </button>
            )}
            <p className="w-full text-[11px] text-muted">ตัวกรองวันที่มีผลกับข้อมูลทั้งหน้า โดยอิงวันที่สร้างเคส · คลิกเดือนบนกราฟ Stock เพื่อดูรายการตามวันที่เบิก</p>
          </div>
          {/* Tabs (Formal Square Style) */}
          <div className="px-6 py-4 bg-white border-b border-line flex gap-2 overflow-x-auto custom-scrollbar shrink-0">
            <div className="flex gap-1 rounded-full border border-line bg-paper p-1">
              {tabs.map((t, i) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition-all whitespace-nowrap ${tab === t.id
                    ? 'bg-ink text-white shadow-soft'
                    : 'text-ink-soft hover:bg-surface'
                    }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="dash-rise flex-1 overflow-y-auto p-4 sm:p-6 bg-paper text-ink custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-muted">
                <Activity className="w-10 h-10 animate-spin text-blue-500" />
                <span className="font-semibold tracking-widest text-sm">กำลังประมวลผลข้อมูล...</span>
              </div>
            ) : (
              <div className="w-full space-y-8">

                {/* OVERVIEW TAB */}
                {tab === 'overview' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* Main KPIs - Formal Style */}
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-6">
                      {[
                        { label: 'เคสทั้งหมด', value: kpi.total, Icon: BarChart2, chip: 'bg-indigo-50 text-indigo-600', filterVal: '' },
                        { label: 'อัตราปิดงาน', value: `${kpi.rate}%`, Icon: TrendingUp, chip: 'bg-teal-50 text-teal-700', filterVal: '' },
                        { label: 'เวลาแก้ไขเฉลี่ย', value: `${kpi.avgDays} วัน`, Icon: Clock, chip: 'bg-blue-50 text-blue-600', filterVal: '' },
                        { label: 'ปิดตามกำหนด', value: `${kpi.slaRate}%`, Icon: Target, chip: 'bg-amber-50 text-amber-600', filterVal: '' },
                      ].map((s, i) => (
                        <div key={i} className="lift chip-wiggle group flex min-h-[132px] flex-col justify-between rounded-lg border border-line bg-surface p-5 shadow-soft">
                          <span className={`chip-icon flex h-10 w-10 items-center justify-center rounded-lg ${s.chip}`}>
                            <s.Icon className="h-5 w-5" />
                          </span>
                          <div className="mt-4">
                            <p className="whitespace-nowrap font-display text-3xl font-bold leading-none text-slate-900">{s.value}</p>
                            <p className="mt-2 text-xs font-semibold text-slate-500">{s.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Status breakdown */}
                    <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
                      {[
                        { label: 'รอดำเนินการ', value: kpi.pending, Icon: Inbox, color: 'bg-blue-50 border-blue-200 text-blue-800' },
                        { label: 'กำลังทำ', value: kpi.inProgress, Icon: Wrench, color: 'bg-amber-50 border-amber-200 text-amber-800' },
                        { label: 'เสร็จแล้ว', value: kpi.completed, Icon: CheckCircle, color: 'bg-teal-50 border-teal-200 text-teal-800' },
                        { label: 'ปฏิเสธ', value: kpi.rejected, Icon: XCircle, color: 'bg-rose-50 border-rose-200 text-rose-800' },
                        { label: 'เกินกำหนด', value: kpi.overdue, Icon: AlertTriangle, color: kpi.overdue > 0 ? 'bg-red-50 border-red-200 text-red-800' : 'bg-paper border-line text-muted' },
                      ].map((s, i) => (
                        <div key={i} className={`lift rounded-lg border p-4 shadow-soft ${s.color}`}>
                          <div className="flex items-center gap-2 text-xs font-semibold">
                            <s.Icon className="h-4 w-4" />
                            <span>{s.label}</span>
                          </div>
                          <p className="mt-2 font-display text-3xl font-bold">{s.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                      {/* Trend Chart */}
                      <div className="col-span-1 lg:col-span-2 bg-white rounded-lg border border-line shadow-soft p-6">
                        <h3 className="text-base font-bold text-ink mb-6 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-muted" /> แนวโน้มเคสรายเดือน
                        </h3>
                        <p className="text-xs text-muted -mt-4 mb-2">คลิกจุดหรือพื้นที่ของเดือน เพื่อกรองรายงานทั้งหน้าตามวันที่สร้างเคส</p>
                        <ResponsiveContainer width="100%" height={280}>
                          <AreaChart
                            data={monthlyData}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            onClick={state => {
                              const monthKey = state?.activePayload?.[0]?.payload?.key;
                              if (monthKey) applyMonthFilter(monthKey);
                            }}
                          >
                            <defs>
                              <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3} /><stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="gDone" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b', fontWeight: '600' }} axisLine={false} tickLine={false} dy={10} />
                            <YAxis tick={{ fontSize: 12, fill: '#64748b', fontWeight: '600' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="total" name="เคสทั้งหมด" stroke="#94a3b8" fill="url(#gTotal)" strokeWidth={2} activeDot={{ r: 6, cursor: 'pointer', onClick: (event, point) => applyMonthFilter(point?.payload?.key) }} />
                            <Area type="monotone" dataKey="completed" name="เสร็จแล้ว" stroke="#3b82f6" fill="url(#gDone)" strokeWidth={2} activeDot={{ r: 6, cursor: 'pointer', onClick: (event, point) => applyMonthFilter(point?.payload?.key) }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Status Pie Chart */}
                      <div className="bg-white rounded-lg border border-line shadow-soft p-6 flex flex-col">
                        <h3 className="text-base font-bold text-ink mb-2 flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-muted" /> สัดส่วนสถานะ
                        </h3>
                        <div className="flex-1 flex items-center justify-center">
                          <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                              <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={2}>
                                {statusData.map((e, i) => <Cell key={i} fill={COLORS_STATUS[e.name] || '#94a3b8'} stroke="none" />)}
                              </Pie>
                              {/* ✅ ใช้ getStatusLabel เพื่อแสดง Emoji ใน Legend ด้วย */}
                              <Legend iconType="square" iconSize={10} formatter={v => <span className="text-xs font-semibold text-ink-soft ml-1.5">{getStatusLabel(v)}</span>} />
                              <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* แยกตามความเร่งด่วน */}
                    <div className="bg-white rounded-lg border border-line shadow-soft p-6">
                      <h3 className="text-base font-bold text-ink mb-6">แยกตามความเร่งด่วน</h3>
                      <div className="grid grid-cols-2 xl:grid-cols-4 gap-6">
                        {priorityData.map(p => {
                          const cfg = {
                            Critical: { color: 'bg-rose-500', light: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
                            High: { color: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
                            Medium: { color: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
                            Normal: { color: 'bg-slate-400', light: 'bg-paper', text: 'text-ink-soft', border: 'border-line' }
                          }[p.name] || {};
                          const pct = kpi.total ? Math.round((p.value / kpi.total) * 100) : 0;
                          return (
                            <div key={p.name} className={`rounded-lg border ${cfg.border} ${cfg.light} p-5 shadow-soft`}>
                              <p className={`text-xs font-bold mb-3 ${cfg.text}`}>{getPriorityLabel(p.name)}</p>
                              <p className="text-4xl font-bold text-ink">{p.value}</p>
                              <div className="mt-4 h-2 bg-white rounded-lg overflow-hidden shadow-inner border border-line/50">
                                <div className={`h-full ${cfg.color}`} style={{ width: `${pct}%` }} />
                              </div>
                              <p className="text-xs font-semibold text-muted mt-2">{pct}% ของเคสทั้งหมด</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                )}

                {tab === 'stock' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white rounded-lg border border-line shadow-soft overflow-hidden">
                      <div className="px-6 py-5 border-b border-line bg-paper flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <h3 className="text-base font-bold text-ink flex items-center gap-2">
                            <Package className="w-5 h-5 text-muted" /> สรุปการใช้ Stock แก้ไขปัญหา
                          </h3>
                          <p className="text-xs text-muted mt-1">สรุปอุปกรณ์ที่เบิกใช้กับ ticket ในช่วงวันที่เลือก</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={exportStockCsv} className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">
                            <Download className="w-4 h-4" /> ส่งออก CSV
                          </button>
                          <button type="button" onClick={exportStockPdf} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                            <FileText className="w-4 h-4" /> ส่งออก PDF
                          </button>
                        </div>
                      </div>
                      <div className="p-6 space-y-6">
                        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                          {[
                            { label: 'เคสที่ใช้ Stock', value: stockUsage.ticketCount.toLocaleString('th-TH'), color: 'text-blue-700 bg-blue-50 border-blue-200' },
                            { label: 'จำนวนอุปกรณ์ที่ใช้', value: stockUsage.totalQuantity.toLocaleString('th-TH'), color: 'text-violet-700 bg-violet-50 border-violet-200' },
                            { label: 'ชนิดอุปกรณ์', value: stockUsage.productCount.toLocaleString('th-TH'), color: 'text-amber-700 bg-amber-50 border-amber-200' },
                            { label: 'มูลค่ารวมโดยประมาณ', value: stockUsage.hasPrices ? `฿${stockUsage.totalCost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                          ].map(metric => (
                            <div key={metric.label} className={`rounded-lg border p-4 ${metric.color}`}>
                              <p className="text-xs font-semibold">{metric.label}</p>
                              <p className="text-2xl font-bold mt-2">{metric.value}</p>
                            </div>
                          ))}
                        </div>

                        <section className="rounded-lg border border-line p-5">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                            <div>
                              <h4 className="text-sm font-bold text-ink">เปรียบเทียบการใช้ Stock</h4>
                              <p className="text-xs text-muted mt-1">6 เดือนล่าสุด เทียบกับ 6 เดือนก่อนหน้า ตามวันที่เบิก</p>
                            </div>
                            <span className="text-xs text-muted">
                              {stockUsage.monthly[0]?.month} – {stockUsage.monthly[5]?.month} ก่อนหน้า · {stockUsage.monthly[6]?.month} – {stockUsage.monthly[11]?.month} ล่าสุด
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                              { label: 'จำนวนอุปกรณ์', key: 'quantity', format: value => value.toLocaleString('th-TH') },
                              { label: 'มูลค่าโดยประมาณ', key: 'cost', format: value => `฿${value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, available: stockUsage.hasPrices },
                              { label: 'จำนวนเคส', key: 'ticketCount', format: value => value.toLocaleString('th-TH') },
                            ].map(metric => {
                              const previous = stockUsage.comparison.previous[metric.key];
                              const current = stockUsage.comparison.current[metric.key];
                              const change = comparisonMetric(current, previous);
                              const sign = change.difference > 0 ? '+' : change.difference < 0 ? '-' : '';
                              return (
                                <div key={metric.key} className="rounded-lg border border-line bg-paper p-4">
                                  <p className="text-xs font-semibold text-muted">{metric.label}</p>
                                  <div className="mt-3 flex items-end justify-between gap-3">
                                    <div>
                                      <p className="text-xs text-muted">6 เดือนก่อนหน้า</p>
                                      <p className="font-semibold text-ink-soft">{metric.available === false ? '-' : metric.format(previous)}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-xs text-muted">6 เดือนล่าสุด</p>
                                      <p className="font-bold text-ink">{metric.available === false ? '-' : metric.format(current)}</p>
                                    </div>
                                  </div>
                                  <p className={`mt-3 text-sm font-bold ${change.color}`}>
                                    {metric.available === false ? '-' : `${sign}${metric.format(Math.abs(change.difference))} (${change.change})`}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </section>

                        {stockUsage.products.length === 0 ? (
                          <p className="text-center text-sm text-muted py-8">ยังไม่มีข้อมูลการเบิกใช้ Stock ในช่วงวันที่เลือก</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                              <thead className="bg-white text-xs text-muted border-b border-line">
                                <tr>
                                  <th className="px-4 py-3">อุปกรณ์</th>
                                  <th className="px-4 py-3">ประเภท</th>
                                  <th className="px-4 py-3 text-right">จำนวนที่ใช้</th>
                                  <th className="px-4 py-3 text-right">จำนวนเคส</th>
                                  <th className="px-4 py-3 text-right">มูลค่าโดยประมาณ</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {stockUsage.products.map(product => (
                                  <tr key={product.key} className="hover:bg-paper">
                                    <td className="px-4 py-3 font-semibold text-ink-soft">{product.name}</td>
                                    <td className="px-4 py-3 text-muted">{product.deviceType}</td>
                                    <td className="px-4 py-3 text-right font-semibold text-ink-soft">{product.quantity.toLocaleString('th-TH')}</td>
                                    <td className="px-4 py-3 text-right text-ink-soft">{product.ticketCount.toLocaleString('th-TH')}</td>
                                    <td className="px-4 py-3 text-right text-ink-soft">
                                      {product.hasPrice ? `฿${product.cost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {stockUsage.productCount > stockUsage.products.length && (
                              <p className="text-xs text-muted text-center mt-3">แสดง 8 รายการที่ใช้มากที่สุด จากทั้งหมด {stockUsage.productCount} ชนิด</p>
                            )}
                            {!stockUsage.hasPrices && (
                              <p className="text-xs text-muted mt-3">ไม่มีข้อมูลราคา stock สำหรับคำนวณมูลค่า</p>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                          <section className="rounded-lg border border-line p-5">
                            <h4 className="text-sm font-bold text-ink mb-1">แนวโน้มการเบิกรายเดือน</h4>
                            <p className="text-xs text-muted mb-3">คลิกแท่งเดือนเพื่อดูรายการเบิกในเดือนนั้น</p>
                            {!stockMonthlyForChart.some(month => month.quantity > 0) ? (
                              <p className="text-center text-sm text-muted py-10">ไม่มีวันที่เบิกสำหรับแสดงแนวโน้ม</p>
                            ) : (
                              <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={stockMonthlyForChart} margin={{ top: 5, right: 12, left: -18, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                                  <Tooltip content={<CustomTooltip />} />
                                  <Bar
                                    dataKey="quantity"
                                    name="จำนวนชิ้นที่เบิก"
                                    fill="#6366f1"
                                    radius={[3, 3, 0, 0]}
                                    cursor="pointer"
                                    onClick={entry => {
                                      const monthKey = entry?.key ?? entry?.payload?.key;
                                      if (monthKey) setSelectedStockMonth(monthKey);
                                    }}
                                  />
                                </BarChart>
                              </ResponsiveContainer>
                            )}
                          </section>

                          <section className="rounded-lg border border-line p-5">
                            <h4 className="text-sm font-bold text-ink mb-1">มูลค่าการเบิกรายเดือน</h4>
                            <p className="text-xs text-muted mb-3">คลิกแท่งเดือนเพื่อดูรายการเบิกในเดือนนั้น</p>
                            <p className="text-xs text-muted -mt-2 mb-2">คำนวณจากรายการที่มีข้อมูลราคา</p>
                            {!stockMonthlyForChart.some(month => month.cost > 0) ? (
                              <p className="text-center text-sm text-muted py-10">ไม่มีวันที่เบิกสำหรับแสดงแนวโน้ม</p>
                            ) : (
                              <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={stockMonthlyForChart} margin={{ top: 5, right: 12, left: 4, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                                  <Tooltip formatter={value => `฿${Number(value).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                                  <Bar
                                    dataKey="cost"
                                    name="มูลค่าโดยประมาณ"
                                    fill="#10b981"
                                    radius={[3, 3, 0, 0]}
                                    cursor="pointer"
                                    onClick={entry => {
                                      const monthKey = entry?.key ?? entry?.payload?.key;
                                      if (monthKey) setSelectedStockMonth(monthKey);
                                    }}
                                  />
                                </BarChart>
                              </ResponsiveContainer>
                            )}
                          </section>
                        </div>

                        {selectedStockMonth && (
                          <section className="rounded-lg border border-indigo-200 bg-indigo-50/40 overflow-hidden">
                            <div className="px-5 py-4 border-b border-indigo-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div>
                                <h4 className="text-sm font-bold text-ink">
                                  รายการเบิกประจำเดือน {selectedStockMonthData?.month || selectedStockMonth}
                                </h4>
                                <p className="text-xs text-muted mt-1">
                                  {selectedStockTicketCount.toLocaleString('th-TH')} เคส · {selectedStockWithdrawals.reduce((sum, item) => sum + item.quantity, 0).toLocaleString('th-TH')} ชิ้น
                                  {stockUsage.hasPrices && ` · ฿${selectedStockWithdrawals.reduce((sum, item) => sum + (item.cost || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                </p>
                              </div>
                              <button type="button" onClick={() => setSelectedStockMonth('')} className="self-start rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-paper">
                                ล้างการเลือกเดือน
                              </button>
                            </div>
                            {selectedStockWithdrawals.length === 0 ? (
                              <p className="px-5 py-8 text-center text-sm text-muted">ไม่พบรายการเบิกในเดือนนี้</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                  <thead className="bg-white text-xs text-muted border-b border-line">
                                    <tr>
                                      <th className="px-4 py-3">เคส</th>
                                      <th className="px-4 py-3">อุปกรณ์</th>
                                      <th className="px-4 py-3">วันที่เบิก</th>
                                      <th className="px-4 py-3">ผู้เบิก</th>
                                      <th className="px-4 py-3 text-right">จำนวน</th>
                                      <th className="px-4 py-3 text-right">มูลค่า</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 bg-white">
                                    {selectedStockWithdrawals.map(({ ticket, ...item }) => (
                                      <tr key={`${ticket.id}-${item.key}`} className="hover:bg-paper">
                                        <td className="px-4 py-3">
                                          <button type="button" onClick={() => navigate('/?view=all', { state: { ticketId: ticket.id } })} className="font-mono font-semibold text-blue-700 hover:underline">
                                            {ticket.reqId}
                                          </button>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-ink-soft">{item.name}</td>
                                        <td className="px-4 py-3 text-ink-soft">
                                          {item.withdrawnAt ? new Date(item.withdrawnAt).toLocaleDateString('th-TH') : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-ink-soft">{item.withdrawnByName} ({item.withdrawnBy})</td>
                                        <td className="px-4 py-3 text-right">{item.quantity.toLocaleString('th-TH')}</td>
                                        <td className="px-4 py-3 text-right">
                                          {item.cost === null ? '-' : `฿${item.cost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </section>
                        )}

                        <section className="rounded-lg border border-line p-5">
                          <h4 className="text-sm font-bold text-ink mb-4">การใช้ Stock แยกตามประเภทปัญหา</h4>
                          <p className="text-xs text-muted -mt-2 mb-3">มูลค่าเป็นยอดประมาณจากรายการที่มีข้อมูลราคา</p>
                          {stockUsage.byType.length === 0 ? (
                            <p className="text-center text-sm text-muted py-8">ยังไม่มีข้อมูลการใช้ Stock</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm text-left">
                                <thead className="bg-paper text-xs text-muted border-b border-line">
                                  <tr>
                                    <th className="px-4 py-3">ประเภทปัญหา</th>
                                    <th className="px-4 py-3 text-right">จำนวนชิ้น</th>
                                    <th className="px-4 py-3 text-right">จำนวนเคส</th>
                                    <th className="px-4 py-3 text-right">มูลค่าโดยประมาณ</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {stockUsage.byType.map(type => (
                                    <tr key={type.key}>
                                      <td className="px-4 py-3 font-medium text-ink-soft">{type.name}</td>
                                      <td className="px-4 py-3 text-right">{type.quantity.toLocaleString('th-TH')}</td>
                                      <td className="px-4 py-3 text-right">{type.ticketCount.toLocaleString('th-TH')}</td>
                                      <td className="px-4 py-3 text-right">฿{type.cost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </section>

                        <section className="rounded-lg border border-line p-5 space-y-4">
                          <div>
                            <h4 className="text-sm font-bold text-ink">ค่าใช้จ่ายต่อเคส</h4>
                            <p className="text-xs text-muted mt-1">คำนวณจากเคสที่มีราคาครบทุกอุปกรณ์</p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                              <p className="text-xs font-semibold text-blue-700">ค่าใช้จ่ายเฉลี่ยต่อเคส</p>
                              <p className="text-2xl font-bold text-blue-800 mt-2">
                                {pricedStockTickets.length
                                  ? `฿${averageStockCostPerTicket.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                  : '-'}
                              </p>
                              <p className="text-xs text-blue-600 mt-1">{pricedStockTickets.length} เคสที่มีราคาครบ</p>
                            </div>
                            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
                              <p className="text-xs font-semibold text-rose-700">เคสที่มีค่าใช้จ่ายสูงสุด</p>
                              {highestCostTickets.length ? (
                                <>
                                  <p className="text-2xl font-bold text-rose-800 mt-2">
                                    ฿{highestCostTickets[0].cost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => navigate('/?view=all', { state: { ticketId: highestCostTickets[0].id } })}
                                    className="text-xs text-rose-700 hover:underline font-mono mt-1"
                                  >
                                    {highestCostTickets[0].reqId}
                                  </button>
                                </>
                              ) : <p className="text-2xl font-bold text-rose-800 mt-2">-</p>}
                            </div>
                          </div>
                          {highestCostTickets.length > 1 && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm text-left">
                                <thead className="bg-paper text-xs text-muted border-b border-line">
                                  <tr>
                                    <th className="px-4 py-2">Ticket ที่มีค่าใช้จ่ายสูง</th>
                                    <th className="px-4 py-2 text-right">มูลค่า</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {highestCostTickets.map(ticket => (
                                    <tr key={ticket.id}>
                                      <td className="px-4 py-2">
                                        <button
                                          type="button"
                                          onClick={() => navigate('/?view=all', { state: { ticketId: ticket.id } })}
                                          className="font-mono text-blue-700 hover:underline"
                                        >
                                          {ticket.reqId}
                                        </button>
                                        <span className="text-muted ml-2">{ticket.projectName}</span>
                                      </td>
                                      <td className="px-4 py-2 text-right font-semibold">
                                        ฿{ticket.cost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </section>

                        <section className="rounded-lg border border-line p-5">
                          <h4 className="text-sm font-bold text-ink mb-4">สรุปการเบิกตามผู้ดำเนินการ</h4>
                                          <p className="text-xs text-muted -mt-2 mb-3">แสดงชื่อและรูปผู้เบิกจากข้อมูลพนักงาน และมูลค่าจากรายการที่มีข้อมูลราคา</p>
                          {stockUsage.employees.length === 0 ? (
                            <p className="text-center text-sm text-muted py-8">ไม่มีข้อมูลผู้เบิกในช่วงวันที่เลือก</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm text-left">
                                <thead className="bg-paper text-xs text-muted border-b border-line">
                                  <tr>
                                    <th className="px-4 py-3">ผู้เบิก</th>
                                    <th className="px-4 py-3 text-right">จำนวนชิ้น</th>
                                    <th className="px-4 py-3 text-right">จำนวนเคส</th>
                                    <th className="px-4 py-3 text-right">มูลค่าโดยประมาณ (บาท)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {stockUsage.employees.map(employee => (
                                    <tr key={employee.empCode}>
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-3 min-w-[200px]">
                                          {employee.empCode !== 'ไม่ระบุผู้เบิก' ? (
                                            <div className="relative w-12 h-12 shrink-0">
                                              <EmployeeAvatar src={`http://dcidmc.dci.daikin.co.jp/PICTURE/${encodeURIComponent(employee.empCode)}.jpg`} name={employee.name} size={48} />
                                              <div className="hidden absolute inset-0 rounded-full bg-paper border border-line items-center justify-center text-muted">
                                                <User className="w-5 h-5" />
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="w-10 h-10 rounded-full bg-paper border border-line flex items-center justify-center text-muted shrink-0">
                                              <User className="w-5 h-5" />
                                            </div>
                                          )}
                                          <div>
                                            <p className="font-semibold text-ink-soft">{employee.name}</p>
                                            {employee.empCode !== 'ไม่ระบุผู้เบิก' && (
                                              <p className="text-xs text-muted font-mono">{employee.empCode}</p>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-right">{employee.quantity.toLocaleString('th-TH')}</td>
                                      <td className="px-4 py-3 text-right">{employee.ticketCount.toLocaleString('th-TH')}</td>
                                      <td className="px-4 py-3 text-right">฿{employee.cost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </section>

                        <div className="border-t border-line pt-6">
                          <div className="flex items-center justify-between gap-3 mb-4">
                            <h4 className="text-sm font-bold text-ink">เคสที่มีการใช้อุปกรณ์</h4>
                            <span className="text-xs font-semibold text-muted">{stockUsage.tickets.length} เคส</span>
                          </div>
                          {stockUsage.tickets.length === 0 ? (
                            <p className="text-center text-sm text-muted py-6">ไม่มีเคสที่ใช้อุปกรณ์ในช่วงวันที่เลือก</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm text-left">
                                <thead className="bg-white text-xs text-muted border-b border-line">
                                  <tr>
                                    <th className="px-4 py-3">เคส</th>
                                    <th className="px-4 py-3">ปัญหา</th>
                                    <th className="px-4 py-3">สถานะ</th>
                                    <th className="px-4 py-3">รายละเอียดการเบิก</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {paginatedStockTickets.map(ticket => (
                                    <tr key={ticket.id} className="align-top hover:bg-paper">
                                      <td className="px-4 py-3 whitespace-nowrap">
                                        <button
                                          type="button"
                                          onClick={() => navigate('/?view=all', { state: { ticketId: ticket.id } })}
                                          className="font-mono font-semibold text-blue-700 hover:text-blue-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
                                          aria-label={`เปิด Ticket ${ticket.reqId}`}
                                        >
                                          {ticket.reqId}
                                        </button>
                                        <span className="block text-xs text-muted mt-1">
                                          {ticket.createdAt && !Number.isNaN(new Date(ticket.createdAt).getTime())
                                            ? new Date(ticket.createdAt).toLocaleDateString('th-TH')
                                            : '-'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 min-w-[180px] font-medium text-ink-soft">{ticket.projectName}</td>
                                      <td className="px-4 py-3 whitespace-nowrap">
                                        <StatusBadge status={ticket.status} />
                                      </td>
                                      <td className="px-4 py-3 min-w-[300px]">
                                        <ul className="space-y-1">
                                          {ticket.withdrawals.map(item => (
                                            <li key={item.key} className="text-ink-soft border-b border-slate-100 last:border-0 pb-1 last:pb-0">
                                              <span className="font-medium">{item.name}</span>
                                              <span className="text-muted"> × {item.quantity.toLocaleString('th-TH')}</span>
                                              <span className="block text-xs text-muted mt-0.5">
                                                เบิก: {item.withdrawnAt && !Number.isNaN(new Date(item.withdrawnAt).getTime())
                                                  ? new Date(item.withdrawnAt).toLocaleString('th-TH')
                                                  : '-'}
                                                {' · '}ผู้เบิก: {item.withdrawnBy}
                                                {' · '}รวม: {item.cost !== null
                                                  ? `฿${item.cost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                  : '-'}
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {stockTotalPages > 1 && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-line bg-paper">
                                  <p className="text-xs font-medium text-muted">
                                    แสดง {(stockPage - 1) * STOCK_TICKETS_PER_PAGE + 1}–{Math.min(stockPage * STOCK_TICKETS_PER_PAGE, stockUsage.tickets.length)} จาก {stockUsage.tickets.length} เคส
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setStockPage(page => Math.max(1, page - 1))}
                                      disabled={stockPage === 1}
                                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-ink-soft hover:bg-white disabled:opacity-40"
                                    >
                                      ก่อนหน้า
                                    </button>
                                    <span className="text-xs font-semibold text-ink-soft">{stockPage} / {stockTotalPages}</span>
                                    <button
                                      type="button"
                                      onClick={() => setStockPage(page => Math.min(stockTotalPages, page + 1))}
                                      disabled={stockPage === stockTotalPages}
                                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-ink-soft hover:bg-white disabled:opacity-40"
                                    >
                                      ถัดไป
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* Oldest Open Tickets */}
                {tab === 'overview' && (
                  <div className="bg-white rounded-lg border border-line shadow-soft overflow-hidden">
                  <div className="px-6 py-5 border-b border-line bg-paper flex items-center justify-between">
                    <h3 className="text-base font-bold text-ink flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-muted" /> เคสค้างนานที่สุด
                    </h3>
                    <span className="text-[10px] bg-rose-50 px-2 py-1 rounded-lg text-rose-700 font-bold border border-rose-200">
                      {oldestOpenTickets.length} เคส
                    </span>
                  </div>
                  {oldestOpenTickets.length === 0 ? (
                    <div className="py-16 text-center text-muted text-sm font-medium">ไม่มีเคสค้างอยู่ 🎉</div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-white text-xs text-muted border-b border-line">
                            <tr>
                              <th className="px-6 py-4">เคส</th>
                              <th className="px-4 py-4">ผู้แจ้ง</th>
                              <th className="px-4 py-4">สถานะ</th>
                              <th className="px-4 py-4">ผู้รับผิดชอบ</th>
                              <th className="px-6 py-4 text-right">ค้างมาแล้ว</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {paginatedOldest.map(t => {
                              const sev = ageSeverity(t.ageDays);
                              return (
                                <tr key={t.id} className="hover:bg-paper transition-colors">
                                  <td className="px-6 py-4">
                                    <p className="font-semibold text-ink-soft text-sm truncate max-w-[300px]">{t.project_name}</p>
                                    <p className="text-[11px] text-muted font-mono mt-0.5">{t.req_id}</p>
                                  </td>
                                  <td className="text-sm text-ink-soft">{t.requester_name?.split(' ')[0] || t.empCode_created}</td>
                                  <td className="px-4 py-4">
                                    {/* ✅ อัปเดตการแสดงผลสถานะในตารางให้มี Emoji */}
                                    <StatusBadge status={t.status} />
                                  </td>
                                  <td className="text-sm text-ink-soft">{t.assigned_name?.split(' ')[0] || 'Unassigned'}</td>
                                  <td className="px-6 py-4 text-right">
                                    <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${sev.bg} ${sev.border} ${sev.text}`}>
                                      {t.ageDays} วัน
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {oldestTotalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-line bg-paper">
                          <p className="text-xs font-medium text-muted">
                            แสดง {(oldestPage - 1) * OLDEST_PER_PAGE + 1}–{Math.min(oldestPage * OLDEST_PER_PAGE, oldestOpenTickets.length)} จาก {oldestOpenTickets.length} รายการ
                          </p>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setOldestPage(p => Math.max(1, p - 1))} disabled={oldestPage === 1}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-ink-soft hover:bg-white disabled:opacity-30 transition-colors">
                              Prev
                            </button>
                            {Array.from({ length: oldestTotalPages }, (_, i) => i + 1).map(page => (
                              <button key={page} onClick={() => setOldestPage(page)}
                                className={`w-8 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${oldestPage === page
                                  ? 'bg-ink text-white border-ink'
                                  : 'bg-white text-ink-soft border-slate-300 hover:bg-paper'
                                  }`}>
                                {page}
                              </button>
                            ))}
                            <button onClick={() => setOldestPage(p => Math.min(oldestTotalPages, p + 1))} disabled={oldestPage === oldestTotalPages}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-ink-soft hover:bg-white disabled:opacity-30 transition-colors">
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  </div>
                )}
                {/* TYPE TAB */}
                {tab === 'type' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                      <div className="bg-white rounded-lg border border-line shadow-soft p-6">
                        <h3 className="text-base font-bold text-ink mb-6 flex items-center gap-2">
                          <Database className="w-5 h-5 text-muted" /> ประเภทปัญหาหลัก
                        </h3>
                        <div className="space-y-5">
                          {typeData.map((t, i) => {
                            const pct = kpi.total ? Math.round((t.total / kpi.total) * 100) : 0;
                            const rate = closeRate(t.completed, t.total, t.rejected);
                            return (
                              <div key={t.name}>
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-sm font-semibold text-ink-soft flex items-center gap-2.5">
                                    <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                                    {t.name}
                                  </span>
                                  <div className="flex items-center gap-4 text-sm">
                                    <span className="font-semibold text-ink-soft">{t.total} เคส</span>
                                    <span className={`font-bold ${rate >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>เสร็จแล้ว {rate}%</span>
                                  </div>
                                </div>
                                <div className="h-2 bg-paper rounded-lg overflow-hidden">
                                  <div className="h-full" style={{ width: `${pct}%`, background: PALETTE[i % PALETTE.length] }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="bg-white rounded-lg border border-line shadow-soft p-6">
                        <h3 className="text-base font-bold text-ink mb-6">ประเภทย่อยที่พบบ่อย</h3>
                        {subtypeData.length === 0 ? (
                          <div className="flex h-full items-center justify-center pb-10">
                            <p className="text-muted text-sm font-medium">ยังไม่มีข้อมูล</p>
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={subtypeData} layout="vertical" barSize={16} margin={{ top: 0, right: 20, left: -10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                              <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12, fill: '#64748b', fontWeight: '500' }} axisLine={false} tickLine={false} />
                              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                              <Bar dataKey="value" name="จำนวน (Tickets)" radius={[0, 3, 3, 0]}>
                                {subtypeData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-line shadow-soft overflow-hidden">
                      <div className="px-6 py-5 border-b border-line bg-paper">
                        <h3 className="text-base font-bold text-ink">สรุปสถานะแต่ละประเภทปัญหา</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-white text-xs text-muted border-b border-line">
                            {/* ✅ เพิ่ม Emoji บนหัวตาราง */}
                            <tr>
                              <th className="px-6 py-4">ประเภทปัญหา</th>
                              <th className="text-center px-4 py-4">ทั้งหมด</th>
                              <th className="text-center px-4 py-4">รอรับเรื่อง</th>
                              <th className="text-center px-4 py-4">กำลังทำ</th>
                              <th className="text-center px-4 py-4">✅ เสร็จ (Done)</th>
                              <th className="text-center px-4 py-4">❌ Reject</th>
                              <th className="text-center px-6 py-4">อัตราปิดงาน</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {typeData.map((t, i) => {
                              const rows = requests.filter(r => r.status !== 'Cancelled' && (r.problem_type_name || r.request_type) === t.name);
                              const pending = rows.filter(r => r.status === 'Open').length;
                              const inProg = rows.filter(r => r.status === 'In Progress').length;
                              const completed = rows.filter(r => r.status === 'Closed').length;
                              const rejected = rows.filter(r => r.status === 'Rejected').length;
                              const rate = closeRate(completed, rows.length, rejected);
                              return (
                                <tr key={t.name} className="hover:bg-paper transition-colors">
                                  <td className="px-6 py-4 flex items-center gap-3 text-sm font-semibold text-ink-soft">
                                    <span className="w-2.5 h-2.5 rounded-sm shadow-soft" style={{ background: PALETTE[i % PALETTE.length] }} />
                                    {t.name}
                                  </td>
                                  <td className="text-center text-sm font-bold text-ink">{t.total}</td>
                                  <td className="text-center text-sm font-medium text-blue-600">{pending}</td>
                                  <td className="text-center text-sm font-medium text-amber-600">{inProg}</td>
                                  <td className="text-center text-sm font-medium text-emerald-600">{completed}</td>
                                  <td className="text-center text-sm font-medium text-rose-500">{rejected}</td>
                                  <td className="text-center px-6 py-4">
                                    <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${rate >= 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
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
                  </div>
                )}

                {/* STAFF TAB */}
                {tab === 'staff' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[
                        { label: 'ผู้รับเคส', value: staffData.length, icon: <Users className="w-6 h-6 text-indigo-600" />, bgIcon: 'bg-indigo-50 border border-indigo-100' },
                        { label: 'มอบหมายแล้ว', value: requests.filter(r => r.empCode_assigned).length, icon: <CheckCircle className="w-6 h-6 text-blue-600" />, bgIcon: 'bg-blue-50 border border-blue-100' },
                        { label: 'เคสที่ยังไม่มีคนรับ', value: requests.filter(r => !r.empCode_assigned && r.status === 'Open').length, icon: <Clock className="w-6 h-6 text-amber-600" />, bgIcon: 'bg-amber-50 border border-amber-100' },
                      ].map((s, i) => (
                        <div key={i} className="bg-white rounded-lg border border-line p-6 flex items-center justify-between shadow-soft">
                          <div>
                            <p className="text-xs font-bold text-muted mb-1.5">{s.label}</p>
                            <p className="text-4xl font-bold text-ink leading-none">{s.value}</p>
                          </div>
                          <div className={`w-14 h-14 rounded-lg flex items-center justify-center shrink-0 ${s.bgIcon}`}>
                            {s.icon}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-white rounded-lg border border-line shadow-soft overflow-hidden">
                      <div className="px-6 py-5 border-b border-line bg-paper">
                        <h3 className="text-base font-bold text-ink flex items-center gap-2">
                          <Users className="w-5 h-5 text-muted" /> ผลการทำงานทีมงาน
                        </h3>
                      </div>
                      {staffData.length === 0 ? (
                        <div className="py-20 text-center">
                          <p className="text-muted text-sm font-medium">ยังไม่มีข้อมูลการมอบหมายงาน</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-white text-xs text-muted border-b border-line">
                              <tr>
                                <th className="px-6 py-4">ชื่อทีมงาน</th>
                                <th className="text-center px-4 py-4">รับเคสทั้งหมด</th>
                                <th className="text-center px-4 py-4">ปิดเคสแล้ว</th>
                                <th className="text-center px-4 py-4">อัตราสำเร็จ</th>
                                <th className="text-center px-4 py-4">เวลาเฉลี่ย</th>
                                <th className="text-center px-4 py-4">ตามกำหนด</th>
                                <th className="text-center px-4 py-4">ช่วยเป็น Helper</th>
                                <th className="px-6 py-4 text-left">Workload Bar</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {staffData.map(s => (
                                <tr key={s.name} className="hover:bg-paper transition-colors">
                                  <td className="px-6 py-4 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-paper overflow-hidden border border-line shrink-0">
                                      <EmployeeAvatar src={`http://dcidmc.dci.daikin.co.jp/PICTURE/${s.empCode}.jpg`} name={s.name} size={48} />
                                      <div className="hidden absolute inset-0 items-center justify-center text-sm font-bold text-muted bg-paper">
                                        {s.name?.charAt(0) || '?'}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-ink-soft text-sm block">{s.name}</span>
                                      <span className="text-[11px] text-muted font-mono">รหัส: {s.empCode}</span>
                                    </div>
                                  </td>
                                  <td className="text-center text-sm font-bold text-ink">{s.total}</td>
                                  <td className="text-center text-sm font-medium text-emerald-600">{s.completed}</td>
                                  <td className="text-center text-sm">
                                    <span className={`font-semibold ${s.rate >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>{s.rate}%</span>
                                  </td>
                                  <td className="text-center text-sm text-ink-soft">{s.avgDays} <span className="text-[10px]">วัน</span></td>
                                  <td className="text-center">
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${slaBg(s.sla).replace('bg-', 'bg-').replace('500', '50').replace('400', '50')} ${slaColor(s.sla)} ${slaColor(s.sla).replace('text-', 'border-').replace('600', '200').replace('500', '200')}`}>{s.sla}%</span>
                                  </td>
                                  <td className="text-center text-sm font-medium text-purple-600">{s.asHelper || 0}</td>
                                  <td className="px-6 py-4 w-[180px]">
                                    <div className="h-2 bg-paper rounded-lg overflow-hidden w-full">
                                      <div className={`h-full ${slaBg(s.rate)}`} style={{ width: `${(s.total / (staffData[0]?.total || 1)) * 100}%` }} />
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {tab === 'staff' && (
                  <div className="bg-white rounded-lg border border-line shadow-soft overflow-hidden">
                  <div className="px-6 py-5 border-b border-line bg-paper">
                    <h3 className="text-base font-bold text-ink">ผู้รับเคส × ประเภทงาน</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-white text-xs text-muted border-b border-line">
                        <tr>
                          <th className="px-6 py-4 sticky left-0 bg-white">Technician</th>
                          {technicianMatrix.categories.map(c => (
                            <th key={c} className="text-center px-3 py-4 whitespace-nowrap">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {technicianMatrix.rows.map(([tech, counts]) => {
                          const max = Math.max(...Object.values(counts));
                          return (
                            <tr key={tech} className="hover:bg-paper transition-colors">
                              <td className="px-6 py-4 font-semibold text-ink-soft sticky left-0 bg-white">{tech}</td>
                              {technicianMatrix.categories.map(c => {
                                const v = counts[c] || 0;
                                const intensity = v === 0 ? 0 : v / max;
                                return (
                                  <td key={c} className="text-center px-3 py-2">
                                    {v > 0 ? (
                                      <span
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold"
                                        style={{ background: `rgba(59,130,246,${0.15 + intensity * 0.5})`, color: intensity > 0.5 ? '#fff' : '#1e40af' }}
                                      >
                                        {v}
                                      </span>
                                    ) : <span className="text-slate-200">–</span>}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  </div>
                )}
                {/* DEPT TAB */}
                {tab === 'dept' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="bg-white rounded-lg border border-line shadow-soft p-6">
                        <h3 className="text-base font-bold text-ink mb-6 flex items-center gap-2">
                          <Activity className="w-5 h-5 text-muted" /> แผนกที่แจ้งปัญหามากที่สุด
                        </h3>
                        <div className="space-y-4">
                          {deptData.map((d, i) => {
                            const pct = kpi.total ? Math.round((d.total / kpi.total) * 100) : 0;
                            const rate = closeRate(d.completed, d.total, d.rejected);
                            return (
                              <div key={d.cc} className="p-4 rounded-lg border border-slate-100 bg-paper/50 hover:bg-white transition-colors">
                                <div className="flex justify-between items-center mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-lg bg-slate-200 text-ink-soft flex items-center justify-center text-xs font-bold">{i + 1}</div>
                                    <span className="font-mono text-ink-soft text-sm font-semibold">CC: {d.cc}</span>
                                  </div>
                                  <div className="flex items-center gap-4 text-xs font-bold">
                                    {d.critical > 0 && <span className="text-rose-600 font-medium">วิกฤต: {d.critical}</span>}
                                    <span className="text-ink-soft text-sm">{d.total} เคส</span>
                                    <span className={rate >= 70 ? 'text-emerald-500' : 'text-amber-500'}>เสร็จแล้ว {rate}%</span>
                                  </div>
                                </div>
                                <div className="h-2 bg-slate-200/50 rounded-lg overflow-hidden">
                                  <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="bg-white rounded-lg border border-line shadow-soft p-6">
                        <h3 className="text-base font-bold text-ink mb-6">สถานที่ที่แจ้งปัญหา</h3>
                        <ResponsiveContainer width="100%" height={400}>
                          <BarChart data={locationData.data} layout="vertical" barSize={16} margin={{ top: 0, right: 20, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12, fill: '#64748b', fontWeight: '500' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                            {locationData.subKeys.map((sub, i) => (
                              <Bar key={sub} dataKey={sub} name={sub} stackId="a" fill={PALETTE[i % PALETTE.length]} />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Top Requesters */}
                    <div className="bg-white rounded-lg border border-line shadow-soft overflow-hidden">
                      <div className="px-6 py-5 border-b border-line bg-paper">
                        <h3 className="text-base font-bold text-ink flex items-center gap-2">
                          <Users className="w-5 h-5 text-muted" /> พนักงานที่แจ้งปัญหาบ่อยที่สุด (10 อันดับแรก)
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-white text-xs text-muted border-b border-line">
                            <tr>
                              <th className="px-6 py-4">พนักงาน</th>
                              <th className="text-center px-4 py-4">แผนก (Cost Center)</th>
                              <th className="text-center px-4 py-4">จำนวนเคสทั้งหมด</th>
                              <th className="text-center px-6 py-4">เคสที่เปิดอยู่</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {topRequestersData.map((u, idx) => {
                              const open = requests.filter(r => r.empCode_created === u.empCode && r.status === 'Open').length;
                              return (
                                <tr key={u.empCode} className="hover:bg-paper transition-colors">
                                  <td className="px-6 py-4 flex items-center gap-4">
                                    <span className="w-6 h-6 rounded-lg bg-paper text-muted flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                                    <div className="w-12 h-12 rounded-lg bg-paper overflow-hidden shrink-0 border border-line">
                                      <EmployeeAvatar src={`http://dcidmc.dci.daikin.co.jp/PICTURE/${u.empCode}.jpg`} name={u.name} size={48} />
                                      <div className="hidden absolute inset-0 items-center justify-center text-muted bg-paper">
                                        <User className="w-5 h-5" />
                                      </div>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-ink-soft text-sm block">{u.name}</span>
                                      <span className="text-[11px] text-muted font-mono">รหัส: {u.empCode}</span>
                                    </div>
                                  </td>
                                  <td className="text-center text-sm font-medium text-ink-soft">{u.cc}</td>
                                  <td className="text-center text-lg font-bold text-ink">{u.total}</td>
                                  <td className="text-center px-6 py-4">
                                    <span className={`text-sm font-semibold ${open > 0 ? 'text-amber-600' : 'text-muted'}`}>{open}</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
                {tab === 'dept' && (
                  <div className="bg-white rounded-lg border border-line shadow-soft overflow-hidden">
                  <div className="px-6 py-5 border-b border-line bg-paper">
                    <h3 className="text-base font-bold text-ink">ผู้แจ้งที่มีเคสค้างมากสุด (Not Closed)</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-white text-xs text-muted border-b border-line">
                        {/* ✅ เพิ่ม Emoji บนหัวตาราง */}
                        <tr>
                          <th className="px-6 py-4">พนักงาน</th>
                          <th className="text-center px-4 py-4">รอรับเรื่อง</th>
                          <th className="text-center px-4 py-4">กำลังดำเนินการ</th>
                          <th className="text-center px-4 py-4">⏳ On Hold</th>
                          <th className="text-center px-6 py-4">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeRequestersData.map(u => (
                          <tr key={u.empCode} className="hover:bg-paper transition-colors">
                            <td className="px-6 py-4 font-semibold text-ink-soft text-sm">{u.name}</td>
                            <td className="text-center text-sm font-medium text-blue-600">{u.open}</td>
                            <td className="text-center text-sm font-medium text-amber-600">{u.inProgress}</td>
                            <td className="text-center text-sm font-medium text-orange-600">{u.hold}</td>
                            <td className="text-center px-6 py-4"><span className="font-bold text-ink text-base">{u.total}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  </div>
                )}

                {/* SLA TAB */}
                {tab === 'sla' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[
                        { label: 'ภาพรวม SLA', value: `${kpi.slaRate}%`, sub: 'เปอร์เซ็นต์การปิดเคสตามกำหนด', color: kpi.slaRate >= 80 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200' },
                        { label: 'เคสเกินกำหนด', value: kpi.overdue, sub: 'เคสที่เกินกำหนดเวลาและยังเปิดอยู่', color: kpi.overdue > 0 ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-ink-soft bg-paper border-line' },
                        { label: 'วิกฤตที่กำลังทำ', value: kpi.critical, sub: 'เคสระดับวิกฤตที่กำลังดำเนินการ', color: kpi.critical > 0 ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-ink-soft bg-paper border-line' },
                      ].map((s, i) => (
                        <div key={i} className={`rounded-lg border p-6 shadow-soft ${s.color}`}>
                          <p className="text-xs font-bold opacity-80 mb-2">{s.label}</p>
                          <p className="text-5xl font-bold my-3">{s.value}</p>
                          <p className="text-[11px] font-medium opacity-70 mt-2">{s.sub}</p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-white rounded-lg border border-line shadow-soft overflow-hidden">
                      <div className="px-6 py-5 border-b border-line bg-paper">
                        <h3 className="text-base font-bold text-ink flex items-center gap-2">
                          <Target className="w-5 h-5 text-muted" /> ประสิทธิภาพ SLA ตามประเภทปัญหา
                        </h3>
                      </div>
                      {slaByType.length === 0 ? (
                        <div className="py-20 text-center">
                          <p className="text-muted text-sm font-medium">ยังไม่มีข้อมูลการปิดเคสเพื่อคำนวณ SLA</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-white text-xs text-muted border-b border-line">
                              <tr>
                                <th className="px-6 py-4">ประเภทปัญหา</th>
                                <th className="text-center px-4 py-4">เคสที่ปิดแล้ว</th>
                                <th className="text-center px-4 py-4">ทันเวลา</th>
                                <th className="text-center px-4 py-4">เวลาเฉลี่ย</th>
                                <th className="px-6 py-4 text-left">อัตรา SLA</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {slaByType.map((t, i) => (
                                <tr key={t.type} className="hover:bg-paper transition-colors">
                                  <td className="px-6 py-4 flex items-center gap-3 text-sm font-semibold text-ink-soft">
                                    <span className="w-2.5 h-2.5 rounded-sm shadow-soft" style={{ background: PALETTE[i % PALETTE.length] }} />
                                    {t.type}
                                  </td>
                                  <td className="text-center text-sm font-bold text-ink">{t.total}</td>
                                  <td className="text-center text-sm font-medium text-emerald-600">{t.onTime}</td>
                                  <td className="text-center text-sm text-muted">{t.avgDays} <span className="text-[10px]">วัน</span></td>
                                  <td className="px-6 py-4 w-[220px]">
                                    <div className="flex items-center gap-3">
                                      <div className="flex-1 h-2 bg-paper rounded-lg overflow-hidden">
                                        <div className={`h-full ${slaBg(t.sla)}`} style={{ width: `${t.sla}%` }} />
                                      </div>
                                      <span className={`text-xs font-bold w-10 text-right ${slaColor(t.sla)}`}>{t.sla}%</span>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
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