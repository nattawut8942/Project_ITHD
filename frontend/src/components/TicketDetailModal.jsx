import React, { useState, useEffect } from 'react';
import {
  X, Laptop, Clock, MapPin, CheckCircle, CheckCircle2, Paperclip, User, AlertTriangle, Circle, MinusCircle,
  MessageSquare, Inbox, XCircle, Shuffle, UserPlus, RefreshCw, PauseCircle, Wrench, Ban, Phone, Smartphone,
  ShieldCheck, Users, ListChecks, MessagesSquare, History, FileText, Package
} from 'lucide-react';
import { API_BASE } from '../config/api';
import StatusBadge from './StatusBadge';
import EmployeeAvatar from './EmployeeAvatar';
import {
  getActionLabel, getActionDot, getPriorityLabel, getPriorityPill, getStatusDot, translateHistoryDetail
} from '../utils/styleHelpers';

const STOCK_HOST = 'http://dciweb.dci.daikin.co.jp:3002';
const PHOTO_HOST = 'http://dcidmc.dci.daikin.co.jp/PICTURE';
const avatarFallback = (name, bg = 'e2e8f0', color = '334155') =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || '?')}&background=${bg}&color=${color}`;

export default function TicketDetailModal({
  ticket,
  onClose,
  ticketHistory,
  user,
  isITStaff,
  readOnly = false,
  formatters,
  actions
}) {
  const [showHelperPanel, setShowHelperPanel] = useState(false);
  const [itStaffList, setItStaffList] = useState([]);
  const [assignPanelMode, setAssignPanelMode] = useState(null); // 'assign' | 'reassign' | null

  useEffect(() => {
    if ((showHelperPanel || assignPanelMode) && itStaffList.length === 0) {
      fetch(`${API_BASE}/master/it-staff`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
      })
        .then(r => r.json())
        .then(d => { if (d.success) setItStaffList(d.data); })
        .catch(console.error);
    }
  }, [showHelperPanel, assignPanelMode, itStaffList.length]);

  if (!ticket) return null;

  const canComment = !readOnly && (
    ticket.empCode_created === user?.empcode ||
    ticket.empCode_assigned === user?.empcode
  );

  const { formatDateShort, formatThaiDateTime, getRequestTypeIcon, getDeviceTypeColor } = formatters;

  const {
    openCommentModal,
    openConfirm,
    handleAcceptTicket,
    handleCancelTicket,
    handleResumeTicket,
    handleAddHelper,
    handleRemoveHelper,
    handleAssignTicket,
    setCommentMode,
    setCommentText,
    setCommentModalOpen
  } = actions;

  const isMine = ticket?.empCode_assigned === user?.empcode;
  const inProgressMine = isITStaff && ticket?.status === 'In Progress' && isMine;
  const canReject = isITStaff && ticket?.status !== 'Closed' && ticket?.status !== 'Rejected' && (!ticket?.empCode_assigned || isMine);
  const canCancelOwn = !isITStaff && ticket?.empCode_created === user?.empcode && ticket?.status === 'Open';
  const hasAnyAction = canComment
    || (isITStaff && ticket?.status === 'Open')
    || inProgressMine
    || (isITStaff && ticket?.status === 'On Hold' && isMine)
    || canReject
    || canCancelOwn;
  const deviceColor = getDeviceTypeColor(ticket.request_type);

  // ---- Safety check ----
  const safetyItems = [
    { ok: ticket.safety_plug_ok, label: 'ปลั๊กไฟ' },
    { ok: ticket.safety_cable_ok, label: 'สายไฟ' },
    { ok: ticket.safety_area_ok, label: 'พื้นที่ปฏิบัติงาน' },
  ];
  const hasSafetyData = safetyItems.some((c) => c.ok);
  const isFinished = ['Closed', 'Rejected', 'Cancelled'].includes(ticket.status);
  const safetyState = hasSafetyData ? 'done' : isFinished ? 'legacy' : 'pending';
  const safetyHead = {
    done: { tone: 'border-teal-200', icon: <CheckCircle className="w-5 h-5 text-teal-700" />, text: 'ตรวจครบทั้ง 3 ข้อแล้ว', sub: ticket.safety_checked_at ? `เมื่อ ${formatThaiDateTime(ticket.safety_checked_at)}` : null },
    pending: { tone: 'border-amber-200', icon: <AlertTriangle className="w-5 h-5 text-amber-600" />, text: 'ยังไม่ได้ตรวจ', sub: 'ต้องติ๊กครบทั้ง 3 ข้อก่อนปิดเคส' },
    legacy: { tone: 'border-line', icon: <MinusCircle className="w-5 h-5 text-muted" />, text: 'ไม่มีข้อมูล', sub: 'เคสนี้จบก่อนที่ระบบจะมีการตรวจความปลอดภัย' },
  }[safetyState];

  // ---- Attachments ----
  let files = [];
  try {
    const parsed = typeof ticket.attachments === 'string' ? JSON.parse(ticket.attachments) : ticket.attachments;
    files = Array.isArray(parsed) ? parsed : [];
  } catch { files = []; }

  const stockTotal = ticket.stockItems?.reduce((sum, i) => sum + (i.unit_price || 0) * i.qty, 0) || 0;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-4 md:p-6 font-sans">

        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade" onClick={onClose} />

        {/* Dialog */}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ticket-detail-title"
          className="relative z-50 flex w-full max-w-6xl flex-col overflow-hidden bg-paper h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:rounded-lg border border-line shadow-lift animate-modal-pop"
        >

          {/* Status strip: same colour as the status badge */}
          <div className={`h-1.5 w-full shrink-0 ${getStatusDot(ticket.status)}`} aria-hidden="true" />

          {/* Header */}
          <header className="shrink-0 border-b border-line bg-surface px-5 sm:px-7 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-paper px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-600">{ticket.req_id}</span>
                  <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${deviceColor.bg} ${deviceColor.text} ${deviceColor.border}`}>
                    {getRequestTypeIcon(ticket.request_type)} {ticket.request_type}
                  </span>
                </div>
                <h2 id="ticket-detail-title" className="font-display text-xl sm:text-2xl font-bold leading-snug text-slate-900 break-words">{ticket.project_name}</h2>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusBadge status={ticket.status} />
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getPriorityPill(ticket.priority)}`}>
                    ความเร่งด่วน: {getPriorityLabel(ticket.priority)}
                  </span>
                  {ticket.created_at && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Clock className="w-3.5 h-3.5" /> เปิดเมื่อ {formatThaiDateTime(ticket.created_at)}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="ปิดหน้าต่าง"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-paper hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-7 py-5">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

              {/* LEFT: main content */}
              <div className="lg:col-span-3 min-w-0 space-y-5">

                {/* People */}
                <Card accent="indigo" icon={<Users className="w-4 h-4" />} title="ผู้เกี่ยวข้อง">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <PersonCard
                      label="ผู้แจ้ง"
                      name={ticket.requester_name}
                      sub={ticket.requester_email || 'ไม่มีอีเมล'}
                      photo={ticket.emp_pic_url || `${PHOTO_HOST}/${ticket.empCode_created}.jpg`}
                      fallback={avatarFallback(ticket.requester_name)}
                    />
                    {ticket.empCode_assigned ? (
                      <PersonCard
                        label="ผู้รับผิดชอบ"
                        name={ticket.assigned_name || ticket.empCode_assigned}
                        sub={ticket.assigned_email || '-'}
                        photo={`${PHOTO_HOST}/${ticket.empCode_assigned}.jpg`}
                        fallback={avatarFallback(ticket.assigned_name || ticket.empCode_assigned, 'dcfce7', '166534')}
                      />
                    ) : (
                      <div className="flex items-center gap-3 rounded-lg border border-dashed border-line bg-paper p-3">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-slate-400"><User className="w-5 h-5" /></span>
                        <div>
                          <p className="text-[11px] font-semibold text-slate-500">ผู้รับผิดชอบ</p>
                          <p className="text-sm font-bold text-slate-800">ยังไม่มีผู้รับผิดชอบ</p>
                          <p className="text-[11px] text-slate-500">รอมอบหมาย</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {ticket.helpers && ticket.helpers.length > 0 && (
                    <div className="mt-4 border-t border-line pt-4">
                      <p className="mb-2 text-xs font-semibold text-slate-600">ทีมช่วยเหลือ ({ticket.helpers.length})</p>
                      <div className="space-y-2">
                        {ticket.helpers.map((h) => (
                          <div key={h.empCode} className="flex items-center gap-3 rounded-lg border border-line bg-paper p-2">
                            <EmployeeAvatar empCode={h.empCode} name={h.name} size={48} tone="bg-surface" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-800">{h.name}</p>
                              <p className="text-[11px] text-slate-500">{h.empCode}</p>
                            </div>
                            <span className="shrink-0 rounded-md border border-line bg-surface px-2 py-0.5 text-[11px] font-semibold text-slate-600">ผู้ช่วย</span>
                            {isITStaff && ticket?.empCode_assigned === user?.empcode && actions.handleRemoveHelper && (
                              <button
                                type="button"
                                onClick={() => actions.handleRemoveHelper(h.empCode)}
                                aria-label={`ลบ ${h.name} ออกจากทีม`}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>

                {/* Work info */}
                <Card accent="blue" icon={<ListChecks className="w-4 h-4" />} title="ข้อมูลงาน">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InfoTile icon={<Laptop className="w-4 h-4" />} label="อุปกรณ์" value={`${ticket.device_count || 1} × ${ticket.device_type || '-'}`} />
                    <InfoTile icon={<Clock className="w-4 h-4" />} label="กำหนดเสร็จ" value={ticket.target_date ? formatDateShort(ticket.target_date) : '-'} />
                    <InfoTile icon={<Phone className="w-4 h-4" />} label="เบอร์ภายใน" value={ticket.phone_internal || '-'} />
                    <InfoTile icon={<Smartphone className="w-4 h-4" />} label="เบอร์มือถือ" value={ticket.phone_personal || '-'} />
                    <div className="sm:col-span-2">
                      <InfoTile icon={<MapPin className="w-4 h-4" />} label="สถานที่" value={ticket.location || '-'} />
                    </div>
                  </div>
                  <div className="mt-4 border-t border-line pt-4">
                    <p className="mb-2 text-xs font-semibold text-slate-600">รายละเอียดเพิ่มเติม</p>
                    <div className="whitespace-pre-wrap rounded-lg bg-paper p-4 text-sm leading-relaxed text-slate-800">
                      {ticket.notes || 'ไม่มีรายละเอียดเพิ่มเติม'}
                    </div>
                  </div>
                </Card>

                {/* Stock items */}
                {ticket.stockItems && ticket.stockItems.length > 0 && (
                  <Card accent="violet"
                    icon={<Package className="w-4 h-4" />}
                    title={`อุปกรณ์ที่เบิกใช้ (${ticket.stockItems.length})`}
                    right={ticket.stockItems.some(i => i.unit_price != null) && (
                      <span className="rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-800">
                        รวม ฿{stockTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  >
                    <div className="space-y-2">
                      {ticket.stockItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 rounded-lg border border-line p-2">
                          {item.image_url ? (
                            <img
                              src={encodeURI(`${STOCK_HOST}${item.image_url}`)}
                              alt={item.product_name}
                              className="h-10 w-10 shrink-0 rounded-lg border border-line object-cover bg-surface"
                              onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                            />
                          ) : null}
                          <div className={`h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-paper text-slate-400 ${item.image_url ? 'hidden' : 'flex'}`}>
                            <Laptop className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-800">{item.product_name}</p>
                            <p className="truncate text-[11px] text-slate-500">
                              {item.device_type}
                              {item.serial_number ? ` • S/N: ${item.serial_number}` : ''}
                              {item.fixed_asset_code ? ` • ${item.fixed_asset_code}` : ''}
                              {item.unit_price != null ? ` • ฿${Number(item.unit_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}/ชิ้น` : ''}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-md bg-paper px-2 py-1 text-[11px] font-bold text-slate-700">จำนวน {item.qty}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Resolution */}
                {ticket.root_cause && (
                  <Card accent="teal" icon={<CheckCircle className="w-4 h-4" />} title="ผลการแก้ไข" tone="border-teal-200">
                    <div className="space-y-4">
                      <div>
                        <p className="mb-1 text-xs font-semibold text-slate-500">สาเหตุ</p>
                        <p className="whitespace-pre-wrap text-sm font-medium text-slate-800">{ticket.root_cause}</p>
                      </div>
                      <div className="h-px w-full bg-line" />
                      <div>
                        <p className="mb-1 text-xs font-semibold text-slate-500">วิธีแก้ไข</p>
                        <p className="whitespace-pre-wrap text-sm font-medium text-slate-800">{ticket.solution}</p>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Safety check */}
                <Card accent="teal" icon={<ShieldCheck className="w-4 h-4" />} title="ตรวจความปลอดภัยก่อนปิดเคส" tone={safetyHead.tone}>
                  <div className="mb-4 flex items-start gap-3">
                    <span className="mt-0.5 shrink-0">{safetyHead.icon}</span>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{safetyHead.text}</p>
                      {safetyHead.sub && <p className="mt-0.5 text-xs text-slate-500">{safetyHead.sub}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {safetyItems.map((c, idx) => (
                      <div
                        key={c.label}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 ${c.ok ? 'border-teal-200 bg-teal-50' : 'border-line bg-paper'}`}
                      >
                        {c.ok
                          ? <CheckCircle className="h-4 w-4 shrink-0 text-teal-700" />
                          : safetyState === 'pending'
                            ? <Circle className="h-4 w-4 shrink-0 text-amber-500" />
                            : <MinusCircle className="h-4 w-4 shrink-0 text-slate-400" />}
                        <span className={`text-xs font-semibold ${c.ok ? 'text-teal-900' : 'text-slate-600'}`}>{idx + 1}. {c.label}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Attachments */}
                {files.length > 0 && (
                  <Card accent="blue" icon={<Paperclip className="w-4 h-4" />} title={`ไฟล์แนบ (${files.length})`}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {files.map((f, i) => {
                        const href = `${API_BASE.replace('/api', '')}${f.url}`;
                        const isImage = /\.(jpg|jpeg|png|gif|svg)$/i.test(f.filename || '');
                        return (
                          <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="lift group block overflow-hidden rounded-lg border border-line bg-paper">
                            {isImage ? (
                              <div className="aspect-video overflow-hidden bg-surface">
                                <img src={href} alt={f.originalname} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                              </div>
                            ) : (
                              <div className="flex aspect-video items-center justify-center bg-surface text-slate-400">
                                <FileText className="w-6 h-6" />
                              </div>
                            )}
                            <p className="truncate px-2.5 py-2 text-[11px] font-medium text-slate-700" title={f.originalname}>{f.originalname}</p>
                          </a>
                        );
                      })}
                    </div>
                  </Card>
                )}

                {/* Comments */}
                <Card accent="amber"
                  icon={<MessagesSquare className="w-4 h-4" />}
                  title="ความคิดเห็น"
                  right={canComment && (
                    <button
                      type="button"
                      onClick={() => { setCommentModalOpen(true); setCommentText(''); }}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-paper"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> เพิ่มความคิดเห็น
                    </button>
                  )}
                >
                  {ticket.comments && ticket.comments.length > 0 ? (
                    <div className="max-h-96 space-y-3 overflow-y-auto custom-scrollbar pr-1">
                      {ticket.comments.map((c) => (
                        <div key={c.id} className="flex items-start gap-3 animate-fade">
                          <EmployeeAvatar empCode={c.empCode} name={c.commenter_name || c.name || c.empCode} size={48} tone="bg-surface" />
                          <div className="min-w-0 flex-1 rounded-lg bg-paper p-3">
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-900">{c.commenter_name || c.name || c.empCode}</span>
                              <span className="shrink-0 text-[10px] text-slate-500">{formatThaiDateTime(c.created_at)}</span>
                            </div>
                            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{c.comment}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-line bg-paper py-8 text-center">
                      <MessageSquare className="mx-auto mb-2 h-5 w-5 text-slate-400" />
                      <p className="text-sm font-semibold text-slate-600">ยังไม่มีความคิดเห็น</p>
                    </div>
                  )}
                </Card>
              </div>

              {/* RIGHT: timeline */}
              <aside className="lg:col-span-2 min-w-0">
                <div className="lg:sticky lg:top-0">
                  <Card accent="sky" icon={<History className="w-4 h-4" />} title="ประวัติการดำเนินการ">
                    <ol className="relative ml-2 space-y-5 border-l-2 border-line">
                      {ticketHistory.length === 0 ? (
                        <TimelineItem dot="bg-blue-500" title="เปิดงาน" time={formatThaiDateTime(ticket.created_at)} />
                      ) : (
                        ticketHistory.map((log) => (
                          <TimelineItem
                            key={log.id}
                            dot={getActionDot(log)}
                            title={getActionLabel(log.action_type)}
                            by={log.actor_name}
                            body={translateHistoryDetail(log.details)}
                            time={formatThaiDateTime(log.created_at)}
                          />
                        ))
                      )}
                    </ol>
                  </Card>
                </div>
              </aside>
            </div>
          </div>

          {/* Footer: actions */}
          {!readOnly && hasAnyAction && (
            <footer className="shrink-0 border-t border-line bg-surface px-4 sm:px-7 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">

                {/* Primary actions */}
                {isITStaff && ticket?.status === 'Open' && (
                  <PrimaryButton onClick={() => openConfirm({
                    title: 'ยืนยันรับเคส',
                    message: `ยืนยันการรับเคส ${ticket.req_id}? ระบบจะเปลี่ยนสถานะเป็น "กำลังดำเนินการ"`,
                    confirmLabel: 'รับเคส',
                    onConfirm: handleAcceptTicket
                  })} icon={<Inbox className="w-4 h-4" />}>
                    รับเคสนี้
                  </PrimaryButton>
                )}
                {inProgressMine && (
                  <PrimaryButton tone="teal" onClick={() => { setCommentMode('close'); setCommentText(''); setCommentModalOpen(true); }} icon={<CheckCircle2 className="w-4 h-4" />}>
                    ปิดงาน (สำเร็จ)
                  </PrimaryButton>
                )}
                {isITStaff && ticket?.status === 'On Hold' && isMine && (
                  <PrimaryButton onClick={() => openConfirm({
                    title: 'ยืนยันกลับมาดำเนินการ',
                    message: `ยืนยันการกลับมาดำเนินการ ${ticket.req_id}?`,
                    confirmLabel: 'กลับมาดำเนินการ',
                    onConfirm: handleResumeTicket
                  })} icon={<Wrench className="w-4 h-4" />}>
                    กลับมาดำเนินการ
                  </PrimaryButton>
                )}

                {/* Secondary actions */}
                <div className="flex flex-1 flex-wrap gap-2 sm:justify-end">
                  {canComment && (
                    <SecondaryButton onClick={() => openCommentModal('comment')} icon={<MessageSquare className="w-4 h-4" />}>
                      เพิ่มความคิดเห็น
                    </SecondaryButton>
                  )}
                  {isITStaff && ticket?.status === 'Open' && (
                    <SecondaryButton onClick={() => { setAssignPanelMode('assign'); setShowHelperPanel(false); }} icon={<Shuffle className="w-4 h-4" />}>
                      มอบหมายให้ผู้อื่น
                    </SecondaryButton>
                  )}
                  {inProgressMine && (
                    <SecondaryButton onClick={() => setShowHelperPanel(true)} icon={<UserPlus className="w-4 h-4" />}>
                      เพิ่มผู้ช่วย
                    </SecondaryButton>
                  )}
                  {inProgressMine && (
                    <SecondaryButton onClick={() => setAssignPanelMode('reassign')} icon={<RefreshCw className="w-4 h-4" />}>
                      โอนเคส
                    </SecondaryButton>
                  )}
                  {inProgressMine && (
                    <SecondaryButton tone="orange" onClick={() => { setCommentMode('hold'); setCommentModalOpen(true); }} icon={<PauseCircle className="w-4 h-4" />}>
                      พักไว้ (รออะไหล่)
                    </SecondaryButton>
                  )}
                  {canReject && (
                    <SecondaryButton tone="rose" onClick={() => openCommentModal('reject')} icon={<XCircle className="w-4 h-4" />}>
                      ปฏิเสธเคส
                    </SecondaryButton>
                  )}
                  {canCancelOwn && (
                    <SecondaryButton tone="rose" onClick={() => openConfirm({
                      title: 'ยืนยันยกเลิกคำขอ',
                      message: `ยืนยันการยกเลิก ${ticket.req_id}?`,
                      confirmLabel: 'ยกเลิกคำขอ',
                      onConfirm: handleCancelTicket
                    })} icon={<Ban className="w-4 h-4" />}>
                      ยกเลิกคำขอ
                    </SecondaryButton>
                  )}
                </div>
              </div>
            </footer>
          )}
        </div>
      </div>

      {/* Helper panel */}
      {showHelperPanel && (
        <PickerModal
          title="เพิ่มผู้ช่วยเหลือ"
          onClose={() => setShowHelperPanel(false)}
          list={itStaffList}
          filter={(s) => s.empCode !== ticket.empCode_assigned && !ticket.helpers?.find(h => h.empCode === s.empCode)}
          actionLabel="เพิ่ม"
          onPick={(s) => { handleAddHelper(s.empCode); setShowHelperPanel(false); }}
        />
      )}

      {/* Assign / re-assign panel */}
      {assignPanelMode && (
        <PickerModal
          title={assignPanelMode === 'assign' ? 'มอบหมายเคสให้ผู้อื่น' : 'โอนเคสให้ผู้อื่น'}
          onClose={() => setAssignPanelMode(null)}
          list={itStaffList}
          filter={(s) => s.empCode !== user?.empcode && s.empCode !== ticket.empCode_assigned}
          actionLabel="เลือก"
          onPick={(s) => {
            const mode = assignPanelMode;
            setAssignPanelMode(null);
            openConfirm({
              title: mode === 'assign' ? 'ยืนยันมอบหมายเคส' : 'ยืนยันโอนเคส',
              message: `ให้ ${s.name} รับผิดชอบเคส ${ticket.req_id} แทนหรือไม่?`,
              confirmLabel: 'ยืนยัน',
              onConfirm: () => handleAssignTicket(s.empCode, { setInProgress: mode === 'assign', staffName: s.name })
            });
          }}
        />
      )}
    </>
  );
}

// ---------- building blocks ----------

const ACCENT_CHIP = {
  indigo: "bg-indigo-50 text-indigo-700",
  blue: "bg-blue-50 text-blue-700",
  violet: "bg-violet-50 text-violet-700",
  teal: "bg-teal-50 text-teal-700",
  amber: "bg-amber-50 text-amber-700",
  sky: "bg-sky-50 text-sky-700",
  slate: "bg-slate-100 text-slate-600",
};

function Card({ icon, title, right, tone = "border-line", accent = "slate", children }) {
  return (
    <section className={`rounded-lg border bg-surface p-5 shadow-soft ${tone}`}>
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon && <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ACCENT_CHIP[accent] || ACCENT_CHIP.slate}`}>{icon}</span>}
          <h3 className="truncate font-display text-base font-semibold text-slate-900">{title}</h3>
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

function PersonCard({ label, name, sub, photo, fallback }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-paper p-3">
      <EmployeeAvatar src={photo} name={name} size={48} tone="bg-surface" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-500">{label}</p>
        <p className="truncate text-sm font-bold text-slate-900">{name}</p>
        <p className="truncate text-[11px] text-slate-500">{sub}</p>
      </div>
    </div>
  );
}

function InfoTile({ icon, label, value }) {
  return (
    <div className="rounded-lg bg-paper p-3">
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
        <span className="text-slate-400">{icon}</span> {label}
      </p>
      <p className="break-words text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function TimelineItem({ dot, title, by, body, time }) {
  return (
    <li className="relative pl-6">
      <span className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-4 border-surface ${dot}`} />
      <p className="text-sm font-bold text-slate-900">{title}</p>
      {by && <p className="text-[11px] font-medium text-slate-600">โดย {by}</p>}
      {body && <div className="mt-1.5 whitespace-pre-wrap rounded-lg bg-paper p-2.5 text-[13px] text-slate-700">{body}</div>}
      <p className="mt-1 text-[10px] text-slate-500">{time}</p>
    </li>
  );
}

