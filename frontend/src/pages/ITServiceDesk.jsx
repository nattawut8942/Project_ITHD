import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { ticketAPI } from '../utils/apiClient';
import { format } from 'date-fns';
import * as signalR from '@microsoft/signalr';
import Sidebar from '../components/Sidebar';
import {
  Search, Filter, Plus, Clock, CheckCircle,
  AlertCircle, X, MessageSquare, Monitor, FileText,
  User, LayoutDashboard, Settings, MapPin, LoaderCircle, Loader,
  Paperclip, Wrench, Laptop, Briefcase, Calendar, Info,
  ChevronRight, ArrowRight, Grid, List, AlertTriangle, Ticket,
  Inbox, Sparkles
} from 'lucide-react';
import { getDeviceTypeColor, getColorGradient, getRequestTypeIcon, formatDateShort, formatThaiDateTime, getStatusStyle, getStatusLabel as displayStatusLabel } from '../utils/styleHelpers';
import StatusBadge from '../components/StatusBadge';
import OpenTicketModal from '../components/OpenTicketModal';
import TicketDetailModal from '../components/TicketDetailModal';
import ConfirmModal from '../components/ConfirmModal';
import ToastNotification from '../components/ToastNotification';
import MobileNavbar from '../components/MobileNavbar';
import { API_BASE } from '../config/api';

// ✅ Safety checklist ที่ IT ต้องยืนยันก่อนปิดเคส (ต้องครบทั้ง 3 ข้อ)
const SAFETY_CHECK_ITEMS = [
  { key: 'plug', label: 'ปลั๊กไฟ OK', hint: 'ปลั๊ก/เต้ารับไม่ชำรุด เสียบแน่น ไม่มีรอยไหม้' },
  { key: 'cable', label: 'สายไฟ OK', hint: 'สายไฟไม่ชำรุด ไม่มีรอยฉีกขาด จัดเก็บเรียบร้อย' },
  { key: 'area', label: 'พื้นที่ปฏิบัติงาน OK', hint: 'เก็บอุปกรณ์/เครื่องมือ พื้นที่สะอาดปลอดภัย' },
];
import { useLocation, useNavigate } from 'react-router-dom';

const STOCK_HOST = 'http://dciweb.dci.daikin.co.jp:3002';

