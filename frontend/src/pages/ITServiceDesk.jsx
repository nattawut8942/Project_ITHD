import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { ticketAPI } from '../utils/apiClient';
import Sidebar from '../components/Sidebar';
import {
  Computer, LogOut, Monitor, LayoutDashboard, Plus, Clock,
  CheckCircle, MapPin, X, User, Search, ChevronRight,
  Paperclip, AlertCircle, Laptop, Wrench, Grid, List, ArrowRight
} from 'lucide-react';
import { getDeviceTypeColor, getColorGradient } from '../utils/styleHelpers';
import OpenTicketModal from '../components/OpenTicketModal';
import TicketDetailModal from '../components/TicketDetailModal';
import { API_BASE } from '../config/api';
import { useLocation, useNavigate } from 'react-router-dom';

const Chip = ({ label, onRemove }) => (
  <span className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-full text-xs font-bold">
    {label}
    <button onClick={onRemove} className="hover:text-indigo-900 transition-colors">×</button>
  </span>
);

export default function ITServiceDesk() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentView = new URLSearchParams(location.search).get('view') || 'all';

  const [requests, setRequests] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentMode, setCommentMode] = useState('comment');
  const [pendingAction, setPendingAction] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  // Sort states
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  const [rootCause, setRootCause] = useState('');
  const [solution, setSolution] = useState('');

  const [ticketHistory, setTicketHistory] = useState([]);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Layout Mode state (Grid / List)
  const [layoutMode, setLayoutMode] = useState('list');

  const [formData, setFormData] = useState({
    requestType: 'Hardware Setup', projectName: '', targetDate: '', deviceType: 'Notebook (Windows)', deviceCount: 1, location: '', priority: 'Normal', requirements: ''
  });

  const isITStaff = user?.cost_center === '7510';

  const formatDateShort = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatThaiDateTime = (value) => {
    if (!value) return '';
    return new Date(value).toLocaleString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Bangkok'
    });
  };

  const formatElapsedTime = (start, end) => {
    if (!start || !end) return '-';
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return '-';
    const diffMs = endDate - startDate;
    if (diffMs <= 0) return '-';
    const totalMinutes = Math.floor(diffMs / 60000);
    
    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}.${minutes.toString().padStart(2, '0')} hrs`;
    }
    
    return `${totalMinutes} นาที`;
  };

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const response = await ticketAPI.getTickets();
      const tickets = response.data.data || response.data;
      setRequests(Array.isArray(tickets) ? tickets : []);
    } catch (error) {
      console.error('Fetch error:', error);
      showNotification('Failed to load requests from database', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    if (selectedTicket) fetchTicketHistory(selectedTicket.id);
    else { setTicketHistory([]); setCommentText(''); }
  }, [selectedTicket]);

  const fetchTicketHistory = async (id) => {
    try {
      const response = await ticketAPI.getTicketHistory(id);
      setTicketHistory(response.data.data || []);
    } catch (error) { console.error('Failed to fetch history:', error); }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !selectedTicket) return;
    setIsSubmittingComment(true);
    try {
      await ticketAPI.addTicketComment(selectedTicket.id, commentText);
      setCommentText('');
      fetchTicketHistory(selectedTicket.id);
      showNotification('Comment added successfully', 'success');
    } catch (error) {
      showNotification('Failed to add comment', 'error');
    } finally { setIsSubmittingComment(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.projectName || !formData.location) {
      showNotification('Please fill in required fields.', 'error');
      return;
    }
    try {
      const ticketPayload = {
        request_type: formData.requestType,
        project_name: formData.projectName,
        device_type: formData.deviceType,
        device_count: parseInt(formData.deviceCount, 10) || 1,
        location: formData.location,
        priority: formData.priority,
        target_date: formData.targetDate || new Date().toISOString().split('T')[0],
        notes: formData.requirements
      };
      await ticketAPI.createTicket(ticketPayload);
      showNotification('Request submitted successfully!', 'success');
      setIsModalOpen(false);
      setFormData({ requestType: 'Hardware Setup', projectName: '', targetDate: '', deviceType: 'Notebook (Windows)', deviceCount: 1, location: '', priority: 'Normal', requirements: '' });
      fetchRequests();
    } catch (error) {
      showNotification('Failed to submit request to database', 'error');
    }
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const openConfirm = ({ title, message, confirmLabel = 'Confirm', onConfirm }) => {
    setPendingAction({ title, message, confirmLabel, onConfirm });
  };

  const closeConfirm = () => setPendingAction(null);

  const executePendingAction = async () => {
    if (!pendingAction?.onConfirm) return;
    try { await pendingAction.onConfirm(); }
    catch (error) { showNotification('ไม่สามารถดำเนินการได้', 'error'); }
    finally { closeConfirm(); }
  };

  const fetchTicketDetails = async (ticketId) => {
    setIsDetailLoading(true);
    try {
      const response = await ticketAPI.getTicket(ticketId);
      setSelectedTicket(response.data.data || response.data);
    } catch (error) {
      showNotification('Failed to load ticket details', 'error');
    } finally { setIsDetailLoading(false); }
  };

  const handleSaveComment = async () => {
    if (commentMode === 'close' && (!rootCause.trim() || !solution.trim())) {
      showNotification('กรุณาระบุสาเหตุและวิธีแก้ก่อนปิดเคส', 'error');
      return;
    }
    if (commentMode === 'reject' && !commentText.trim()) {
      showNotification('กรุณาระบุเหตุผลในการปฏิเสธเคส', 'error');
      return;
    }
    const updatePayload = commentMode === 'reject' ? { status: 'Rejected', comment: commentText }
      : commentMode === 'close' ? { status: 'Completed', root_cause: rootCause, solution: solution, comment: commentText || undefined }
        : { comment: commentText };

    try {
      await ticketAPI.updateTicket(selectedTicket.id, updatePayload);
      showNotification(commentMode === 'close' ? 'ปิดเคสสำเร็จ' : commentMode === 'reject' ? 'Ticket rejected' : 'Comment added', 'success');
      setCommentModalOpen(false); setCommentText(''); setRootCause(''); setSolution('');
      setCommentMode('comment'); setSelectedTicket(null); fetchRequests();
    } catch (err) { showNotification('Failed to save', 'error'); }
  };

  const openCommentModal = (mode = 'comment') => {
    setCommentMode(mode); setCommentText(''); setCommentModalOpen(true);
  };

  const handleAcceptTicket = async () => {
    try {
      await ticketAPI.updateTicket(selectedTicket.id, {
        status: 'In Progress', empCode_assigned: user?.empcode,
        notes: (selectedTicket.notes || '') + `\n\n[Action] รับเคสโดย ${user?.name || 'IT Staff'}`
      });
      showNotification('รับเคสเรียบร้อย', 'success');
      setSelectedTicket(null); fetchRequests();
    } catch (err) { showNotification('ไม่สามารถรับเคสได้', 'error'); }
  };

  const handleDeleteTicket = async () => {
    try {
      await ticketAPI.deleteTicket(selectedTicket.id);
      showNotification('Ticket deleted', 'success');
      setSelectedTicket(null); fetchRequests();
    } catch (err) { showNotification('Failed to delete ticket', 'error'); }
  };

  const handleCancelTicket = async () => {
    try {
      await ticketAPI.updateTicket(selectedTicket.id, { status: 'Cancelled', comment: 'ยกเลิกโดยผู้แจ้ง' });
      showNotification('ยกเลิก Ticket เรียบร้อย', 'success');
      setSelectedTicket(null); fetchRequests();
    } catch (err) { showNotification('ไม่สามารถยกเลิก Ticket ได้', 'error'); }
  };

  const filteredRequests = useMemo(() => {
    let result = requests;

    // View filter
    if (currentView === 'mine') result = result.filter(r => r.empCode_created === user?.empcode);

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.project_name?.toLowerCase().includes(q) ||
        r.req_id?.toLowerCase().includes(q) ||
        r.location?.toLowerCase().includes(q) ||
        r.requester_name?.toLowerCase().includes(q)
      );
    }

    // Filters
    if (filterStatus) result = result.filter(r => r.status === filterStatus);
    if (filterPriority) result = result.filter(r => r.priority === filterPriority);
    if (filterType) result = result.filter(r => (r.problem_type_name || r.request_type) === filterType);
    if (filterAssignee) result = result.filter(r =>
      filterAssignee === 'unassigned'
        ? !r.empCode_assigned
        : r.empCode_assigned === filterAssignee
    );
    if (filterDate) {
      const now = new Date();
      result = result.filter(r => {
        const d = new Date(r.created_at);
        if (filterDate === 'today') return d.toDateString() === now.toDateString();
        if (filterDate === 'week') return (now - d) <= 7 * 86400000;
        if (filterDate === 'month') return (now - d) <= 30 * 86400000;
        return true;
      });
    }

    // Sort
    result = [...result].sort((a, b) => {
      let valA = a[sortField], valB = b[sortField];
      if (sortField === 'priority') {
        const order = { Critical: 0, High: 1, Medium: 2, Normal: 3 };
        valA = order[valA] ?? 9; valB = order[valB] ?? 9;
      } else if (typeof valA === 'string') {
        valA = valA?.toLowerCase(); valB = valB?.toLowerCase();
      } else {
        valA = new Date(valA); valB = new Date(valB);
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [requests, currentView, searchQuery, filterStatus, filterPriority, filterType, filterAssignee, filterDate, sortField, sortDir, user?.empcode]);

  // Pagination
  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when filter changes
  useEffect(() => { setCurrentPage(1); }, [filterStatus, filterPriority, filterType, filterAssignee, filterDate, searchQuery, currentView]);

  // Unique values for filter dropdowns
  const uniqueTypes = [...new Set(requests.map(r => r.problem_type_name || r.request_type).filter(Boolean))];
  const uniqueAssignees = [...new Map(requests.filter(r => r.empCode_assigned).map(r => [r.empCode_assigned, r.assigned_name || r.empCode_assigned])).entries()];
  const activeFilterCount = [filterStatus, filterPriority, filterType, filterAssignee, filterDate].filter(Boolean).length;

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'Normal': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'Medium': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'High': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'Critical': return 'text-rose-700 bg-rose-50 border-rose-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

const getStatusStyle = (status) => {
  switch (status) {
    case 'Completed':  return 'text-emerald-800 bg-emerald-100 ring-emerald-400';
    case 'In Progress':return 'text-blue-800    bg-blue-100    ring-blue-400';
    case 'Rejected':   return 'text-rose-800    bg-rose-100    ring-rose-400';
    case 'Cancelled':  return 'text-slate-700   bg-slate-100   ring-slate-400';
    case 'Pending':    return 'text-amber-800   bg-amber-100   ring-amber-400 animate-pulse';
    default:           return 'text-amber-800   bg-amber-100   ring-amber-400';
  }
};
  const getStatusDot = (status) => {
    switch (status) {
      case 'Pending': return 'w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0';
      case 'In Progress': return 'w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shrink-0';
      case 'Completed': return 'w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0';
      case 'Rejected': return 'w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0';
      case 'Cancelled': return 'w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0';
      default: return 'w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0';
    }
  };
  const displayStatusLabel = (status) => {
    switch (status) {
      case 'Pending': return 'Pending';
      case 'In Progress': return 'In Progress';
      case 'Completed': return 'Completed';
      case 'Rejected': return 'Rejected';
      case 'Cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const requestTypeMap = {
    'Hardware Setup': 'asset', 'Hardware Repair': 'peripheral', 'Relocation (Move)': 'asset',
    'Software Install': 'storage', 'Network & Printer': 'network', 'Account & Access': 'storage', 'Other': 'office',
  };

  const getRequestTypeIcon = (type) => {
    const deviceKey = requestTypeMap[type] || 'office';
    const { text } = getDeviceTypeColor(deviceKey);
    switch (type) {
      case 'Hardware Setup': return <Monitor className={`w-4 h-4 ${text}`} />;
      case 'Software Install': return <Laptop className={`w-4 h-4 ${text}`} />;
      case 'Relocation (Move)': return <MapPin className={`w-4 h-4 ${text}`} />;
      case 'Hardware Repair': return <Wrench className={`w-4 h-4 ${text}`} />;
      case 'Network & Printer': return <Paperclip className={`w-4 h-4 ${text}`} />;
      default: return <LayoutDashboard className={`w-4 h-4 ${text}`} />;
    }
  };
  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="text-slate-300 ml-1">↕</span>;
    return <span className="text-indigo-500 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };
  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans flex overflow-hidden">

      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className={`flex items-center gap-3.5 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-md border border-white/20 min-w-[280px] ${notification.type === 'error'
              ? 'bg-rose-500/95 text-white shadow-rose-500/20'
              : 'bg-emerald-500/95 text-white shadow-emerald-500/20'
            }`}>
            <div className="bg-white/20 p-2 rounded-full shrink-0">
              {notification.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
            </div>
            <div className="flex-1 pr-2">
              <p className="font-bold text-sm leading-tight">
                {notification.type === 'error' ? 'เกิดข้อผิดพลาด' : 'สำเร็จ'}
              </p>
              <p className="text-white/90 text-xs font-semibold mt-0.5">{notification.message}</p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="p-1 hover:bg-white/10 rounded-lg transition text-white/70 hover:text-white shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar user={user} isITStaff={isITStaff} logout={logout} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden p-4 pl-0">
        <div className="bg-white rounded-[2rem] flex flex-col h-full shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-200/60 relative">

          {/* Header */}
          <header className="px-8 py-6 border-b border-slate-100 bg-white/80 backdrop-blur-md flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 z-10 shrink-0">
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                {currentView === 'all' ? 'All IT Requests' : 'My IT Requests'}
              </h1>
              <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                {isITStaff && currentView === 'all' ? 'Manage all system tickets' : 'Your submitted tickets'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
              {/* View Toggle */}
              <div className="inline-flex rounded-full bg-slate-100/80 p-1 border border-slate-200/50 shadow-inner">
                <button onClick={() => navigate('/?view=all')} className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-300 ${currentView === 'all' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                  All Tickets
                </button>
                <button onClick={() => navigate('/?view=mine')} className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-300 ${currentView === 'mine' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                  My Tickets
                </button>
              </div>

              {/* Grid / List Layout Switcher */}
              <div className="inline-flex rounded-full bg-slate-100/80 p-1 border border-slate-200/50 shadow-inner">
                <button
                  onClick={() => setLayoutMode('list')}
                  className={`p-2 rounded-full transition-all duration-300 ${layoutMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setLayoutMode('grid')}
                  className={`p-2 rounded-full transition-all duration-300 ${layoutMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Grid View"
                >
                  <Grid className="w-4 h-4" />
                </button>
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                    <p className="text-xs font-bold text-slate-400">
                      แสดง {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredRequests.length)} จาก {filteredRequests.length} รายการ
                    </p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">«</button>
                      <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">‹</button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let page;
                        if (totalPages <= 5) page = i + 1;
                        else if (currentPage <= 3) page = i + 1;
                        else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                        else page = currentPage - 2 + i;
                        return (
                          <button key={page} onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === page
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                                : 'text-slate-500 hover:bg-slate-100'
                              }`}>{page}</button>
                        );
                      })}
                      <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">›</button>
                      <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">»</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64 group">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="text" placeholder="Search ID, Project, Location..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-full text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all"
                />
              </div>

              {/* Action Button */}
              <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-full font-bold text-sm transition-all duration-300 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 active:scale-95 shrink-0">
                <Plus className="w-5 h-5" /> สร้าง Ticket ใหม่
              </button>
            </div>
          </header>

          {/* Scrollable Dashboard Body */}
          <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30 custom-scrollbar">

            {/* Premium Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-6">
              {[
                { label: 'ทั้งหมด', value: requests.filter(r => currentView === 'mine' ? r.empCode_created === user?.empcode : true).length, icon: <LayoutDashboard className="w-6 h-6 text-white" />, bgIcon: 'bg-indigo-500', shadow: 'shadow-indigo-200', filterVal: '' },
                { label: 'Pending', value: requests.filter(r => r.status === 'Pending').length, icon: <Clock className="w-6 h-6 text-white" />, bgIcon: 'bg-amber-400', shadow: 'shadow-amber-200', filterVal: 'Pending' },
                { label: 'In Progress', value: requests.filter(r => r.status === 'In Progress').length, icon: <Laptop className="w-6 h-6 text-white" />, bgIcon: 'bg-blue-500', shadow: 'shadow-blue-200', filterVal: 'In Progress' },
                { label: 'Completed', value: requests.filter(r => r.status === 'Completed').length, icon: <CheckCircle className="w-6 h-6 text-white" />, bgIcon: 'bg-emerald-500', shadow: 'shadow-emerald-200', filterVal: 'Completed' },
              ].map((s) => (
                <div
                  key={s.label}
                  onClick={() => setFilterStatus(prev => prev === s.filterVal ? '' : s.filterVal)}
                  className={`bg-white rounded-2xl border p-5 flex items-center justify-between shadow-sm cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg
        ${filterStatus === s.filterVal && s.filterVal !== ''
                      ? 'border-indigo-400 ring-2 ring-indigo-300/50'
                      : 'border-slate-100 hover:border-slate-200'
                    }`}
                >
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                    <p className="text-3xl font-black text-slate-800 leading-none">{isLoading ? '—' : s.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${s.bgIcon} shadow-lg ${s.shadow}`}>
                    {s.icon}
                  </div>
                </div>
              ))}
            </div>
            {/* Filter Bar */}
            <div className="flex items-center gap-3 mb-5 flex-wrap">
              <button
                onClick={() => setShowFilter(v => !v)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${showFilter || activeFilterCount > 0
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" /></svg>
                Filters
                {activeFilterCount > 0 && (
                  <span className="bg-white text-indigo-600 rounded-full px-1.5 py-0.5 text-[10px] font-black">{activeFilterCount}</span>
                )}
              </button>

              {/* Active filter chips */}
              {filterStatus && <Chip label={filterStatus} onRemove={() => setFilterStatus('')} />}
              {filterPriority && <Chip label={filterPriority} onRemove={() => setFilterPriority('')} />}
              {filterType && <Chip label={filterType} onRemove={() => setFilterType('')} />}
              {filterDate && <Chip label={{ today: 'วันนี้', week: 'สัปดาห์นี้', month: 'เดือนนี้' }[filterDate]} onRemove={() => setFilterDate('')} />}
              {filterAssignee && <Chip label={filterAssignee === 'unassigned' ? 'ยังไม่มีคนรับ' : uniqueAssignees.find(([k]) => k === filterAssignee)?.[1] || filterAssignee} onRemove={() => setFilterAssignee('')} />}

              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setFilterStatus(''); setFilterPriority(''); setFilterType(''); setFilterAssignee(''); setFilterDate(''); }}
                  className="text-xs font-bold text-rose-500 hover:text-rose-700 transition-colors"
                >
                  Clear all
                </button>
              )}

              <span className="ml-auto text-xs font-bold text-slate-400">{filteredRequests.length} รายการ</span>
            </div>

            {/* Filter Panel */}
            {showFilter && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5 grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status</label>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500">
                    <option value="">ทั้งหมด</option>
                    {['Pending', 'In Progress', 'Completed', 'Rejected', 'Cancelled'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Priority</label>
                  <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500">
                    <option value="">ทั้งหมด</option>
                    {['Critical', 'High', 'Medium', 'Normal'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ประเภทปัญหา</label>
                  <select value={filterType} onChange={e => setFilterType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500">
                    <option value="">ทั้งหมด</option>
                    {uniqueTypes.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ผู้รับผิดชอบ</label>
                  <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500">
                    <option value="">ทั้งหมด</option>
                    <option value="unassigned">ยังไม่มีคนรับ</option>
                    {uniqueAssignees.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">วันที่สร้าง</label>
                  <select value={filterDate} onChange={e => setFilterDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500">
                    <option value="">ทั้งหมด</option>
                    <option value="today">วันนี้</option>
                    <option value="week">สัปดาห์นี้</option>
                    <option value="month">เดือนนี้</option>
                  </select>
                </div>
              </div>
            )}
            
            {/* Loading & Empty States Management */}
            {isLoading ? (
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-16 text-center flex flex-col items-center gap-3 text-slate-400">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-bold tracking-widest uppercase">Loading Tickets...</span>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-20 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-2">
                  <Search className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-600 font-bold text-sm">ไม่พบรายการ Ticket</p>
                <p className="text-slate-400 text-xs font-medium">ลองเปลี่ยนเงื่อนไขการค้นหาหรือสร้าง Ticket ใหม่</p>
              </div>
            ) : layoutMode === 'grid' ? (

              /* --- GRID VIEW LAYOUT --- */
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-300">
                {paginatedRequests.map((req) => (
                  <div
                    key={req.id}
                    onClick={() => fetchTicketDetails(req.id)}
                    className={`relative border rounded-3xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between cursor-pointer group overflow-hidden ${
                      req.status === 'Pending' || !req.empCode_assigned
                        ? 'bg-orange-50 border-orange-200 border-l-[6px] border-l-orange-500'
                        : 'bg-white border-slate-100'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getPriorityStyle(req.priority)}`}>
                          {req.priority}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ring-1 ring-inset ${getStatusStyle(req.status)}`}>
                          {displayStatusLabel(req.status)}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate mb-1">
                        {req.project_name}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        {req.req_id}
                        {(req.status === 'Pending' || !req.empCode_assigned) && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-400 text-white shadow-sm animate-pulse">
                            NEW
                          </span>
                        )}
                      </p>

                      <div className="mb-4">
                        <span className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl border shadow-sm
                          ${getDeviceTypeColor(requestTypeMap[req.request_type] || 'office').bg}
                          ${getDeviceTypeColor(requestTypeMap[req.request_type] || 'office').text}
                          ${getDeviceTypeColor(requestTypeMap[req.request_type] || 'office').border}`}>
                          {getRequestTypeIcon(req.request_type)}
                          <span className="truncate max-w-[150px]">{req.problem_type_name || req.request_type}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-5">
                        <MapPin className="w-4 h-4 shrink-0 text-slate-400" />
                        <span className="truncate">{req.location}</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2" title={`Requester: ${req.requester_name}`}>
                          <img src={req.emp_pic_url || `http://dcidmc.dci.daikin.co.jp/PICTURE/${req.empCode_created}.jpg`} alt="requester"
                            className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-100 bg-slate-50 shadow-sm"
                            onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(req.requester_name)}&background=e0e7ff&color=4f46e5`; }} />
                          <span className="text-[11px] font-bold text-slate-500 max-w-[60px] truncate">{req.requester_name.split(' ')[0]}</span>
                        </div>

                        <ArrowRight className="w-3.5 h-3.5 text-slate-300" />

                        <div className="flex items-center gap-2">
                          {req.empCode_assigned ? (
                            <div className="flex items-center gap-2" title={`Assignee: ${req.assigned_name}`}>
                              <img src={`http://dcidmc.dci.daikin.co.jp/PICTURE/${req.empCode_assigned}.jpg`} alt="assignee"
                                className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-50 bg-indigo-50 shadow-sm"
                                onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(req.assigned_name || req.empCode_assigned)}&background=e0e7ff&color=4f46e5`; }} />
                              <span className="text-[11px] font-bold text-indigo-600 max-w-[60px] truncate">{req.assigned_name?.split(' ')[0] || req.empCode_assigned}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-dashed border-slate-200">Unassigned</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-black text-slate-500">Due: {formatDateShort(req.target_date)}</p>
                        {req.accepted_at && req.completed_at ? (
                          <p className="text-xs font-bold text-emerald-500 mt-0.5">⏱ {formatElapsedTime(req.accepted_at, req.completed_at)}</p>
                        ) : req.accepted_at ? (
                          <p className="text-xs font-bold text-indigo-500 mt-0.5">In progress...</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (

              /* --- LIST VIEW LAYOUT (Modern Compact) --- */
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto animate-in fade-in duration-300">
                <table className="w-full text-left text-sm whitespace-nowrap table-fixed">
                  <thead className="bg-slate-50/80 text-slate-800 text-[12px] uppercase font-black tracking-widest border-b border-slate-100">
  <tr>
    <th className="px-4 py-4 w-24" onClick={() => handleSort('priority')}>Priority<SortIcon field="priority"/></th>
    <th className="px-4 py-4 w-52" onClick={() => handleSort('project_name')}>Problem<SortIcon field="project_name"/></th>
    <th className="px-4 py-4 w-40">Category</th>
    <th className="px-4 py-4 w-32" onClick={() => handleSort('status')}>Status<SortIcon field="status"/></th>
    <th className="px-4 py-4 w-40">Location</th>
    <th className="px-4 py-4 w-28">Requester</th>
    <th className="px-4 py-4 w-28">In Charge</th>
    <th className="px-4 py-4 w-28 text-right" onClick={() => handleSort('target_date')}>Target Date<SortIcon field="target_date"/></th>
    <th className="px-4 py-4 w-10"></th>
  </tr>
</thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {paginatedRequests.map((req) => (
                      <tr 
                        key={req.id}
                        onClick={() => fetchTicketDetails(req.id)}
                        className={`relative transition-colors group cursor-pointer ${
                          req.status === 'Pending' || !req.empCode_assigned
                            ? 'bg-orange-50 hover:bg-orange-100/50'
                            : 'hover:bg-indigo-50/40'
                        }`}
                      >
                        {/* Priority */}
                        <td className={`px-6 py-3 ${req.status === 'Pending' || !req.empCode_assigned ? 'border-l-[6px] border-l-orange-500' : 'border-l-[6px] border-l-transparent'}`}>
                          <span className={`inline-flex px-2.5 py-1 rounded-md text-[12px] font-black uppercase tracking-widest border ${getPriorityStyle(req.priority)}`}>
                            {req.priority}
                            
                          </span>
                         
                        </td>

                        {/* Project Name */}
                        <td className="px-6 py-3 pr-2">
                          <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate max-w-[250px]">{req.project_name}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider flex items-center gap-2">
                            {req.req_id}
                            {(req.status === 'Pending' || !req.empCode_assigned) && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-400 text-white shadow-sm animate-pulse">
                                NEW
                              </span>
                            )}
                          </p>
                        </td>

                        {/* Category */}
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center gap-2 text-[11px] font-bold px-2.5 py-1 rounded-lg w-fit border shadow-sm
                            ${getDeviceTypeColor(requestTypeMap[req.request_type] || 'office').bg}
                            ${getDeviceTypeColor(requestTypeMap[req.request_type] || 'office').text}
                            ${getDeviceTypeColor(requestTypeMap[req.request_type] || 'office').border}`}>
                            {getRequestTypeIcon(req.request_type)}
                            <span className="truncate max-w-[120px]">{req.problem_type_name || req.request_type}</span>
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ring-1 ring-inset ${getStatusStyle(req.status)}`}>
                            <span className={getStatusDot(req.status)} />
                            {displayStatusLabel(req.status)}
                          </span>
                        </td>

                        {/* Location */}
                        <td className="px-6 py-3">
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                            <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-900" /> {req.location}
                          </span>
                        </td>

                        {/* Requester */}
                        <td className="px-6 py-3">
                          <div className="flex items-center" title={`Requester: ${req.requester_name}`}>
                            <span className="text-[12px] font-bold text-slate-700 truncate max-w-[150px]">{req.requester_name?.split(' ')[0] || req.empCode_created}</span>
                          </div>
                        </td>

                        {/* In Charge */}
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2" title={req.empCode_assigned ? `In Charge: ${req.assigned_name}` : 'Unassigned'}>
                            {req.empCode_assigned ? (
                              <span className="text-[12px] font-bold text-indigo-700 truncate max-w-[150px] bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">{req.assigned_name?.split(' ')[0] || req.empCode_assigned}</span>
                            ) : (
                              <span className="text-[11px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-dashed border-slate-200">Unassigned</span>
                            )}
                            
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                       
                       
                      </p>
                          </div>
                        </td>

                        {/* Target Date */}
                        <td className="px-6 py-3 text-right">
                          <p className="text-xs font-bold text-slate-600">{formatDateShort(req.target_date)}</p>
                          {req.accepted_at && req.completed_at ? (
                            <p className="text-xs font-bold text-emerald-500 mt-0.5">⏱ {formatElapsedTime(req.accepted_at, req.completed_at)}</p>
                          ) : req.accepted_at ? (
                            <p className="text-[10px] font-bold text-indigo-500 mt-0.5">In progress...</p>
                          ) : null}
                        </td>

                        {/* Action Icon */}
                        <td className="px-6 py-3 text-right">
                          <button className="text-slate-400 hover:text-indigo-600 p-2 rounded-full hover:bg-indigo-100/50 transition-colors">
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* --- PREMIUM CENTERED MODAL (TICKET DETAILS) --- */}
      <TicketDetailModal
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
        ticketHistory={ticketHistory}
        user={user}
        isITStaff={isITStaff}
        formatters={{
          formatDateShort,
          formatElapsedTime,
          formatThaiDateTime,
          getStatusStyle,
          getPriorityStyle,
          getRequestTypeIcon,
          displayStatusLabel
        }}
        actions={{
          openCommentModal,
          openConfirm,
          handleAcceptTicket,
          handleCancelTicket,
          handleDeleteTicket,
          setCommentMode,
          setCommentText,
          setCommentModalOpen
        }}
      />

      {/* --- MODALS --- */}

      {/* Comment/Close Modal */}
      {commentModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setCommentModalOpen(false)}></div>
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl z-[90] p-8 border border-white/50 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800">
                {commentMode === 'reject' ? 'Reject Ticket' : commentMode === 'close' ? 'Close Ticket' : 'Add Comment'}
              </h3>
              <button onClick={() => setCommentModalOpen(false)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {commentMode === 'close' ? (
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">สาเหตุของปัญหา <span className="text-rose-500">*</span></label>
                  <textarea rows="3" value={rootCause} onChange={(e) => setRootCause(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-700 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 resize-none transition-all"
                    placeholder="ระบุสาเหตุ (เช่น RAM เสีย, อะไหล่ชำรุด...)" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">วิธีแก้ไข <span className="text-rose-500">*</span></label>
                  <textarea rows="3" value={solution} onChange={(e) => setSolution(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-700 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 resize-none transition-all"
                    placeholder="ระบุการแก้ไข (เช่น เปลี่ยนอะไหล่, ตั้งค่าใหม่...)" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Comment เพิ่มเติม</label>
                  <textarea rows="2" value={commentText} onChange={(e) => setCommentText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-700 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 resize-none transition-all"
                    placeholder="หมายเหตุ (ไม่บังคับ)" />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  {commentMode === 'reject' ? 'เหตุผลการปฏิเสธ (Required)' : 'ข้อความ (Message)'}
                </label>
                <textarea rows="4" value={commentText} onChange={(e) => setCommentText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-700 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 resize-none transition-all"
                  placeholder={commentMode === 'reject' ? "ระบุเหตุผลที่ไม่สามารถรับเคสได้..." : "พิมพ์ข้อความที่ต้องการแจ้ง..."} />
              </div>
            )}

            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setCommentModalOpen(false)} className="px-6 py-3 rounded-xl text-xs font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => openConfirm({
                  title: commentMode === 'close' ? 'Confirm ปิดเคส' : commentMode === 'reject' ? 'Confirm Reject' : 'Confirm Comment',
                  message: commentMode === 'close' ? `ยืนยันการปิดเคส ${selectedTicket.req_id}?` : commentMode === 'reject' ? `ยืนยันการปฏิเสธเคส ${selectedTicket.req_id}?` : 'บันทึกข้อความลงในระบบ?',
                  confirmLabel: commentMode === 'close' ? 'ปิดเคส' : commentMode === 'reject' ? 'Reject' : 'Save Comment',
                  onConfirm: handleSaveComment
                })}
                disabled={commentMode === 'close' && (!rootCause.trim() || !solution.trim())}
                className={`px-8 py-3 rounded-xl text-xs font-bold text-white transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:pointer-events-none
                  ${commentMode === 'close' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' : commentMode === 'reject' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30'}`}
              >
                {commentMode === 'close' ? 'Submit & Close' : commentMode === 'reject' ? 'Reject Ticket' : 'Post Comment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {pendingAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={closeConfirm}></div>
          <div className="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-white/50 overflow-hidden z-[110] animate-in zoom-in-95 duration-200 p-6 text-center">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-rose-50/50">
              <AlertCircle className="w-8 h-8 text-rose-500" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">{pendingAction.title}</h3>
            <p className="text-sm font-medium text-slate-500 mb-8 px-4 leading-relaxed">{pendingAction.message}</p>

            <div className="flex gap-3 w-full">
              <button onClick={closeConfirm} className="flex-1 py-3 rounded-xl text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors">
                Cancel
              </button>
              <button onClick={executePendingAction} className="flex-1 py-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 active:scale-95 transition-all">
                {pendingAction.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Request Modal */}
      {isModalOpen && (
        <OpenTicketModal
          user={user}
          onClose={() => setIsModalOpen(false)}
          onSubmit={async (payload) => {
            try {
              await ticketAPI.createTicket(payload);
              showNotification('Request submitted successfully!', 'success');
              setIsModalOpen(false);
              fetchRequests();
            } catch (error) {
              showNotification('Failed to submit request', 'error');
            }
          }}
        />
      )}
    </div>
  );
}