const PRIMARY_TONES = {
  ink: 'bg-ink text-white hover:bg-ink-soft',
  teal: 'bg-teal-700 text-white hover:bg-teal-800',
};

function PrimaryButton({ onClick, icon, tone = 'ink', children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`lift min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold shadow-soft transition-colors ${PRIMARY_TONES[tone]}`}
    >
      {icon}
      {children}
    </button>
  );
}

const SECONDARY_TONES = {
  default: 'border-line text-slate-700 hover:bg-paper',
  orange: 'border-orange-300 text-orange-800 hover:bg-orange-50',
  rose: 'border-rose-300 text-rose-700 hover:bg-rose-50',
};

function SecondaryButton({ onClick, icon, tone = 'default', children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-lg border bg-surface px-3.5 text-xs font-semibold transition-colors ${SECONDARY_TONES[tone]}`}
    >
      {icon}
      {children}
    </button>
  );
}

function PickerModal({ title, onClose, list, filter, actionLabel, onPick }) {
  const items = list.filter(filter);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 font-sans">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative z-[70] w-full max-w-md rounded-lg border border-line bg-surface p-5 shadow-lift animate-modal-pop">
        <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
          <h3 className="font-display text-base font-semibold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} aria-label="ปิด" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-paper hover:text-slate-900">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="max-h-72 space-y-2 overflow-y-auto custom-scrollbar pr-1">
          {list.length === 0 ? (
            <p className="py-8 text-center text-sm font-medium text-slate-500">กำลังโหลด...</p>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm font-medium text-slate-500">ไม่มีรายชื่อที่เลือกได้</p>
          ) : (
            items.map(s => (
              <button
                type="button"
                key={s.empCode}
                onClick={() => onPick(s)}
                className="group flex w-full items-center gap-3 rounded-lg border border-line bg-surface p-2.5 text-left transition-colors hover:bg-paper"
              >
                <EmployeeAvatar empCode={s.empCode} name={s.name} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{s.name}</p>
                  <p className="text-[11px] text-slate-500">{s.empCode}</p>
                </div>
                <span className="shrink-0 rounded-lg border border-line bg-paper px-2.5 py-1 text-[11px] font-semibold text-slate-700 group-hover:bg-ink group-hover:text-white">
                  {actionLabel}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
