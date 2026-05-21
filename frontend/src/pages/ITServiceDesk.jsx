import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Computer, LogOut } from 'lucide-react';
import { ticketAPI } from '../utils/apiClient';

// --- Inline SVG Icons (Expanded for Modern UI) ---
const IconMonitor = ({ className = "w-6 h-6" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>;
const IconLayoutDashboard = ({ className = "w-6 h-6" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>;
const IconSettings = ({ className = "w-6 h-6" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconPlus = ({ className = "w-6 h-6" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>;
const IconClock = ({ className = "w-6 h-6" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconCheckCircle = ({ className = "w-6 h-6" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconMapPin = ({ className = "w-6 h-6" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
const IconX = ({ className = "w-6 h-6" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>;
const IconUser = ({ className = "w-6 h-6" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconSearch = ({ className = "w-6 h-6" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const IconChevronRight = ({ className = "w-6 h-6" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m9 18 6-6-6-6"/></svg>;
const IconPaperclip = ({ className = "w-6 h-6" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>;
const IconAlertCircle = ({ className = "w-6 h-6" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>;
const IconLaptop = ({ className = "w-6 h-6" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/></svg>;
const IconWrench = ({ className = "w-6 h-6" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>;

export default function ITServiceDesk() {
  const { user, logout } = useAuth();
  
  const [requests, setRequests] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null); // For Drawer (Slide-over)
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentMode, setCommentMode] = useState('comment');
  const [pendingAction, setPendingAction] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [currentView, setCurrentView] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    requestType: 'Hardware Setup', projectName: '', targetDate: '', deviceType: 'Notebook (Windows)', deviceCount: 1, location: '', priority: 'Normal', requirements: ''
  });

  // Check if user is IT Staff (CC 7510)
  const isITStaff = user?.cost_center === '7510';

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
        device_count: parseInt(formData.deviceCount, 10) || 1, // Fixed type for mssql
        location: formData.location,
        priority: formData.priority,
        target_date: formData.targetDate || new Date().toISOString().split('T')[0],
        notes: formData.requirements
      };

      await ticketAPI.createTicket(ticketPayload);
      
      showNotification('Request submitted successfully!', 'success');
      setIsModalOpen(false);
      setFormData({ requestType: 'Hardware Setup', projectName: '', targetDate: '', deviceType: 'Notebook (Windows)', deviceCount: 1, location: '', priority: 'Normal', requirements: '' });
      
      // Refresh the list with actual data from DB
      fetchRequests();
    } catch (error) {
      console.error('Submit error:', error);
      showNotification('Failed to submit request to database', 'error');
    }
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openConfirm = ({ title, message, confirmLabel = 'Confirm', onConfirm }) => {
    setPendingAction({ title, message, confirmLabel, onConfirm });
  };

  const closeConfirm = () => setPendingAction(null);

  const executePendingAction = async () => {
    if (!pendingAction?.onConfirm) return;
    try {
      await pendingAction.onConfirm();
    } catch (error) {
      console.error(error);
      showNotification('ไม่สามารถดำเนินการได้', 'error');
    } finally {
      closeConfirm();
    }
  };

  const fetchTicketDetails = async (ticketId) => {
    setIsDetailLoading(true);
    try {
      const response = await ticketAPI.getTicket(ticketId);
      const ticket = response.data.data || response.data;
      setSelectedTicket(ticket);
    } catch (error) {
      console.error('Fetch detail error:', error);
      showNotification('Failed to load ticket details', 'error');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleSaveComment = async () => {
    if (!commentText.trim()) {
      showNotification('Please enter a comment before saving.', 'error');
      return;
    }

    const updatePayload = commentMode === 'reject'
      ? { status: 'Rejected', comment: commentText }
      : { comment: commentText };

    try {
      await ticketAPI.updateTicket(selectedTicket.id, updatePayload);
      showNotification(commentMode === 'reject' ? 'Ticket rejected with reason' : 'Comment added', 'success');
      setCommentModalOpen(false);
      setCommentText('');
      setCommentMode('comment');
      await fetchTicketDetails(selectedTicket.id);
      fetchRequests();
    } catch (err) {
      console.error(err);
      showNotification('Failed to save comment', 'error');
    }
  };

  const openCommentModal = (mode = 'comment') => {
    setCommentMode(mode);
    setCommentText('');
    setCommentModalOpen(true);
  };

  const handleAcceptTicket = async () => {
    try {
      await ticketAPI.updateTicket(selectedTicket.id, {
        status: 'In Progress',
        empCode_assigned: user?.empcode,
        notes: (selectedTicket.notes || '') + `\n\n[Action] รับเคสโดย ${user?.name || 'IT Staff'}`
      });
      showNotification('รับเคสเรียบร้อย', 'success');
      setSelectedTicket(null);
      fetchRequests();
    } catch (err) {
      console.error(err);
      showNotification('ไม่สามารถรับเคสได้', 'error');
    }
  };

  const handleCompleteTicket = async () => {
    try {
      await ticketAPI.updateTicket(selectedTicket.id, {
        status: 'Completed',
        notes: (selectedTicket.notes || '') + `\n\n[Action] ปิดเคสโดย ${user?.name || 'IT Admin'}`
      });
      showNotification('ปิดเคสสำเร็จ', 'success');
      setSelectedTicket(null);
      fetchRequests();
    } catch (err) {
      console.error(err);
      showNotification('ไม่สามารถปิดเคสได้', 'error');
    }
  };

  const handleDeleteTicket = async () => {
    try {
      await ticketAPI.deleteTicket(selectedTicket.id);
      showNotification('Ticket deleted', 'success');
      setSelectedTicket(null);
      fetchRequests();
    } catch (err) {
      console.error(err);
      showNotification('Failed to delete ticket', 'error');
    }
  };

  const filteredRequests = useMemo(() => {
    let result = requests;

    if (currentView === 'mine') {
      result = result.filter(r => r.empCode_created === user?.empcode);
    }

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.project_name.toLowerCase().includes(lowerQuery) || 
        r.req_id.toLowerCase().includes(lowerQuery) ||
        r.location.toLowerCase().includes(lowerQuery)
      );
    }
    return result;
  }, [requests, currentView, searchQuery, user?.empcode]);

  const stats = {
    total: filteredRequests.length,
    pending: filteredRequests.filter(r => r.status === 'Pending').length,
    completed: filteredRequests.filter(r => r.status === 'Completed').length,
    rejected: filteredRequests.filter(r => r.status === 'Rejected').length,
  };

  const getPriorityStyle = (priority) => {
    switch(priority) {
      case 'Critical': return 'text-red-700 bg-red-50 border-red-200';
      case 'High': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'Medium': return 'text-blue-700 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusStyle = (status) => {
    switch(status) {
      case 'Completed': return 'text-emerald-700 bg-emerald-50 ring-emerald-600/20';
      case 'In Progress': return 'text-blue-700 bg-blue-50 ring-blue-600/20';
      case 'Rejected': return 'text-red-700 bg-red-50 ring-red-600/20';
      default: return 'text-amber-700 bg-amber-50 ring-amber-600/20';
    }
  };

  const getRequestTypeIcon = (type) => {
    switch(type) {
      case 'Hardware Setup': return <IconMonitor className="w-4 h-4 text-indigo-500" />;
      case 'Software Install': return <IconLaptop className="w-4 h-4 text-emerald-500" />;
      case 'Relocation (Move)': return <IconMapPin className="w-4 h-4 text-amber-500" />;
      case 'Hardware Repair': return <IconWrench className="w-4 h-4 text-red-500" />;
      case 'Network & Printer': return <IconPaperclip className="w-4 h-4 text-blue-500" />;
      default: return <IconLayoutDashboard className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex relative overflow-hidden">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[70] px-6 py-3 rounded-xl shadow-xl font-medium flex items-center gap-2 transform transition-all duration-300 animate-in slide-in-from-top-5 ${
          notification.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'
        }`}>
          {notification.type === 'error' ? <IconAlertCircle className="w-5 h-5"/> : <IconCheckCircle className="w-5 h-5"/>}
          {notification.message}
        </div>
      )}

      {/* Modern Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 p-6 hidden md:flex flex-col z-10">
        <div className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-2 tracking-tight">
          <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
            <Computer className="w-6 h-6" />
          </div>
          IT Help Desk
        </div>

        {/* User Card */}
        <div className="mb-8 p-4 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center text-center gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center border border-slate-200">
            {user?.empPic ? (
              <img src={user.empPic} alt={user?.name || 'User'} className="w-full h-full object-cover" />
            ) : (
              <span className="text-indigo-700 font-bold text-2xl">{user?.name?.charAt(0) || 'U'}</span>
            )}
          </div>
          <div className="text-sm w-full">
            <p className="text-slate-900 font-semibold truncate">{user?.name || 'User'}</p>
            <p className="text-slate-500 text-xs mt-1 break-words">{user?.email || 'No email'}</p>
            <p className="text-slate-500 text-xs mt-2">{user?.sect_long || user?.sect || 'No department'}</p>
            <p className="text-slate-400 text-xs mt-1">CC: {user?.cost_center || 'N/A'}</p>
            <p className="text-slate-400 text-xs mt-1">{isITStaff ? '👨‍💻 IT Admin' : '👤 User'}</p>
          </div>
        </div>

        <nav className="space-y-1.5 flex-1">
          <button 
            onClick={() => setCurrentView('all')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition font-medium text-sm ${currentView === 'all' ? 'text-indigo-700 bg-indigo-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
          >
            <IconLayoutDashboard className="w-5 h-5" /> All Tickets
          </button>
          <button 
            onClick={() => setCurrentView('mine')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition font-medium text-sm ${currentView === 'mine' ? 'text-indigo-700 bg-indigo-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
          >
            <IconUser className="w-5 h-5" /> My Tickets
          </button>
        </nav>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 p-3 rounded-xl text-red-600 hover:bg-red-50 transition font-medium text-sm mt-auto"
        >
          <LogOut className="w-5 h-5" /> Logout
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Modern Header area with Search */}
        <header className="px-8 py-6 border-b border-slate-200 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {currentView === 'all' ? 'All IT Requests' : 'My IT Requests'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">{isITStaff && currentView === 'all' ? 'IT Staff - View all requests' : 'Showing your submitted tickets'}</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
            <div className="inline-flex rounded-full bg-slate-100 p-1">
              <button
                onClick={() => setCurrentView('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${currentView === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
              >
                All Tickets
              </button>
              <button
                onClick={() => setCurrentView('mine')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${currentView === 'mine' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
              >
                My Tickets
              </button>
            </div>
            <div className="relative w-full sm:w-64">
              <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search requests..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-full font-medium text-sm transition-all shadow-sm hover:shadow-md shrink-0 whitespace-nowrap"
            >
              <IconPlus className="w-4 h-4" /> Open Ticket
            </button>
          </div>
        </header>

        {/* Scrollable Dashboard Body */}
        <div className="flex-1 overflow-y-auto p-8">
          
          {/* Stats Cards - Modern minimal style */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Total Requests</p>
                <h3 className="text-3xl font-bold text-slate-900">{isLoading ? '-' : stats.total}</h3>
              </div>
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-600"><IconLayoutDashboard className="w-6 h-6" /></div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">In Queue</p>
                <h3 className="text-3xl font-bold text-slate-900">{isLoading ? '-' : stats.pending}</h3>
              </div>
              <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600"><IconClock className="w-6 h-6" /></div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Completed</p>
                <h3 className="text-3xl font-bold text-slate-900">{isLoading ? '-' : stats.completed}</h3>
              </div>
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600"><IconCheckCircle className="w-6 h-6" /></div>
            </div>
          </div>

          {/* Interactive Data List (Modern Table Alternative) */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
              <h2 className="text-base font-semibold text-slate-800">Recent Activity</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {isLoading ? (
                <div className="p-8 text-center text-slate-500">Loading data...</div>
              ) : filteredRequests.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4"><IconSearch className="w-8 h-8 text-slate-300" /></div>
                  <p className="text-slate-600 font-medium">No requests found</p>
                  <p className="text-slate-400 text-sm mt-1">Try adjusting your search or filters.</p>
                </div>
              ) : (
                filteredRequests.map((req) => (
                  <div 
                    key={req.id} 
                    onClick={() => fetchTicketDetails(req.id)}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition cursor-pointer group"
                  >
                    <div className="flex gap-4 items-start">
                      <div className="mt-1">
                         <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getPriorityStyle(req.priority)}`}>
                            {req.priority}
                         </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-slate-500">{req.req_id}</span>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            {getRequestTypeIcon(req.request_type)}
                            {req.request_type}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${getStatusStyle(req.status)}`}>
                            {req.status}
                          </span>
                        </div>
                        <h4 className="text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{req.project_name}</h4>
                        <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-500">
                          <span className="flex items-center gap-1"><IconUser className="w-4 h-4 text-slate-400" /> {req.requester_name}</span>
                          <span className="flex items-center gap-1"><IconMapPin className="w-4 h-4 text-slate-400" /> {req.location}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-48 shrink-0">
                      <div className="text-right">
                        <p className="text-sm text-slate-900 font-medium">{req.device_count}x {req.device_type}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Due: {req.target_date}</p>
                      </div>
                      <IconChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* --- SLIDE-OVER DRAWER (TICKET DETAILS) --- */}
      {selectedTicket && (
        <>
          <div className="fixed inset-0 bg-slate-900/30 z-40 transition-opacity" onClick={() => setSelectedTicket(null)}></div>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl z-50 flex flex-col max-h-[90vh] overflow-hidden border border-slate-200 animate-in zoom-in-95">
            
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-slate-500">{selectedTicket.req_id}</p>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                    {getRequestTypeIcon(selectedTicket.request_type)}
                    {selectedTicket.request_type}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 leading-tight">{selectedTicket.project_name}</h2>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-slate-200 rounded-full transition text-slate-500">
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Status & Priority */}
              <div className="flex gap-4">
                <div className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-1">Status</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ring-1 ring-inset ${getStatusStyle(selectedTicket.status)}`}>
                    {selectedTicket.status}
                  </span>
                </div>
                <div className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-1">Priority</p>
                  <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${getPriorityStyle(selectedTicket.priority)}`}>
                    {selectedTicket.priority}
                  </span>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-y-6 gap-x-4 text-sm">
                <div>
                  <p className="text-slate-500 mb-1 flex items-center gap-1.5"><IconUser className="w-4 h-4"/> Requester</p>
                  <p className="font-medium text-slate-900">{selectedTicket.requester_name}</p>
                  <p className="text-xs text-slate-500">CC: {selectedTicket.cost_center}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1 flex items-center gap-1.5"><IconLaptop className="w-4 h-4"/> Equipment</p>
                  <p className="font-medium text-slate-900">{selectedTicket.device_count}x {selectedTicket.device_type}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-500 mb-1 flex items-center gap-1.5"><IconMapPin className="w-4 h-4"/> Location</p>
                  <p className="font-medium text-slate-900">{selectedTicket.location}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-500 mb-1 flex items-center gap-1.5"><IconClock className="w-4 h-4"/> Target Date</p>
                  <p className="font-medium text-slate-900">{new Date(selectedTicket.target_date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <p className="text-sm text-slate-500 mb-2 font-medium">Requirements & Notes</p>
                <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-700 leading-relaxed border border-slate-100">
                  {selectedTicket.notes || 'No additional notes provided.'}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-slate-900 font-bold">Comments</p>
                  <button onClick={() => { setCommentModalOpen(true); setCommentText(''); }} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Add Comment</button>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 text-sm text-slate-700">
                  {selectedTicket.comments && selectedTicket.comments.length > 0 ? (
                    <div className="space-y-4">
                      {selectedTicket.comments.map((commentItem) => (
                        <div key={commentItem.id} className="rounded-2xl border border-slate-100 p-4 bg-slate-50">
                          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                            <span>{commentItem.empCode}</span>
                            <span>{new Date(commentItem.created_at).toLocaleString('en-GB')}</span>
                          </div>
                          <p className="text-slate-700 whitespace-pre-line">{commentItem.comment}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500">No comments yet. Click Add Comment to reply to the requester.</p>
                  )}
                </div>
              </div>

              {/* Timeline (Modern Feature) */}
              <div className="pt-6 border-t border-slate-100">
                <p className="text-sm text-slate-900 mb-4 font-bold">Request Timeline</p>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    {
                      title: 'Ticket Opened',
                      active: true,
                      description: new Date(selectedTicket.created_at).toLocaleString('en-GB'),
                      color: 'bg-slate-300 text-slate-900'
                    },
                    {
                      title: 'Assigned to IT Staff',
                      active: selectedTicket.status !== 'Pending',
                      description: selectedTicket.status !== 'Pending' ? 'Ticket has been assigned' : 'Waiting for IT to accept',
                      color: selectedTicket.status !== 'Pending' ? 'bg-indigo-500 text-white' : 'bg-amber-100 text-amber-700'
                    },
                    {
                      title: 'In Progress',
                      active: selectedTicket.status === 'In Progress' || selectedTicket.status === 'Completed',
                      description: selectedTicket.status === 'In Progress' ? 'IT is working on this ticket' : selectedTicket.status === 'Completed' ? 'Work completed' : 'Still pending',
                      color: selectedTicket.status === 'In Progress' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
                    },
                    {
                      title: selectedTicket.status === 'Rejected' ? 'Rejected' : 'Completed',
                      active: selectedTicket.status === 'Completed' || selectedTicket.status === 'Rejected',
                      description: selectedTicket.status === 'Completed' ? 'Ticket has been completed' : selectedTicket.status === 'Rejected' ? 'Ticket has been rejected' : 'Not finished yet',
                      color: selectedTicket.status === 'Completed' ? 'bg-emerald-500 text-white' : selectedTicket.status === 'Rejected' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500'
                    }
                  ].map((step) => (
                    <div key={step.title} className="relative pl-6">
                      <span className={`absolute -left-[9px] top-2 w-4 h-4 rounded-full ring-4 ring-white ${step.active ? step.color : 'bg-slate-200'}`}></span>
                      <p className={`text-sm font-semibold ${step.active ? 'text-slate-900' : 'text-slate-500'}`}>{step.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{step.description}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
            
            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 grid gap-3 sm:grid-cols-3">
              <button onClick={() => openCommentModal('comment')} className="w-full py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-50 transition">
                Add Comment
              </button>
              {isITStaff && selectedTicket?.status !== 'Completed' && selectedTicket?.status !== 'Rejected' && (
                <button onClick={() => openCommentModal('reject')} className="w-full py-2.5 bg-rose-600 text-white rounded-lg font-medium text-sm hover:bg-rose-700 transition">
                  Reject Ticket
                </button>
              )}
              {isITStaff && selectedTicket?.status === 'Pending' && (
                <button onClick={() => openConfirm({
                  title: 'Confirm รับเคส',
                  message: `คุณแน่ใจว่าจะรับเคส ${selectedTicket.req_id} นี้หรือไม่? การดำเนินการนี้จะเปลี่ยนสถานะเป็น "กำลังดำเนินการ".`,
                  confirmLabel: 'รับเคส',
                  onConfirm: handleAcceptTicket
                })} className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition">
                  รับเคส
                </button>
              )}
              {isITStaff && selectedTicket?.status === 'In Progress' && (
                <button onClick={() => openConfirm({
                  title: 'Confirm ปิดเคส',
                  message: `คุณแน่ใจว่าจะปิดเคส ${selectedTicket.req_id} นี้หรือไม่? การดำเนินการนี้จะเปลี่ยนสถานะเป็น "ปิดเคส".`,
                  confirmLabel: 'ปิดเคส',
                  onConfirm: handleCompleteTicket
                })} className="w-full py-2.5 bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-emerald-700 transition">
                  ปิดเคส
                </button>
              )}
              {(isITStaff || selectedTicket?.empCode_created === user?.empcode) && (
                <button onClick={() => openConfirm({
                  title: 'Confirm ลบเคส',
                  message: `คุณแน่ใจว่าจะลบเคส ${selectedTicket.req_id} นี้หรือไม่? การลบจะไม่สามารถกู้คืนได้.`,
                  confirmLabel: 'ลบเคส',
                  onConfirm: handleDeleteTicket
                })} className="w-full py-2.5 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 transition">
                  Delete Ticket
                </button>
              )}
            </div>
          </div>
        </div>
        </>
      )}

      {/* Comment Modal */}
      {commentModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setCommentModalOpen(false)}></div>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl z-[90] p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">
                {commentMode === 'reject' ? 'Reject Ticket' : 'Add Comment'} to {selectedTicket.req_id}
              </h3>
              <button onClick={() => setCommentModalOpen(false)} className="text-slate-400 hover:text-slate-700"><IconX className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-slate-500 mb-3">
              {commentMode === 'reject'
                ? 'กรุณาระบุเหตุผลในการปฏิเสธเคสนี้อย่างสั้น ๆ ก่อนยืนยัน'
                : 'Write a comment for the requester. Comments are stored separately from ticket details.'}
            </p>
            <textarea rows="4" value={commentText} onChange={(e) => setCommentText(e.target.value)} className="w-full border border-slate-200 rounded-lg p-3 mb-4" placeholder={commentMode === 'reject' ? 'Enter rejection reason...' : 'Write your comment...'}></textarea>
            <div className="flex justify-end gap-3">
              <button onClick={() => setCommentModalOpen(false)} className="px-4 py-2 rounded-lg">Cancel</button>
              <button onClick={() => openConfirm({
                title: commentMode === 'reject' ? 'Confirm reject ticket' : 'Confirm submit comment',
                message: commentMode === 'reject'
                  ? `คุณต้องการปฏิเสธเคส ${selectedTicket.req_id} โดยใช้เหตุผลนี้หรือไม่?`
                  : `คุณต้องการบันทึกคอมเม้นท์สำหรับ ${selectedTicket.req_id} หรือไม่?`,
                confirmLabel: commentMode === 'reject' ? 'Reject Ticket' : 'Save Comment',
                onConfirm: handleSaveComment
              })} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
                {commentMode === 'reject' ? 'Reject Ticket' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingAction && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={closeConfirm}></div>
          <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden z-[100]">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-amber-100 text-amber-700"><IconAlertCircle className="w-6 h-6" /></span>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{pendingAction.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{pendingAction.message}</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
              <button onClick={closeConfirm} className="px-4 py-2 rounded-lg text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition">Cancel</button>
              <button onClick={executePendingAction} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition">{pendingAction.confirmLabel}</button>
            </div>
          </div>
        </div>
      )}

      {/* --- NEW REQUEST MODAL (ENHANCED Form) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-full animate-in zoom-in-95 duration-200">
            
            <div className="px-6 py-5 border-b border-slate-100 bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">New IT Service Request</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Please provide details so we can assist you promptly.</p>
                </div>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition bg-slate-50 hover:bg-slate-100 p-2 rounded-full">
                  <IconX className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Requester</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{user?.name || 'Unknown User'}</p>
                  <p className="text-xs text-slate-500 mt-1">{user?.email || 'No email'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Department</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{user?.sect_long || user?.sect || 'No department'}</p>
                  <p className="text-xs text-slate-500 mt-1">CC: {user?.cost_center || 'N/A'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-center">
                  {user?.empPic ? (
                    <img src={user.empPic} alt={user?.name || 'User'} className="h-20 w-20 rounded-full object-cover" />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">No Photo</div>
                  )}
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
              
              {/* Section 1: General Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs">1</span> 
                  Request Details
                </h3>
                
                {/* NEW: Category Selector */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">What do you need help with? <span className="text-red-500">*</span></label>
                  <select name="requestType" value={formData.requestType} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all appearance-none cursor-pointer">
                    <option value="Hardware Setup">🖥️ Hardware: ตั้งค่าใหม่ / ติดตั้ง</option>
                    <option value="Relocation (Move)">📦 Hardware: ย้าย / ปรับปรุง</option>
                    <option value="Hardware Repair">🔧 Hardware: ซ่อม / แทนที่</option>
                    <option value="Software Install">💿 Software: ติดตั้ง / อัปเดต / License</option>
                    <option value="Network & Printer">🖨️ Network & Printer ติดตั้ง / แก้ไข</option>
                    <option value="Account & Access">🔑 Account Access / VPN / Shared Drive</option>
                    <option value="Other">❓ Other Services</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject / Problem <span className="text-red-500">*</span></label>
                    <input type="text" name="projectName" value={formData.projectName} onChange={handleInputChange} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all" placeholder="e.g. คอมพิวเตอร์ใช้งานไม่ได้, ปริ้นเตอร์ไม่ทำงาน" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Location / Desk Number <span className="text-red-500">*</span></label>
                    <input type="text" name="location" value={formData.location} onChange={handleInputChange} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all" placeholder="e.g. Building 1, Floor 3, Desk A12" />
                  </div>
                </div>
              </div>

              {/* Section 2: Technical Specs */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs">2</span> 
                  Hardware Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Device Type</label>
                    <select name="deviceType" value={formData.deviceType} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all appearance-none cursor-pointer">
                      <option>Notebook (Windows)</option>
                      <option>Desktop Workstation</option>
                      <option>Monitor / Accessories Only</option>
                      <option>Printer / Scanner</option>
                      <option>Server / Network Gear</option>
                      <option>Not Applicable (N/A)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Quantity</label>
                    <input type="number" name="deviceCount" value={formData.deviceCount} onChange={handleInputChange} min="1" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all" />
                  </div>
                </div>
              </div>

              {/* Section 3: Priority & Schedule */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs">3</span> 
                  Scheduling & Priority
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Urgency Level</label>
                    <div className="flex gap-3">
                      {['Normal', 'Medium', 'High', 'Critical'].map(level => (
                        <label key={level} className={`flex-1 cursor-pointer text-center px-2 py-2 border rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${formData.priority === level ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                          <input type="radio" name="priority" value={level} checked={formData.priority === level} onChange={handleInputChange} className="hidden" />
                          {level}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Target Completion Date</label>
                    <input type="date" name="targetDate" value={formData.targetDate} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all" />
                  </div>
                </div>
              </div>

              {/* Extra Info */}
              <div className="pt-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Specific Requirements & Notes</label>
                <textarea rows="2" name="requirements" value={formData.requirements} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all resize-none" placeholder="Software needed, network requirements, etc."></textarea>
              </div>
              
              {/* Fake Attachment UI for modern feel */}
              <div className="border border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center text-slate-500 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition">
                <IconPaperclip className="w-6 h-6 mb-2 text-slate-400" />
                <p className="text-sm font-medium">Click to upload floor plans or reference images</p>
                <p className="text-xs mt-1">SVG, PNG, JPG or PDF (max. 5MB)</p>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-full font-medium text-slate-600 hover:bg-slate-100 transition">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-medium transition-all shadow-md shadow-indigo-200 active:scale-95">
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}