const Chip = ({ label, onRemove }) => (
  <span className="flex items-center gap-1.5 bg-paper text-ink-soft border border-line px-2 py-1 rounded-lg text-xs font-semibold">
    {label}
    <button onClick={onRemove} className="text-muted hover:text-rose-500 transition-colors">×</button>
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

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [liveStatus, setLiveStatus] = useState('connecting');

  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterSubtype, setFilterSubtype] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  const [rootCause, setRootCause] = useState('');
  const [solution, setSolution] = useState('');
  // Safety checklist - ต้องติ๊กครบทั้ง 3 ข้อก่อนปิดเคส
  const [safetyChecks, setSafetyChecks] = useState({ plug: false, cable: false, area: false });
  const allSafetyChecked = safetyChecks.plug && safetyChecks.cable && safetyChecks.area;
  const [holdReason, setHoldReason] = useState('');
  const [expectedAt, setExpectedAt] = useState('');

  const [ticketHistory, setTicketHistory] = useState([]);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const [mobileOpen, setMobileOpen] = useState(false);

  const [layoutMode, setLayoutMode] = useState('list');

  const [formData, setFormData] = useState({
    requestType: 'Hardware Setup', projectName: '', targetDate: '', deviceType: 'Notebook (Windows)', deviceCount: 1, location: '', priority: 'Normal', requirements: ''
  });

  const isITStaff = ['admin', 'it_staff'].includes(user?.role);

  const formatElapsedTime = (start, end, holdAt = null, resumedAt = null) => {
    if (!start || !end) return '-';
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return '-';
    let diffMs = endDate - startDate;
    if (diffMs <= 0) return '-';
    if (holdAt && resumedAt) {
      const holdMs = new Date(resumedAt) - new Date(holdAt);
      if (holdMs > 0) diffMs -= holdMs;
    }
    const totalMinutes = Math.floor(diffMs / 60000);
    if (totalMinutes <= 0) return '0 นาที';
    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}.${String(minutes).padStart(2, '0')} ชั่วโมง`;
    }
    return `${totalMinutes} นาที`;
  };

  const getElapsedStyle = (start, end, holdAt = null, resumedAt = null) => {
    if (!start || !end) return 'text-emerald-600 font-semibold';
    let diffMs = new Date(end) - new Date(start);
    if (holdAt && resumedAt) {
      const holdMs = new Date(resumedAt) - new Date(holdAt);
      if (holdMs > 0) diffMs -= holdMs;
    }
    const minutes = Math.floor(diffMs / 60000);
    if (minutes <= 30) return 'text-emerald-600 font-semibold';
    if (minutes <= 60) return 'text-amber-600 font-semibold';
    if (minutes >= 60) return 'text-red-600 font-semibold';
    return 'text-rose-600 font-semibold';
  };

  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const historyStartDateRef = useRef('');
  const historyEndDateRef = useRef('');
  useEffect(() => { historyStartDateRef.current = historyStartDate; }, [historyStartDate]);
  useEffect(() => { historyEndDateRef.current = historyEndDate; }, [historyEndDate]);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (historyStartDateRef.current) params.startDate = historyStartDateRef.current;
      if (historyEndDateRef.current) params.endDate = historyEndDateRef.current;
      const response = await ticketAPI.getTickets(params);
      const tickets = response.data.data || response.data;
      setRequests(Array.isArray(tickets) ? tickets : []);
      setLastSyncedAt(new Date());
    } catch (error) {
      console.error('Fetch error:', error);
      showNotification('Failed to load requests from database', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const isFirstHistoryRender = useRef(true);
  useEffect(() => {
    if (isFirstHistoryRender.current) {
      isFirstHistoryRender.current = false;
      return;
    }
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyStartDate, historyEndDate]);

  useEffect(() => {
    fetchRequests();

    const hubUrl = API_BASE.replace('/api', '') + '/hubs/tickets';
    const token = localStorage.getItem('authToken');

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .build();

    connection.onreconnecting(() => setLiveStatus('connecting'));
    connection.onreconnected(() => setLiveStatus('online'));
    connection.onclose(() => setLiveStatus('offline'));

    connection.on('TicketsUpdated', () => {
      fetchRequests();
    });

    connection.start()
      .then(() => setLiveStatus('online'))
      .catch(err => {
        setLiveStatus('offline');
        console.error('SignalR connect error:', err);
      });

    return () => { connection.stop(); };
  }, []);

  useEffect(() => {
    if (selectedTicket) fetchTicketHistory(selectedTicket.id);
    else { setTicketHistory([]); setCommentText(''); }
  }, [selectedTicket]);

  useEffect(() => {
    if (!location.state?.openModal) return;
    setIsModalOpen(true);
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [location.pathname, location.search, location.state?.openModal, navigate]);

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
        requestType: formData.requestType,    // จาก request_type
        projectName: formData.projectName,    // จาก project_name
        deviceType: formData.deviceType,      // จาก device_type
        deviceCount: parseInt(formData.deviceCount, 10) || 1, // จาก device_count
        location: formData.location,
        priority: formData.priority,
        targetDate: formData.targetDate || new Date().toISOString().split('T')[0], // จาก target_date
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
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const isProcessingRef = useRef(false);
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const isSubmittingRef = useRef(false);

  const [selectedStockItems, setSelectedStockItems] = useState([]);
  const [assetPickerProduct, setAssetPickerProduct] = useState(null);
  const [assetSerialInput, setAssetSerialInput] = useState('');
  const [assetCodeInput, setAssetCodeInput] = useState('');

  const [stockPickerOpen, setStockPickerOpen] = useState(false);
  const [stockPickerStep, setStockPickerStep] = useState('type');
  const [stockDeviceTypes, setStockDeviceTypes] = useState([]);
  const [isLoadingDeviceTypes, setIsLoadingDeviceTypes] = useState(false);
  const [selectedDeviceType, setSelectedDeviceType] = useState(null);
  const [stockProductsForType, setStockProductsForType] = useState([]);
  const [isLoadingStockProducts, setIsLoadingStockProducts] = useState(false);
  const [productSearchInModal, setProductSearchInModal] = useState('');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const globalSearchTimer = useRef(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const searchAllProducts = (query) => {
    setGlobalSearchQuery(query);
    if (globalSearchTimer.current) clearTimeout(globalSearchTimer.current);
    if (!query.trim()) { setGlobalSearchResults([]); return; }
    globalSearchTimer.current = setTimeout(async () => {
      setIsSearchingGlobal(true);
      try {
        const res = await ticketAPI.searchStockProducts(query.trim());
        setGlobalSearchResults(res.data.data || []);
      } catch (err) {
        console.error('Global stock search failed:', err);
      } finally {
        setIsSearchingGlobal(false);
      }
    }, 300);
  };

  const openStockPicker = async () => {
    setStockPickerOpen(true);
    setStockPickerStep('type');
    setProductSearchInModal('');
    setGlobalSearchQuery('');
    setGlobalSearchResults([]);
    if (stockDeviceTypes.length === 0) {
      setIsLoadingDeviceTypes(true);
      try {
        const res = await ticketAPI.getStockDeviceTypes();
        setStockDeviceTypes(res.data.data || []);
      } catch (err) {
        console.error('Failed to load device types:', err);
        showNotification('โหลดประเภทอุปกรณ์ไม่สำเร็จ', 'error');
      } finally {
        setIsLoadingDeviceTypes(false);
      }
    }
  };

  const closeStockPicker = () => {
    setStockPickerOpen(false);
    setStockPickerStep('type');
    setSelectedDeviceType(null);
    setStockProductsForType([]);
    setProductSearchInModal('');
    setGlobalSearchQuery('');
    setGlobalSearchResults([]);
  };

  const selectDeviceType = async (type) => {
    setSelectedDeviceType(type);
    setStockPickerStep('products');
    setIsLoadingStockProducts(true);
    try {
      const res = await ticketAPI.searchStockProducts(undefined, type.TypeId);
      setStockProductsForType(res.data.data || []);
    } catch (err) {
      console.error('Failed to load products:', err);
      showNotification('โหลดรายการอุปกรณ์ไม่สำเร็จ', 'error');
    } finally {
      setIsLoadingStockProducts(false);
    }
  };

  const backToTypeSelection = () => {
    setStockPickerStep('type');
    setSelectedDeviceType(null);
    setStockProductsForType([]);
    setProductSearchInModal('');
  };

  const visibleStockProducts = productSearchInModal.trim()
    ? stockProductsForType.filter(p => p.ProductName?.toLowerCase().includes(productSearchInModal.trim().toLowerCase()))
    : stockProductsForType;

  const addStockItem = (product) => {
    if (product.DeviceType === 'Asset') {
      setAssetPickerProduct(product);
      setAssetSerialInput('');
      setAssetCodeInput('');
      return;
    }
    setSelectedStockItems(prev => {
      const existing = prev.find(i => i.productId === product.ProductID);
      if (existing) {
        return prev.map(i => i.productId === product.ProductID ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { productId: product.ProductID, productName: product.ProductName, qty: 1, deviceType: product.DeviceType }];
    });
    showNotification(`เพิ่ม ${product.ProductName} แล้ว`, 'success');
  };

  const confirmAddAssetItem = () => {
    if (!assetSerialInput.trim() || !assetCodeInput.trim()) return;
    setSelectedStockItems(prev => [...prev, {
      productId: assetPickerProduct.ProductID,
      productName: assetPickerProduct.ProductName,
      qty: 1,
      deviceType: 'Asset',
      serialNumber: assetSerialInput.trim(),
      fixedAssetCode: assetCodeInput.trim()
    }]);
    setAssetPickerProduct(null); setAssetSerialInput(''); setAssetCodeInput('');
  };

  const updateStockItemQty = (productId, qty) => {
    setSelectedStockItems(prev => prev.map(i => i.productId === productId ? { ...i, qty: Math.max(1, qty) } : i));
  };

  const removeStockItem = (productId) => {
    setSelectedStockItems(prev => prev.filter(i => i.productId !== productId));
  };

  const executePendingAction = async () => {
    if (!pendingAction?.onConfirm || isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessingAction(true);
    try { await pendingAction.onConfirm(); }
    catch (error) { showNotification('ไม่สามารถดำเนินการได้', 'error'); }
    finally {
      isProcessingRef.current = false;
      setIsProcessingAction(false);
      closeConfirm();
    }
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

  useEffect(() => {
    const ticketIdFromUrl = new URLSearchParams(location.search).get('ticket');
    if (!ticketIdFromUrl) return;
    fetchTicketDetails(ticketIdFromUrl);
    const params = new URLSearchParams(location.search);
    params.delete('ticket');
    navigate({ search: params.toString() }, { replace: true });
  }, [location.search]);

  useEffect(() => {
    const ticketId = location.state?.ticketId;
    if (!ticketId) return;
    fetchTicketDetails(ticketId);
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [location.pathname, location.search, location.state?.ticketId, navigate]);

  const handleSaveComment = async () => {
    if (commentMode === 'hold' && !holdReason.trim()) {
      showNotification('กรุณาระบุเหตุผลที่ต้อง Hold', 'error');
      return;
    }
    if (commentMode === 'reject' && !commentText.trim()) {
      showNotification('กรุณาระบุเหตุผลในการปฏิเสธเคส', 'error');
      return;
    }
    if (commentMode === 'close' && !allSafetyChecked) {
      const missing = SAFETY_CHECK_ITEMS.filter(i => !safetyChecks[i.key]).map(i => i.label);
      showNotification(`กรุณาตรวจสอบความปลอดภัยให้ครบก่อนปิดเคส (${missing.join(', ')})`, 'error');
      return;
    }

    // ✅ ท่าไม้ตาย: ส่งไปทั้ง camelCase และ snake_case ดักไว้ทุกทาง!
    const updatePayload = commentMode === 'reject' ? { status: 'Rejected', comment: commentText }
      : commentMode === 'close' ? {
        status: 'Closed', 
        rootCause: rootCause,         // แบบที่ 1
        root_cause: rootCause,        // แบบที่ 2
        Solution: solution,           // แบบที่ 1
        solution: solution,           // แบบที่ 2
        comment: commentText || undefined,
        stockItems: selectedStockItems.length > 0 ? selectedStockItems : undefined,
        stock_items: selectedStockItems.length > 0 ? selectedStockItems : undefined,
        // ✅ Safety checklist (ส่งทั้ง camelCase และ snake_case เหมือนฟิลด์อื่น)
        safetyPlugOk: safetyChecks.plug,
        safety_plug_ok: safetyChecks.plug,
        safetyCableOk: safetyChecks.cable,
        safety_cable_ok: safetyChecks.cable,
        safetyAreaOk: safetyChecks.area,
        safety_area_ok: safetyChecks.area
      }
      : commentMode === 'hold' ? { 
        status: 'On Hold', 
        holdReason: holdReason,       // แบบที่ 1
        hold_reason: holdReason,      // แบบที่ 2
        expectedAt: expectedAt || null, 
        expected_at: expectedAt || null 
      }
      : { comment: commentText };

    try {
      await ticketAPI.updateTicket(selectedTicket.id, updatePayload);
      showNotification(commentMode === 'close' ? 'ปิดเคสสำเร็จ' : commentMode === 'reject' ? 'Ticket rejected' : 'Comment added', 'success');
      setCommentModalOpen(false); setCommentText(''); setRootCause(''); setSolution(''); setHoldReason(''); setExpectedAt('');
      setSafetyChecks({ plug: false, cable: false, area: false });
      setSelectedStockItems([]); closeStockPicker();

      setCommentMode('comment'); setSelectedTicket(null); fetchRequests();
    } catch (err) {
      // 💡 จุดสังเกต: ถ้าพังอีก มันจะแจ้งข้อความ Error จาก Backend ออกมาที่หน้าจอ (Toast) 
      const msg = err.response?.data?.message || 'Failed to save';
      showNotification(msg, 'error');
      console.error("Save Comment Error:", err.response || err);
    }
  };
  const openCommentModal = (mode = 'comment') => {
    setCommentMode(mode); setCommentText(''); setCommentModalOpen(true);
    if (mode === 'close') {
      setSelectedStockItems([]); closeStockPicker();
      setSafetyChecks({ plug: false, cable: false, area: false });
    }
  };

  const handleAcceptTicket = async () => {
    try {
      // 🧹 เพิ่มการล้างข้อความ [Action] เก่าทิ้ง แบบเดียวกับ Assign
      let cleanNotes = selectedTicket.notes || '';
      cleanNotes = cleanNotes.replace(/\n\n\[Action\][\s\S]*$/, '');

      await ticketAPI.updateTicket(selectedTicket.id, {
        status: 'In Progress',
        empCodeAssigned: user?.empcode,
        empCode_assigned: user?.empcode,
        // ✅ ใช้ cleanNotes ทับลงไป
        notes: cleanNotes + `\n\n[Action] รับเคสโดย ${user?.name || 'IT Staff'}`
      });
      showNotification('รับเคสเรียบร้อย', 'success');
      setSelectedTicket(null);
      fetchRequests();
    } catch (err) {
      showNotification('ไม่สามารถรับเคสได้', 'error');
    }
  };

  const handleAssignTicket = async (empCode, { setInProgress = false, staffName = empCode } = {}) => {
    try {
      // 🧹 ล้างข้อความ [Action] เก่าทิ้ง
      let cleanNotes = selectedTicket.notes || '';
      cleanNotes = cleanNotes.replace(/\n\n\[Action\][\s\S]*$/, '');

      const payload = {
        EmpCodeAssigned: empCode,
        empCodeAssigned: empCode,
        empCode_assigned: empCode,
        emp_code_assigned: empCode,
        notes: cleanNotes + `\n\n[Action] โอนเคสให้ ${staffName}` // ✅ ใช้ staffName ที่ส่งมา
      };

      if (setInProgress) {
        payload.status = 'In Progress';
        payload.notes = cleanNotes + `\n\n[Action] มอบหมายเคสให้ ${staffName}`;
      }

      await ticketAPI.updateTicket(selectedTicket.id, payload);
      showNotification('มอบหมายเคสเรียบร้อย', 'success');
      setSelectedTicket(null);
      fetchRequests();
    } catch (err) {
      console.error("Assign Error:", err); // ใส่ไว้เผื่อดูใน Console
      const msg = err.response?.data?.message || 'ไม่สามารถมอบหมายเคสได้';
      showNotification(msg, 'error');
    }
  };



  const handleDeleteTicket = async () => {
    try {
      await ticketAPI.deleteTicket(selectedTicket.id);
      showNotification('Ticket deleted', 'success');
      setSelectedTicket(null); fetchRequests();
    } catch (err) {
      if (err.response?.status === 404) {
        showNotification('Ticket นี้ถูกลบไปแล้ว', 'info');
        setSelectedTicket(null); fetchRequests();
      } else {
        showNotification('Failed to delete ticket', 'error');
      }
    }
  };

  const handleCancelTicket = async () => {
    try {
      await ticketAPI.updateTicket(selectedTicket.id, { status: 'Cancelled', comment: 'ยกเลิกโดยผู้แจ้ง' });
      showNotification('ยกเลิก Ticket เรียบร้อย', 'success');
      setSelectedTicket(null); fetchRequests();
    } catch (err) { showNotification('ไม่สามารถยกเลิก Ticket ได้', 'error'); }
  };

  const handleResumeTicket = async () => {
    try {
      await ticketAPI.updateTicket(selectedTicket.id, {
        status: 'In Progress',
        comment: 'กลับมาดำเนินการต่อแล้ว'
      });
      showNotification('Resume เรียบร้อย', 'success');
      setSelectedTicket(null);
      fetchRequests();
    } catch (err) {
      showNotification('ไม่สามารถ Resume ได้', 'error');
    }
  };

  const handleAddHelper = async (empCode) => {
    try {
      await ticketAPI.addHelper(selectedTicket.id, empCode);
      showNotification('เพิ่ม Helper เรียบร้อย', 'success');
      fetchTicketDetails(selectedTicket.id);
    } catch (err) {
      showNotification('ไม่สามารถเพิ่ม Helper ได้', 'error');
    }
  };

  const handleRemoveHelper = async (empCode) => {
    try {
      await ticketAPI.removeHelper(selectedTicket.id, empCode);
      showNotification('ลบ Helper เรียบร้อย', 'success');
      fetchTicketDetails(selectedTicket.id);
    } catch (err) {
      showNotification('ไม่สามารถลบ Helper ได้', 'error');
    }
  };

  const filteredRequests = useMemo(() => {
    let result = requests;

    if (currentView === 'mine') result = result.filter(r => r.empCode_created === user?.empcode);
    if (currentView === 'incharge') result = result.filter(r => r.empCode_assigned === user?.empcode);

    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.toLowerCase();
      result = result.filter(r =>
        r.project_name?.toLowerCase().includes(q) ||
        r.req_id?.toLowerCase().includes(q) ||
        r.location?.toLowerCase().includes(q) ||
        r.requester_name?.toLowerCase().includes(q) ||
        r.problem_subtype_name?.toLowerCase().includes(q)
      );
    }

    if (filterStatus) result = result.filter(r => r.status === filterStatus);
    if (filterPriority) result = result.filter(r => r.priority === filterPriority);
    if (filterType) result = result.filter(r => (r.problem_type_name || r.request_type) === filterType);
    if (filterSubtype) result = result.filter(r => r.problem_subtype_name === filterSubtype);
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
  }, [requests, currentView, debouncedSearchQuery, filterStatus, filterPriority, filterType, filterSubtype, filterAssignee, filterDate, sortField, sortDir, user?.empcode]);

  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => { setCurrentPage(1); }, [filterStatus, filterPriority, filterType, filterSubtype, filterAssignee, filterDate, searchQuery, currentView]);


  const uniqueTypes = [...new Set(requests.map(r => r.problem_type_name || r.request_type).filter(Boolean))];
  const uniqueAssignees = [...new Map(requests.filter(r => r.empCode_assigned).map(r => [r.empCode_assigned, r.assigned_name || r.empCode_assigned])).entries()];
  const activeFilterCount = [filterStatus, filterPriority, filterType, filterSubtype, filterAssignee, filterDate].filter(Boolean).length;
  const uniqueSubtypes = useMemo(() => {
    const source = filterType
      ? requests.filter(r => (r.problem_type_name || r.request_type) === filterType)
      : requests;
    return [...new Set(source.map(r => r.problem_subtype_name).filter(Boolean))];
  }, [requests, filterType]);

  const matchesCurrentView = (r) => {
    if (currentView === 'mine') return r.empCode_created === user?.empcode;
    if (currentView === 'incharge') return r.empCode_assigned === user?.empcode;
    return true;
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'Normal': return 'text-ink-soft bg-paper border-line';
      case 'Medium': return 'text-amber-700 bg-amber-50 border-amber-300';
      case 'High': return 'text-orange-700 bg-orange-50 border-orange-300';
      case 'Critical': return 'text-white bg-red-600 border-red-700';
      default: return 'text-ink-soft bg-paper border-line';
    }
  };

  const getPriorityBorder = (priority) => {
    switch (priority) {
      case 'Critical': return 'border-l-red-600';
      case 'High': return 'border-l-orange-500';
      case 'Medium': return 'border-l-amber-500';
      default: return 'border-l-slate-400';
    }
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="text-slate-300 ml-1">↕</span>;
    return <span className="text-blue-500 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const greetingTime = () => {
    const h = new Date().getHours();
    if (h < 12) return 'GOOD MORNING';
    if (h < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  };

  return (
    <div className="min-h-screen bg-paper text-ink font-sans flex flex-col md:flex-row overflow-hidden">

      <ToastNotification
        message={notification?.message}
        type={notification?.type}
        onDismiss={() => setNotification(null)}
      />

      {/* Mobile Navbar */}
      <MobileNavbar user={user} onMenuClick={() => setMobileOpen(true)} />

      {/* Sidebar */}
      <Sidebar user={user} isITStaff={isITStaff} logout={logout} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Content Area - Formal Sharp Borders */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden p-0 md:p-6">
        <div className="bg-surface rounded-lg shadow-soft flex flex-col h-full overflow-hidden border border-line">

          {/* Header */}
          <header className="dash-rise px-6 py-5 border-b border-line bg-surface flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shrink-0">
            <div>
              <p className="text-xs font-semibold text-muted mb-1">{greetingTime()}</p>
              <h1 className="font-display text-2xl font-bold text-ink tracking-tight flex items-center gap-2">
                {currentView === 'all' ? 'All IT Tickets' : currentView === 'incharge' ? 'Tickets In Charge' : 'My IT Tickets'}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 text-xs font-medium text-muted">
                <span className={`w-2 h-2 rounded-full ${liveStatus === 'online' ? 'bg-teal animate-pulse' : liveStatus === 'connecting' ? 'bg-amber animate-pulse' : 'bg-rose'}`} />
                <span>{liveStatus === 'online' ? 'Live' : liveStatus === 'connecting' ? 'Connecting' : 'Offline'}</span>
                {lastSyncedAt && <span className="text-muted ml-1">• Synced {formatDateShort(lastSyncedAt)}</span>}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">

              {/* Tab Toggles - pill group */}
              <div className="flex rounded-full border border-line bg-paper p-1 gap-1">
                <button onClick={() => navigate('/?view=all')} className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${currentView === 'all' ? 'bg-ink text-white shadow-soft' : 'text-ink-soft hover:bg-surface'}`}>All Tickets</button>
                <button onClick={() => navigate('/?view=mine')} className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${currentView === 'mine' ? 'bg-ink text-white shadow-soft' : 'text-ink-soft hover:bg-surface'}`}>My Tickets</button>
                {isITStaff && (
                  <button onClick={() => navigate('/?view=incharge')} className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${currentView === 'incharge' ? 'bg-ink text-white shadow-soft' : 'text-ink-soft hover:bg-surface'}`}>In Charge</button>
                )}
              </div>

              {/* Grid / List Layout Switcher */}
              <div className="flex rounded-full border border-line bg-paper p-1 gap-1">
                <button
                  onClick={() => setLayoutMode('list')}
                  className={`p-1.5 rounded-full transition-all ${layoutMode === 'list' ? 'bg-surface text-ink shadow-soft' : 'text-muted hover:text-ink'}`}
                  title="List View"
                  aria-label="List view"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setLayoutMode('grid')}
                  className={`p-1.5 rounded-full transition-all ${layoutMode === 'grid' ? 'bg-surface text-ink shadow-soft' : 'text-muted hover:text-ink'}`}
                  title="Grid View"
                  aria-label="Grid view"
                >
                  <Grid className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full min-w-[200px] sm:w-64">
                <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text" placeholder="ค้นหาเลขที่, โครงการ, สถานที่..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-paper border border-line rounded-full text-sm text-ink-soft placeholder:text-muted focus:outline-none focus:border-ink focus:bg-surface focus:ring-4 focus:ring-ink/10 transition-all"
                />
              </div>

              {/* Primary Action Button */}
              <button onClick={() => setIsModalOpen(true)} className="lift flex items-center justify-center gap-2 bg-ink hover:bg-ink-soft text-white px-5 py-2 rounded-full text-sm font-semibold shadow-soft transition-colors shrink-0 active:scale-95">
                <Plus className="w-4 h-4" /> New Ticket
              </button>
            </div>

          </header>

          {/* Scrollable Dashboard Body */}
          <div className="dash-rise flex-1 overflow-y-auto p-4 sm:p-6 bg-paper text-ink custom-scrollbar">

            {/* KPI Cards - Minimalist formal style */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              {[
                {
                  label: 'เคสทั้งหมด', desc: 'ทั้งหมดในระบบ',
                  value: requests.filter(matchesCurrentView).length,
                  Icon: Ticket, chip: 'bg-slate-100 text-slate-600',
                  filterVal: ''
                },
                {
                  label: 'รอรับเรื่อง', desc: 'รอรับเรื่อง',
                  value: requests.filter(r => matchesCurrentView(r) && r.status === 'Open').length,
                  Icon: Inbox, chip: 'bg-blue-50 text-blue-600',
                  filterVal: 'Open'
                },
                {
                  label: 'กำลังดำเนินการ', desc: 'กำลังดำเนินการ',
                  value: requests.filter(r => matchesCurrentView(r) && r.status === 'In Progress').length,
                  Icon: Wrench, chip: 'bg-amber-50 text-amber-600',
                  filterVal: 'In Progress'
                },
                {
                  label: 'ปิดแล้ว', desc: 'ปิดงานแล้ว',
                  value: requests.filter(r => matchesCurrentView(r) && r.status === 'Closed').length,
                  Icon: CheckCircle, chip: 'bg-teal-50 text-teal-700',
                  filterVal: 'Closed'
                },
              ].map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setFilterStatus(prev => prev === s.filterVal ? '' : s.filterVal)}
                  aria-pressed={filterStatus === s.filterVal}
                  className={`group chip-wiggle lift flex min-h-[120px] flex-col justify-between rounded-lg border bg-surface p-5 text-left
                    ${filterStatus === s.filterVal ? 'border-ink ring-2 ring-ink/10 shadow-lift' : 'border-line shadow-soft'}`}
                >
                  <span className={`chip-icon flex h-9 w-9 items-center justify-center rounded-lg ${s.chip}`}>
                    <s.Icon className="h-4 w-4" />
                  </span>
                  <p className="mt-4 font-display text-4xl font-bold leading-none text-ink tabular-nums">{isLoading ? '—' : s.value}</p>
                  <div className="mt-2 min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-soft">{s.label}</p>
                    <p className="truncate text-xs text-muted">{s.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-3 mb-5 flex-wrap">
              <button
                onClick={() => setShowFilter(v => !v)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border transition-all ${showFilter || activeFilterCount > 0
                  ? 'bg-ink text-white border-ink shadow-soft'
                  : 'bg-surface text-ink-soft border-line hover:bg-paper'
                  }`}
              >
                <Filter className="w-3.5 h-3.5" />
                ตัวกรอง
                {activeFilterCount > 0 && (
                  <span className="bg-surface text-ink rounded-full px-1.5 py-0.5 text-[10px] font-bold">{activeFilterCount}</span>
                )}
              </button>

              {/* {Active filter chips */}
              {filterStatus && <Chip label={filterStatus} onRemove={() => setFilterStatus('')} />}
              {filterPriority && <Chip label={filterPriority} onRemove={() => setFilterPriority('')} />}
              {filterType && <Chip label={filterType} onRemove={() => setFilterType('')} />}
              {filterSubtype && <Chip label={filterSubtype} onRemove={() => setFilterSubtype('')} />}
              {filterDate && <Chip label={{ today: 'Today', week: 'This Week', month: 'This Month' }[filterDate]} onRemove={() => setFilterDate('')} />}
              {filterAssignee && <Chip label={filterAssignee === 'unassigned' ? 'Unassigned' : uniqueAssignees.find(([k]) => k === filterAssignee)?.[1] || filterAssignee} onRemove={() => setFilterAssignee('')} />}

              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setFilterStatus(''); setFilterPriority(''); setFilterType(''); setFilterSubtype(''); setFilterAssignee(''); setFilterDate(''); }}
                  className="text-xs font-semibold text-rose-500 hover:text-rose-700 transition-colors"
                >
                  Clear all
                </button>
              )}

              <span className="ml-auto text-xs font-semibold text-muted">พบ {filteredRequests.length} รายการ</span>
            </div>

            {/* Filter Panel */}
            {showFilter && (
              <div className="bg-surface rounded-lg border border-line shadow-soft p-4 mb-5 grid grid-cols-2 md:grid-cols-6 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted mb-1.5">สถานะ</label>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="w-full bg-paper border border-line rounded-lg p-2 text-xs font-medium text-ink-soft focus:outline-none focus:border-blue-500">
                    <option value="">All Statuses</option>
                    {['Open', 'In Progress', 'Closed', 'Rejected', 'Cancelled'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted mb-1.5">ความเร่งด่วน</label>
                  <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
                    className="w-full bg-paper border border-line rounded-lg p-2 text-xs font-medium text-ink-soft focus:outline-none focus:border-blue-500">
                    <option value="">All Priorities</option>
                    {['Critical', 'High', 'Medium', 'Normal'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted mb-1.5">Request Type</label>
                  <select value={filterType} onChange={e => setFilterType(e.target.value)}
                    className="w-full bg-paper border border-line rounded-lg p-2 text-xs font-medium text-ink-soft focus:outline-none focus:border-blue-500">
                    <option value="">All Types</option>
                    {uniqueTypes.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted mb-1.5">Sub-type</label>
                  <select value={filterSubtype} onChange={e => setFilterSubtype(e.target.value)}
                    disabled={uniqueSubtypes.length === 0}
                    className="w-full bg-paper border border-line rounded-lg p-2 text-xs font-medium text-ink-soft focus:outline-none focus:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed">
                    <option value="">All Sub-types</option>
                    {uniqueSubtypes.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted mb-1.5">Assignee</label>
                  <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
                    className="w-full bg-paper border border-line rounded-lg p-2 text-xs font-medium text-ink-soft focus:outline-none focus:border-blue-500">
                    <option value="">All Assignees</option>
                    <option value="unassigned">Unassigned</option>
                    {uniqueAssignees.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted mb-1.5">วันที่สร้าง</label>
                  <select value={filterDate} onChange={e => setFilterDate(e.target.value)}
                    className="w-full bg-paper border border-line rounded-lg p-2 text-xs font-medium text-ink-soft focus:outline-none focus:border-blue-500">
                    <option value="">Any Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </select>
                </div>
              </div>
            )}

            {showFilter && (
              <div className="bg-surface rounded-lg border border-line shadow-soft p-4 mb-5">
                <label className="block text-[10px] font-bold text-muted mb-1.5">
                  ดูข้อมูลย้อนหลัง (เฉพาะเคสที่ปิด/ยกเลิกแล้ว — เคสที่ยังไม่ปิดแสดงเสมออยู่แล้ว)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input type="date" value={historyStartDate} onChange={e => setHistoryStartDate(e.target.value)}
                    className="bg-paper border border-line rounded-lg p-2 text-xs font-medium text-ink-soft focus:outline-none focus:border-blue-500" />
                  <span className="text-xs text-muted">ถึง</span>
                  <input type="date" value={historyEndDate} onChange={e => setHistoryEndDate(e.target.value)}
                    className="bg-paper border border-line rounded-lg p-2 text-xs font-medium text-ink-soft focus:outline-none focus:border-blue-500" />
                  {(historyStartDate || historyEndDate) && (
                    <button onClick={() => { setHistoryStartDate(''); setHistoryEndDate(''); }}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-700 transition-colors">
                      รีเซ็ต (กลับไปดู 180 วันล่าสุด)
                    </button>
                  )}
                  <span className="text-[10px] text-muted ml-auto">
                    {historyStartDate || historyEndDate ? '' : 'ค่าเริ่มต้น: 180 วันล่าสุด'}
                  </span>
                </div>
              </div>
            )}

            {/* Loading & Empty States Management */}
            {isLoading ? (
              <div className="bg-surface border border-line rounded-lg shadow-soft p-16 text-center flex flex-col items-center gap-3 text-muted">
                <LoaderCircle className="w-8 h-8 animate-spin text-blue-500" />
                <span className="text-sm font-medium">กำลังโหลดรายการ...</span>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="dash-rise bg-surface border border-line rounded-lg shadow-soft p-16 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 bg-paper rounded-lg flex items-center justify-center mb-2">
                  <Sparkles className="w-8 h-8 text-amber" />
                </div>
                <p className="font-display text-lg font-semibold text-ink">ยังไม่พบรายการ</p>
                <p className="text-muted text-sm">ลองเปลี่ยนคำค้นหาหรือตัวกรองดูนะ</p>
              </div>
            ) : layoutMode === 'grid' ? (

              /* --- GRID VIEW LAYOUT (Formal) --- */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in">
                {paginatedRequests.map((req) => {
                  const requestType = req.problem_type_name || req.request_type || 'General Request';
                  return (
                    <div
                      key={req.id}
                      onClick={() => fetchTicketDetails(req.id)}
                      className="lift bg-surface rounded-lg border border-line p-4 shadow-soft hover:border-ink-soft cursor-pointer flex flex-col group"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${getPriorityStyle(req.priority)}`}>
                          {req.priority}
                        </span>
                        {/* ✅ ใช้ Emoji นำหน้าสถานะ */}
                        <StatusBadge status={req.status} />
                      </div>

                      <h3 className="font-semibold text-ink text-sm mb-1 group-hover:text-blue-600 line-clamp-2 transition-colors">
                        {req.project_name}
                      </h3>

                      <div className="flex items-center gap-2 mb-3">
                        <p className="text-xs text-muted font-mono">{req.req_id}</p>
                        {req.status === 'Open' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg text-[9px] font-bold bg-red-600 text-white">
                            New
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-muted mb-4 flex flex-col gap-0.5">
                        <span className="flex items-center gap-1.5 truncate">
                          <span className="[&_svg]:w-3.5 [&_svg]:h-3.5 text-muted flex items-center justify-center shrink-0">
                            {getRequestTypeIcon(requestType)}
                          </span>
                          <span className="truncate">{requestType}</span>
                        </span>
                        {req.problem_subtype_name && (
                          <span className="text-[10px] text-muted pl-5 truncate">
                            › {req.problem_subtype_name}
                          </span>
                        )}
                      </div>

                      <div className="mt-auto border-t border-line pt-3 flex flex-col gap-2">
                        <div className="flex justify-between items-center text-xs text-muted">
                          <span className="flex items-center gap-1 truncate max-w-[60%]">
                            <MapPin className="w-3.5 h-3.5 text-muted shrink-0" />
                            <span className="truncate">{req.location}</span>
                          </span>
                          <span className="shrink-0">{formatDateShort(req.target_date)}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-muted" />
                            <span className="text-slate-700">{req.requester_name?.split(' ')[0] || req.empCode_created}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted">Assigned:</span>
                            {req.empCode_assigned ? (
                              <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200 text-[10px] font-semibold">
                                {req.assigned_name?.split(' ')[0] || req.empCode_assigned}
                              </span>
                            ) : (
                              <span className="text-muted bg-paper px-2 py-0.5 rounded-lg border border-line border-dashed text-[10px] font-medium">
                                Unassigned
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (

              /* --- LIST VIEW LAYOUT (Formal Table) --- */
              <div className="bg-surface border border-line rounded-lg shadow-soft overflow-x-auto animate-in fade-in">
                <table className="w-full text-left text-sm border-collapse min-w-[1000px]">
                  <thead className="bg-paper border-b border-line text-ink-soft text-[11px] font-semibold tracking-wider">
                    <tr>
                      <th className="w-1 p-0"></th>
                      <th className="pl-4 pr-2 py-3 cursor-pointer hover:text-ink transition-colors" onClick={() => handleSort('priority')}>ความเร่งด่วน<SortIcon field="priority" /></th>
                      <th className="px-3 py-3 cursor-pointer hover:text-ink transition-colors" onClick={() => handleSort('req_id')}>เลขเคส<SortIcon field="req_id" /></th>
                      <th className="px-3 py-3 cursor-pointer hover:text-ink transition-colors" onClick={() => handleSort('project_name')}>ปัญหา / เคส<SortIcon field="project_name" /></th>
                      <th className="px-3 py-3 cursor-pointer hover:text-ink transition-colors" onClick={() => handleSort('status')}>สถานะ<SortIcon field="status" /></th>
                      <th className="w-[180px] min-w-[180px] px-3 py-3">สถานที่</th>
                      <th className="px-3 py-3">ผู้แจ้ง</th>
                      <th className="px-3 py-3">ผู้รับผิดชอบ</th>
                      <th className="px-4 py-3 text-right cursor-pointer hover:text-ink transition-colors" onClick={() => handleSort('created_at')}>วันที่สร้าง<SortIcon field="created_at" /></th>
                      <th className="pr-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {paginatedRequests.map((req) => {
                      const isNewTicket = req.status === 'Open' || (!req.empCode_assigned && !['Rejected', 'Closed', 'Cancelled'].includes(req.status));
                      const [mainLocation, subLocation] = (req.location || '').split(' › ', 2);

                      return (
                        <tr
                          key={req.id}
                          onClick={() => fetchTicketDetails(req.id)}
                          className="group cursor-pointer hover:bg-paper transition-colors"
                        >
                          <td className={`w-1 p-0 border-l-[3px] ${getPriorityBorder(req.priority)}`}></td>

                          {/* Priority */}
                          <td className="pl-4 pr-2 py-3">
                            <span className={`inline-flex px-2 py-1 rounded-lg text-[10px] font-bold border ${getPriorityStyle(req.priority)}`}>
                              {req.priority}
                            </span>
                          </td>

                          {/* Ticket No. */}
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1.5">
                              <p className="text-[12px] font-mono text-ink-soft whitespace-nowrap">{req.req_id}</p>
                              {isNewTicket && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg text-[9px] font-bold bg-red-600 text-white">
                                  New
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Problem | Ticket */}
                          <td className="px-3 py-3">
                            <p title={req.project_name} className="font-medium text-ink group-hover:text-blue-600 transition-colors line-clamp-1">
                              {req.project_name}
                            </p>
                            <p className="text-[11px] text-muted mt-1 flex items-center gap-1 truncate">
                              <span className="[&_svg]:w-3 [&_svg]:h-3 text-muted shrink-0">
                                {getRequestTypeIcon(req.problem_type_name || req.request_type)}
                              </span>
                              <span className="truncate">{req.problem_type_name || req.request_type}</span>
                              {req.problem_subtype_name && (
                                <span className="text-muted shrink-0">› {req.problem_subtype_name}</span>
                              )}
                            </p>
                          </td>

                          {/* Status */}
                          <td className="px-3 py-3">
                            {/* ✅ ใช้ Emoji นำหน้าสถานะ */}
                            <StatusBadge status={req.status} />
                          </td>

                          {/* Location */}
                          <td className="w-[180px] min-w-[180px] px-3 py-3 text-[11px] text-ink-soft">
                            <span className="flex items-start gap-1">
                              <MapPin className="w-3.5 h-3.5 text-muted shrink-0" />
                              <span className="flex min-w-0 max-w-[160px] flex-col leading-4">
                                <span className="truncate" title={mainLocation}>{mainLocation}</span>
                                {subLocation && <span className="truncate text-muted" title={subLocation}>{subLocation}</span>}
                              </span>
                            </span>
                          </td>

                          {/* Requester */}
                          <td className="px-3 py-3 text-[11px] text-ink-soft">
                            <span className="text-slate-700">{req.requester_name?.split(' ')[0] || req.empCode_created}</span>
                          </td>

                          {/* In Charge */}
                          <td className="px-3 py-3 text-[11px]">
                            {req.empCode_assigned ? (
                              <span className="inline-flex font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-lg truncate max-w-[120px]">
                                {req.assigned_name?.split(' ')[0] || req.empCode_assigned}
                              </span>
                            ) : (
                              <span className="inline-flex text-muted bg-paper px-2 py-1 rounded-lg border border-dashed border-line">
                                Unassigned
                              </span>
                            )}
                          </td>

                          {/* Date Created */}
                          <td className="px-4 py-3 text-right">
                            <p className="text-xs text-ink-soft">{formatDateShort(req.created_at)}</p>
                          </td>

                          {/* Chevron */}
                          <td className="pr-4 py-3 text-right">
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors inline-block" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {filteredRequests.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 mt-4 bg-surface border border-line rounded-lg shadow-soft">
                <p className="text-xs font-medium text-muted">
                  แสดง {(currentPage - 1) * ITEMS_PER_PAGE + 1} ถึง {Math.min(currentPage * ITEMS_PER_PAGE, filteredRequests.length)} จาก {filteredRequests.length} รายการ
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-line text-xs font-semibold text-ink-soft hover:bg-paper disabled:opacity-30 transition-colors">หน้าแรก</button>
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-line text-xs font-semibold text-ink-soft hover:bg-paper disabled:opacity-30 transition-colors">ก่อนหน้า</button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page;
                    if (totalPages <= 5) page = i + 1;
                    else if (currentPage <= 3) page = i + 1;
                    else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                    else page = currentPage - 2 + i;
                    return (
                      <button key={page} onClick={() => setCurrentPage(page)}
                        className={`w-8 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${currentPage === page
                          ? 'bg-ink text-white border-ink'
                          : 'bg-surface text-ink-soft border-line hover:bg-paper'
                          }`}>{page}</button>
                    );
                  })}

                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-line text-xs font-semibold text-ink-soft hover:bg-paper disabled:opacity-30 transition-colors">ถัดไป</button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-line text-xs font-semibold text-ink-soft hover:bg-paper disabled:opacity-30 transition-colors">หน้าสุดท้าย</button>
                </div>
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
          getDeviceTypeColor,
          displayStatusLabel
        }}
        actions={{
          openCommentModal,
          openConfirm,
          handleAcceptTicket,
          handleCancelTicket,
          handleDeleteTicket,
          handleResumeTicket,
          handleAddHelper,
          handleRemoveHelper,
          handleAssignTicket,
          setCommentMode,
          setCommentText,
          setCommentModalOpen,
          isDeleting
        }}
      />

      {/* --- MODALS --- */}

      {/* Comment/Close Modal */}
      {commentModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setCommentModalOpen(false)}></div>
          <div className={`bg-surface rounded-lg w-full ${commentMode === 'close' ? 'max-w-2xl' : 'max-w-lg max-h-[90vh]'} shadow-2xl z-[90] p-6 sm:p-8 border border-line animate-in zoom-in-95 overflow-visible flex flex-col`}>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                {commentMode === 'close' && (
                  <div className="w-10 h-10 rounded-lg bg-paper text-ink-soft flex items-center justify-center border border-line">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-ink">
                    {commentMode === 'reject' ? 'Reject Ticket'
                      : commentMode === 'close' ? 'Close Ticket'
                        : commentMode === 'hold' ? 'Hold Ticket'
                          : 'Add Comment'}
                  </h3>
                  {commentMode === 'close' && <p className="text-xs font-medium text-muted mt-0.5">บันทึกผลการแก้ไขและอุปกรณ์ที่ใช้กับเคสนี้</p>}
                </div>
              </div>
              <button onClick={() => setCommentModalOpen(false)} className="p-2 bg-paper hover:bg-paper rounded-lg transition-colors text-muted border border-line">
                <X className="w-4 h-4" />
              </button>
            </div>

            {commentMode === 'close' ? (
              <div className="space-y-5 overflow-visible pr-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-ink-soft mb-1.5">สาเหตุของปัญหา <span className="text-rose-500">*</span></label>
                    <textarea rows="4" value={rootCause} onChange={(e) => setRootCause(e.target.value)}
                      className="w-full bg-paper border border-line rounded-lg p-3 text-sm text-ink-soft focus:bg-surface focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink resize-none transition-colors"
                      placeholder="เช่น RAM เสีย, อะไหล่ชำรุด..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink-soft mb-1.5">วิธีแก้ไข <span className="text-rose-500">*</span></label>
                    <textarea rows="4" value={solution} onChange={(e) => setSolution(e.target.value)}
                      className="w-full bg-paper border border-line rounded-lg p-3 text-sm text-ink-soft focus:bg-surface focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink resize-none transition-colors"
                      placeholder="เช่น เปลี่ยนอะไหล่, ตั้งค่าใหม่..." />
                  </div>
                </div>

                {/* ✅ Safety checklist - ต้องติ๊กครบทั้ง 3 ข้อถึงจะปิดเคสได้ */}
                <div className={`rounded-lg border p-4 transition-colors ${allSafetyChecked ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-2">
                      {allSafetyChecked
                        ? <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                        : <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />}
                      <div>
                        <label className="block text-xs font-bold text-ink">
                          ตรวจสอบความปลอดภัยก่อนปิดเคส <span className="text-rose-500">*</span>
                        </label>
                        <p className="text-[11px] text-ink-soft mt-0.5">ยืนยันให้ครบทั้ง 3 ข้อก่อนกดปิดเคส</p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold border ${allSafetyChecked ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                      {SAFETY_CHECK_ITEMS.filter(i => safetyChecks[i.key]).length}/{SAFETY_CHECK_ITEMS.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {SAFETY_CHECK_ITEMS.map((item, idx) => (
                      <label
                        key={item.key}
                        htmlFor={`safety-${item.key}`}
                        className={`flex items-start gap-3 bg-surface border rounded-lg px-3 py-2.5 cursor-pointer transition-colors shadow-soft ${safetyChecks[item.key] ? 'border-emerald-300' : 'border-line hover:border-line'}`}
                      >
                        <input
                          id={`safety-${item.key}`}
                          type="checkbox"
                          checked={safetyChecks[item.key]}
                          onChange={(e) => setSafetyChecks(prev => ({ ...prev, [item.key]: e.target.checked }))}
                          className="mt-0.5 w-4 h-4 shrink-0 accent-emerald-600 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-ink">{idx + 1}. {item.label}</p>
                          <p className="text-[11px] text-muted mt-0.5">{item.hint}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Stock item picker */}
                <div className="rounded-lg border border-line bg-paper p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-bold text-ink-soft">อุปกรณ์ที่ใช้กับเคส <span className="text-muted font-normal">(ไม่บังคับ)</span></label>
                      <p className="text-[11px] text-muted mt-0.5">เลือกประเภทแล้วเลือกอุปกรณ์จากสต็อก หากมีการเบิกใช้</p>
                    </div>
                    {selectedStockItems.length > 0 && (
                      <span className="shrink-0 rounded-lg bg-blue-100 px-2.5 py-1 text-[10px] font-bold text-blue-700 border border-blue-200">
                        เลือกแล้ว {selectedStockItems.length} รายการ
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={openStockPicker}
                    className="w-full flex items-center justify-center gap-2 bg-surface border border-dashed border-line hover:border-ink hover:bg-paper rounded-lg py-2.5 text-xs font-semibold text-ink-soft hover:text-ink transition-colors shadow-soft"
                  >
                    <Paperclip className="w-4 h-4" /> เลือกอุปกรณ์จากสต็อก
                  </button>

                  {/* Selected items list */}
                  {selectedStockItems.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {selectedStockItems.map((item) => (
                        <div key={item.productId} className="flex items-center gap-3 bg-surface border border-line rounded-lg px-3 py-2 shadow-soft">
                          <div className="w-8 h-8 rounded-lg bg-paper border border-line flex items-center justify-center shrink-0">
                            <Laptop className="w-4 h-4 text-muted" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-ink truncate">{item.productName}</p>
                            <p className="text-[10px] text-muted">{item.deviceType}{item.serialNumber ? ` • S/N: ${item.serialNumber} • ${item.fixedAssetCode}` : ''}</p>
                          </div>
                          {item.deviceType !== 'Asset' && (
                            <input type="number" min="1" value={item.qty}
                              onChange={(e) => updateStockItemQty(item.productId, parseInt(e.target.value, 10) || 1)}
                              aria-label={`จำนวน ${item.productName}`}
                              className="w-14 bg-paper border border-line rounded-lg p-1 text-xs font-semibold text-center focus:outline-none focus:border-blue-500" />
                          )}
                          <button type="button" aria-label={`ลบ ${item.productName}`} onClick={() => removeStockItem(item.productId)} className="text-muted hover:text-rose-600 transition-colors p-1">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            ) : commentMode === 'hold' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink-soft mb-1.5">
                    เหตุผลที่ต้อง Hold <span className="text-rose-500">*</span>
                  </label>
                  <textarea rows="3" value={holdReason} onChange={e => setHoldReason(e.target.value)}
                    className="w-full bg-paper border border-line rounded-lg p-3 text-sm text-ink-soft focus:bg-surface focus:outline-none focus:border-ink focus:ring-1 focus:ring-amber-500 resize-none transition-colors"
                    placeholder="เช่น รออะไหล่จาก vendor, รอ approve จาก manager..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-soft mb-1.5">
                    คาดว่าจะกลับมาดำเนินการได้
                  </label>
                  <input type="date" value={expectedAt} onChange={e => setExpectedAt(e.target.value)}
                    className="w-full bg-paper border border-line rounded-lg p-2.5 text-sm text-ink-soft focus:bg-surface focus:outline-none focus:border-ink transition-colors" />
                </div>
              </div>)
              : (

                <div>
                  <label className="block text-xs font-bold text-ink-soft mb-1.5">
                    {commentMode === 'reject' ? 'เหตุผลการปฏิเสธ (Required)' : 'ข้อความ (Message)'}
                  </label>
                  <textarea rows="4" value={commentText} onChange={(e) => setCommentText(e.target.value)}
                    className="w-full bg-paper border border-line rounded-lg p-3 text-sm text-ink-soft focus:bg-surface focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink resize-none transition-colors"
                    placeholder={commentMode === 'reject' ? "ระบุเหตุผลที่ไม่สามารถรับเคสได้..." : "พิมพ์ข้อความที่ต้องการแจ้ง..."} />
                </div>
              )}

            <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-line">
              <button onClick={() => setCommentModalOpen(false)} className="px-5 py-2 rounded-lg text-sm font-semibold text-ink-soft bg-surface border border-line hover:bg-paper transition-colors shadow-soft">
                Cancel
              </button>
              <button
                onClick={() => openConfirm({
                  title: commentMode === 'close' ? 'Confirm ปิดเคส' : commentMode === 'reject' ? 'Confirm Reject' : 'Confirm Comment',
                  message: commentMode === 'close' ? `ยืนยันการปิดเคส ${selectedTicket.req_id}?\n(ตรวจความปลอดภัยแล้ว: ปลั๊กไฟ OK, สายไฟ OK, พื้นที่ปฏิบัติงาน OK)` : commentMode === 'reject' ? `ยืนยันการปฏิเสธเคส ${selectedTicket.req_id}?` : 'บันทึกข้อความลงในระบบ?',
                  confirmLabel: commentMode === 'close' ? 'ปิดเคส' : commentMode === 'reject' ? 'Reject' : 'Save Comment',
                  onConfirm: handleSaveComment
                })}
                disabled={commentMode === 'close' && (!rootCause.trim() || !solution.trim() || !allSafetyChecked)}
                className={`px-6 py-2 rounded-lg text-sm font-semibold text-white transition-colors shadow-soft disabled:opacity-50 disabled:pointer-events-none
                  ${commentMode === 'close' ? 'bg-emerald-600 hover:bg-emerald-700' : commentMode === 'reject' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-ink hover:bg-ink-soft'}`}
              >
                {commentMode === 'close' ? 'Submit & Close' : commentMode === 'reject' ? 'Reject Ticket' : 'Post Comment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Item Picker Modal (two steps: device type -> products) */}
      {stockPickerOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={closeStockPicker}></div>
          <div className="relative bg-surface rounded-lg w-full max-w-2xl shadow-2xl z-[96] flex flex-col max-h-[85vh] animate-in zoom-in-95 overflow-hidden border border-line">

            {/* Header */}
            <div className="px-6 py-4 border-b border-line flex items-center justify-between shrink-0 bg-paper">
              <div className="flex items-center gap-3">
                {stockPickerStep === 'products' && (
                  <button type="button" onClick={backToTypeSelection} className="p-1.5 hover:bg-line rounded-lg border border-transparent hover:border-line transition-colors text-ink-soft">
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </button>
                )}
                <div>
                  <h3 className="text-base font-bold text-ink">
                    {stockPickerStep === 'type' ? 'เลือกประเภทอุปกรณ์' : selectedDeviceType?.Label}
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    {stockPickerStep === 'type' ? 'เลือกหมวดหมู่ก่อนเพื่อดูอุปกรณ์' : 'แตะเพื่อเพิ่มอุปกรณ์'}
                  </p>
                </div>
              </div>
              <button onClick={closeStockPicker} className="p-1.5 bg-surface border border-line hover:bg-paper rounded-lg transition-colors shadow-soft text-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-surface">
              {stockPickerStep === 'type' ? (
                <>
                  <div className="relative mb-5">
                    <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={globalSearchQuery}
                      onChange={(e) => searchAllProducts(e.target.value)}
                      placeholder="ค้นหาอุปกรณ์ (ทุกหมวด)..."
                      className="w-full bg-surface border border-line rounded-lg pl-9 pr-3 py-2 text-sm text-ink-soft focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink transition-colors shadow-soft"
                    />
                  </div>

                  {globalSearchQuery.trim() ? (
                    // ── โหมดค้นหาข้ามหมวด ──
                    isSearchingGlobal ? (
                      <div className="flex items-center justify-center py-16 text-muted gap-2">
                        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-bold">กำลังค้นหา...</span>
                      </div>
                    ) : globalSearchResults.length === 0 ? (
                      <p className="text-sm font-bold text-muted text-center py-16">ไม่พบอุปกรณ์</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {globalSearchResults.map((p) => {
                          const alreadyAdded = selectedStockItems.find(i => i.productId === p.ProductID);
                          return (
                            <button
                              key={p.ProductID}
                              type="button"
                              onClick={() => addStockItem(p)}
                              disabled={p.CurrentStock <= 0}
                              className="flex flex-col text-left bg-surface border border-line hover:border-ink-soft rounded-lg overflow-hidden transition-colors shadow-soft disabled:opacity-40 disabled:cursor-not-allowed relative"
                            >
                              {alreadyAdded && (
                                <span className="absolute top-2 right-2 z-10 bg-purple-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow">
                                  ×{alreadyAdded.qty}
                                </span>
                              )}
                              <div className="w-full aspect-square bg-paper flex items-center justify-center overflow-hidden">
                                {p.ImageURL ? (
                                  <img src={encodeURI(`${STOCK_HOST}${p.ImageURL}`)} alt={p.ProductName}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} />
                                ) : (
                                  <Laptop className="w-8 h-8 text-slate-300" />
                                )}
                              </div>
                              <div className="p-2.5">
                                <p className="text-xs font-bold text-ink-soft truncate">{p.ProductName}</p>
                                <p className="text-[10px] text-muted mt-0.5">
                                  คงเหลือ {p.CurrentStock}
                                  {p.LastPrice != null ? ` • ฿${Number(p.LastPrice).toLocaleString('th-TH')}` : ''}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )
                  ) : (
                    // ── โหมดเลือกประเภท (ค่า default) ──
                    isLoadingDeviceTypes ? (
                      <div className="flex items-center justify-center py-16 text-muted gap-2">
                        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-bold">กำลังโหลด...</span>
                      </div>
                    ) : stockDeviceTypes.length === 0 ? (
                      <p className="text-sm font-bold text-muted text-center py-16">ไม่พบประเภทอุปกรณ์</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {stockDeviceTypes.map((t) => (
                          <button
                            key={t.TypeId}
                            type="button"
                            onClick={() => selectDeviceType(t)}
                            className="flex flex-col items-center justify-center gap-2 bg-surface border border-line hover:border-ink-soft hover:bg-paper rounded-lg p-5 transition-colors shadow-soft"
                          >
                            <div className="w-12 h-12 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center">
                              <Laptop className="w-5 h-5 text-purple-600" />
                            </div>
                            <span className="text-xs font-bold text-ink-soft text-center">{t.Label}</span>
                          </button>
                        ))}
                      </div>
                    )
                  )}
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={productSearchInModal}
                    onChange={(e) => setProductSearchInModal(e.target.value)}
                    placeholder={`ค้นหาใน ${selectedDeviceType?.Label}...`}
                    className="w-full bg-surface border border-line rounded-lg p-3 text-sm font-medium text-ink-soft focus:outline-none focus:border-ink focus:ring-4 focus:ring-ink/10 transition-all mb-4"
                  />

                  {isLoadingStockProducts ? (
                    <div className="flex items-center justify-center py-16 text-muted gap-2">
                      <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-bold">กำลังโหลด...</span>
                    </div>
                  ) : visibleStockProducts.length === 0 ? (
                    <p className="text-sm font-bold text-muted text-center py-16">ไม่พบอุปกรณ์ในหมวดนี้</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {visibleStockProducts.map((p) => {
                        const alreadyAdded = selectedStockItems.find(i => i.productId === p.ProductID);
                        return (
                          <button
                            key={p.ProductID}
                            type="button"
                            onClick={() => addStockItem(p)}
                            disabled={p.CurrentStock <= 0}
                            className="flex flex-col text-left bg-surface border border-line hover:border-ink-soft rounded-lg overflow-hidden transition-colors shadow-soft disabled:opacity-40 disabled:cursor-not-allowed relative"
                          >
                            {alreadyAdded && (
                              <span className="absolute top-2 right-2 z-10 bg-purple-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow">
                                ×{alreadyAdded.qty}
                              </span>
                            )}
                            <div className="w-full aspect-square bg-paper flex items-center justify-center overflow-hidden">
                              {p.ImageURL ? (
                                <img src={encodeURI(`${STOCK_HOST}${p.ImageURL}`)} alt={p.ProductName}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} />
                              ) : (
                                <Laptop className="w-8 h-8 text-slate-300" />
                              )}
                            </div>
                            <div className="p-2.5">
                              <p className="text-xs font-bold text-ink-soft truncate">{p.ProductName}</p>
                              <p className="text-[10px] text-muted mt-0.5">
                                คงเหลือ {p.CurrentStock}
                                {p.LastPrice != null ? ` • ฿${Number(p.LastPrice).toLocaleString('th-TH')}` : ''}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-line bg-surface flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-muted">
                {selectedStockItems.length > 0 ? `เลือกแล้ว ${selectedStockItems.length} รายการ` : 'ยังไม่ได้เลือกอุปกรณ์'}
              </span>
              <button type="button" onClick={closeStockPicker}
                className="px-6 py-2.5 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/30 active:scale-95 transition-all">
                เสร็จแล้ว
              </button>
            </div>
          </div>

          {/* Asset serial/code entry - overlays on top when an Asset-type item was just picked */}
          {assetPickerProduct && (
            <div className="fixed inset-0 z-[97] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setAssetPickerProduct(null)}></div>
              <div className="relative bg-surface rounded-lg w-full max-w-sm shadow-2xl z-[98] p-6 animate-modal-pop">
                <p className="text-sm font-black text-ink mb-1">{assetPickerProduct.ProductName}</p>
                <p className="text-xs font-medium text-muted mb-4">ต้องระบุ Serial Number และรหัสครุภัณฑ์ก่อนเพิ่ม</p>
                <div className="space-y-2.5">
                  <input type="text" value={assetSerialInput} onChange={(e) => setAssetSerialInput(e.target.value)}
                    placeholder="Serial Number"
                    className="w-full bg-paper border border-line rounded-lg p-3 text-sm font-medium focus:outline-none focus:border-ink focus:bg-surface transition-all" />
                  <input type="text" value={assetCodeInput} onChange={(e) => setAssetCodeInput(e.target.value)}
                    placeholder="รหัสครุภัณฑ์ (เช่น CO24-001-05)"
                    className="w-full bg-paper border border-line rounded-lg p-3 text-sm font-medium focus:outline-none focus:border-ink focus:bg-surface transition-all" />
                </div>
                <div className="flex gap-2 justify-end mt-5">
                  <button type="button" onClick={() => setAssetPickerProduct(null)}
                    className="px-4 py-2.5 text-xs font-bold text-muted hover:bg-paper rounded-lg transition-colors">ยกเลิก</button>
                  <button type="button" onClick={confirmAddAssetItem}
                    disabled={!assetSerialInput.trim() || !assetCodeInput.trim()}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg disabled:opacity-40 transition-colors">เพิ่มอุปกรณ์</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(pendingAction)}
        title={pendingAction?.title}
        message={pendingAction?.message}
        confirmLabel={pendingAction?.confirmLabel}
        isLoading={isProcessingAction}
        onConfirm={executePendingAction}
        onCancel={closeConfirm}
      />

      {/* New Request Modal */}
      {isModalOpen && (
        <OpenTicketModal
          user={user}
          isSubmittingTicket={isSubmittingTicket}
          onClose={() => setIsModalOpen(false)}
          onSubmit={async (payload) => {
            if (isSubmittingRef.current) return;
            isSubmittingRef.current = true;
            setIsSubmittingTicket(true);
            try {
              await ticketAPI.createTicket(payload);
              showNotification('Request submitted successfully!', 'success');
              setIsModalOpen(false);
              fetchRequests();
            } catch (error) {
              showNotification('Failed to submit request', 'error');
            } finally {
              isSubmittingRef.current = false;
              setIsSubmittingTicket(false);
            }
          }}
        />
      )}
    </div>
  );
}