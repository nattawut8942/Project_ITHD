import React from 'react';
import { X, Laptop, Clock, MapPin, CheckCircle, Paperclip, User } from 'lucide-react';
import { API_BASE } from '../config/api';

export default function TicketDetailModal({
  ticket,
  onClose,
  ticketHistory,
  user,
  isITStaff,
  formatters,
  actions
}) {
  if (!ticket) return null;

  const {
    formatDateShort,
    formatElapsedTime,
    formatThaiDateTime,
    getStatusStyle,
    getPriorityStyle,
    getRequestTypeIcon,
    displayStatusLabel
  } = formatters;

  const {
    openCommentModal,
    openConfirm,
    handleAcceptTicket,
    handleCancelTicket,
    handleDeleteTicket,
    setCommentMode,
    setCommentText,
    setCommentModalOpen
  } = actions;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" onClick={onClose}></div>
      <div className="relative bg-white rounded-[2rem] w-full max-w-5xl shadow-2xl z-50 flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300 overflow-hidden border border-white/50">

        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/80 shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest bg-white px-2 py-1 rounded-md border border-slate-200">{ticket.req_id}</span>
              <span className="flex items-center gap-1.5 text-[11px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-md shadow-sm">
                {getRequestTypeIcon(ticket.request_type)} {ticket.request_type}
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-800 leading-tight">{ticket.project_name}</h2>
          </div>
          <button onClick={onClose} className="p-2.5 bg-white border border-slate-200 hover:bg-slate-100 hover:text-rose-500 rounded-full transition shadow-sm text-slate-500 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div className="md:col-span-3 space-y-6">
              <div className="flex gap-4">
                <div className="flex-1 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2">Current Status</p>
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider ring-1 ring-inset ${getStatusStyle(ticket.status)}`}>
                    {displayStatusLabel(ticket.status)}
                  </span>
                </div>
                <div className="flex-1 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2">Priority Level</p>
                  <span className={`inline-flex px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border ${getPriorityStyle(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex gap-4 items-center">
                  <img
                    src={ticket.emp_pic_url || `http://dcidmc.dci.daikin.co.jp/PICTURE/${ticket.empCode_created}.jpg`}
                    alt={ticket.requester_name}
                    className="w-16 h-18 rounded-lg object-cover ring-4 ring-indigo-50 shrink-0 bg-slate-50"
                    style={{ imageRendering: 'auto' }}
                    onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(ticket.requester_name)}&background=e0e7ff&color=4f46e5`; }}
                  />
                  <div>
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Requester</p>
                    <p className="font-bold text-slate-800 text-lg leading-tight">{ticket.requester_name}</p>
                    <p className="text-xs font-medium text-slate-500 mt-1">{ticket.requester_email} • CC: <span className="font-bold">{ticket.cost_center}</span></p>
                    {ticket.requester_sect ? (
                      <p className="text-xs font-medium text-slate-500 mt-1">Section <span className="font-bold">{ticket.requester_sect}</span></p>
                    ) : null}
                  </div>
                </div>

                <div className="flex gap-4 items-center md:justify-end">
                  {ticket.empCode_assigned ? (
                    <>
                      <img
                        src={`http://dcidmc.dci.daikin.co.jp/PICTURE/${ticket.empCode_assigned}.jpg`}
                        alt={ticket.assigned_name}
                        className="w-16 h-18 rounded-lg object-cover ring-4 ring-emerald-50 shrink-0 bg-emerald-50"
                        style={{ imageRendering: 'auto' }}
                        onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(ticket.assigned_name || ticket.empCode_assigned)}&background=dcfce7&color=166534`; }}
                      />
                      <div>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">In Charge</p>
                        <p className="font-bold text-slate-800 text-lg leading-tight">{ticket.assigned_name || ticket.empCode_assigned}</p>
                        <p className="text-xs font-medium text-slate-500 mt-1">
                          {ticket.assigned_email || '-'}
                          {ticket.assigned_cost_center ? ` • CC: ${ticket.assigned_cost_center}` : ''}
                        </p>
                        {ticket.assigned_sect ? (
                          <p className="text-xs font-medium text-slate-500 mt-1">Section <span className="font-bold">{ticket.assigned_sect}</span></p>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-full border border-dashed border-slate-300 flex items-center justify-center bg-slate-50 text-slate-400">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">In Charge</p>
                        <p className="font-bold text-slate-800 text-lg leading-tight">Unassigned</p>
                        <p className="text-xs font-medium text-slate-500 mt-1">No one has taken this ticket yet</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 grid grid-cols-2 gap-y-6 gap-x-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Laptop className="w-3.5 h-3.5" /> Equipment</p>
                  <p className="font-bold text-slate-800 text-sm">{ticket.device_count}x {ticket.device_type}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Target Date</p>
                  <p className="font-bold text-slate-800 text-sm">{formatDateShort(ticket.target_date)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">📞 เบอร์ภายใน</p>
                  <p className="font-bold text-slate-800 text-sm">{ticket.phone_internal || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">📱 เบอร์ส่วนตัว</p>
                  <p className="font-bold text-slate-800 text-sm">{ticket.phone_personal || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Location</p>
                  <p className="font-bold text-slate-800 text-sm">{ticket.location}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Requirements / Notes</p>
                <div className="bg-slate-50/50 p-4 rounded-xl text-sm font-medium text-slate-700 leading-relaxed border border-slate-100 whitespace-pre-wrap">
                  {ticket.notes || 'No additional notes provided.'}
                </div>
              </div>

              {ticket.root_cause && (
                <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 shadow-sm">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Resolution Details</p>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[11px] font-bold text-emerald-800/60 mb-1">🔍 สาเหตุของปัญหา (Root Cause)</p>
                      <p className="text-sm font-bold text-emerald-900 whitespace-pre-wrap">{ticket.root_cause}</p>
                    </div>
                    <div className="h-px bg-emerald-200/50 w-full"></div>
                    <div>
                      <p className="text-[11px] font-bold text-emerald-800/60 mb-1">✅ วิธีแก้ไข (Solution)</p>
                      <p className="text-sm font-bold text-emerald-900 whitespace-pre-wrap">{ticket.solution}</p>
                    </div>
                  </div>
                </div>
              )}

              {ticket.attachments && (() => {
                try {
                  const files = typeof ticket.attachments === 'string' ? JSON.parse(ticket.attachments) : ticket.attachments;
                  if (!files?.length) return null;
                  return (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">📎 Attachments ({files.length})</p>
                      <div className="grid grid-cols-3 gap-3">
                        {files.map((f, i) => {
                          const isImage = /\.(jpg|jpeg|png|gif|svg)$/i.test(f.filename);
                          return isImage ? (
                            <a key={i} href={`${API_BASE.replace('/api', '')}${f.url}`} target="_blank" rel="noopener noreferrer" className="group block">
                              <div className="relative overflow-hidden rounded-xl border border-slate-200">
                                <img src={`${API_BASE.replace('/api', '')}${f.url}`} alt={f.originalname} className="w-full h-24 object-cover group-hover:scale-110 transition-transform duration-300" />
                                <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors"></div>
                              </div>
                              <p className="text-[10px] font-bold text-slate-500 truncate mt-1.5 text-center px-1">{f.originalname}</p>
                            </a>
                          ) : (
                            <a key={i} href={`${API_BASE.replace('/api', '')}${f.url}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center h-24 bg-slate-50 rounded-xl border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 transition-colors p-3 group">
                              <Paperclip className="w-6 h-6 text-slate-300 group-hover:text-indigo-500 mb-2 transition-colors" />
                              <p className="text-[10px] font-bold text-slate-500 group-hover:text-indigo-600 truncate w-full text-center">{f.originalname}</p>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  );
                } catch { return null; }
              })()}

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comments Log</p>
                  <button onClick={() => { setCommentModalOpen(true); setCommentText(''); }} className="text-[11px] bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-100 transition-colors shadow-sm">
                    + Add Comment
                  </button>
                </div>
                {ticket.comments && ticket.comments.length > 0 ? (
                  <div className="space-y-4">
                    {ticket.comments.map((c) => (
                      <div key={c.id} className="rounded-2xl border border-slate-100 p-4 bg-slate-50/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-700">{c.empCode}</span>
                          <span className="text-[10px] font-medium text-slate-400">{formatThaiDateTime(c.created_at)}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-600 whitespace-pre-line">{c.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-bold text-slate-400 text-center py-6">No comments yet.</p>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN (Timeline) */}
            <div className="md:col-span-2">
              <div className="sticky top-0 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Activity Timeline</p>
                <div className="relative border-l-2 border-slate-100 ml-3 space-y-6">
                  {ticketHistory.length === 0 ? (
                    <div className="relative pl-6">
                      <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-slate-300 ring-4 ring-white shadow-sm"></span>
                      <p className="text-sm font-bold text-slate-800">Ticket Opened</p>
                      <p className="text-[10px] font-medium text-slate-400 mt-1">{formatThaiDateTime(ticket.created_at)}</p>
                    </div>
                  ) : (
                    ticketHistory.map((log, idx) => (
                      <div key={log.id} className="relative pl-6 group">
                        <span className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full ring-4 ring-white shadow-sm transition-transform group-hover:scale-125
                          ${log.action_type === 'Comment' ? 'bg-amber-400' :
                            log.action_type === 'Created' ? 'bg-slate-300' :
                              log.action_type === 'Completed' ? 'bg-emerald-500' :
                                log.action_type === 'In Progress' ? 'bg-blue-500' :
                                  log.action_type === 'Status Update' ? (
                                    log.details?.includes('Completed') ? 'bg-emerald-500' :
                                      log.details?.includes('Rejected') ? 'bg-rose-500' :
                                        log.details?.includes('Cancelled') ? 'bg-slate-500' :
                                          log.details?.includes('In Progress') ? 'bg-blue-500' : 'bg-slate-400'
                                  ) :
                                    log.action_type === 'Rejected' ? 'bg-rose-500' :
                                      log.action_type === 'Cancelled' ? 'bg-slate-500' :
                                        log.action_type === 'Assigned' ? 'bg-indigo-500' : 'bg-slate-400'
                          }`}>
                          {idx === 0 && <span className="absolute inset-0 rounded-full animate-ping opacity-50 bg-inherit"></span>}
                        </span>
                        <div className="flex flex-col gap-1">
                          <p className="text-xs font-black text-slate-800 uppercase tracking-wide">{log.action_type}</p>
                          <p className="text-[10px] font-bold text-indigo-500 mb-1">By {log.actor_name}</p>
                          <p className="text-xs font-medium text-slate-600 whitespace-pre-wrap bg-slate-50 p-3 rounded-xl border border-slate-100">{log.details}</p>
                          <span className="text-[10px] font-bold text-slate-400 mt-1">{formatThaiDateTime(log.created_at)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
                  
        <div className="px-8 py-5 border-t border-slate-100 bg-white grid gap-3 sm:grid-cols-2 md:grid-cols-4 shrink-0">
          <button onClick={() => openCommentModal('comment')} className="w-full py-3 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-100 hover:border-slate-300 transition-colors shadow-sm">
            Add Comment
          </button>

          {isITStaff && ticket?.status !== 'Completed' && ticket?.status !== 'Rejected' && (
            <button onClick={() => openCommentModal('reject')} className="w-full py-3 bg-white border border-rose-200 text-rose-600 rounded-xl font-bold text-xs hover:bg-rose-50 transition-colors shadow-sm">
              Reject Ticket
            </button>
          )}

          {isITStaff && ticket?.status === 'Pending' && (
            <button onClick={() => openConfirm({
              title: 'Confirm Accept Ticket',
              message: `ยืนยันการรับเคส ${ticket.req_id}? ระบบจะเปลี่ยนสถานะเป็น "กำลังดำเนินการ"`,
              confirmLabel: 'Accept Ticket',
              onConfirm: handleAcceptTicket
            })} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 active:scale-95 md:col-span-2">
              Accept Ticket
            </button>
          )}

          {isITStaff && ticket?.status === 'In Progress' && ticket?.empCode_assigned === user?.empcode && (
            <button onClick={() => { setCommentMode('close'); setCommentText(''); setCommentModalOpen(true); }}
              className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold text-xs hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/30 active:scale-95 md:col-span-2">
              Close Ticket (Success)
            </button>
          )}

          {!isITStaff && ticket?.empCode_created === user?.empcode && ticket?.status === 'Pending' && (
            <button onClick={() => openConfirm({
              title: 'ยกเลิก Ticket',
              message: `ยืนยันการยกเลิก ${ticket.req_id}?`,
              confirmLabel: 'ยกเลิก Ticket',
              onConfirm: handleCancelTicket
            })} className="w-full py-3 bg-white border border-slate-300 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 transition-colors shadow-sm md:col-span-2 md:col-start-3">
              Cancel Request
            </button>
          )}

          {isITStaff && (
            <button onClick={() => openConfirm({
              title: 'Confirm Delete Ticket',
              message: `คุณกำลังจะลบเคส ${ticket.req_id} อย่างถาวร ยืนยันหรือไม่?`,
              confirmLabel: 'Delete Ticket',
              onConfirm: handleDeleteTicket
            })} className="w-full py-3 bg-white border border-rose-200 text-rose-600 rounded-xl font-bold text-xs hover:bg-rose-50 hover:text-rose-700 transition-colors shadow-sm md:col-span-4 mt-2">
              Delete Ticket (Admin Only)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
