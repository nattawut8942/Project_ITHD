// frontend/src/components/OpenTicketModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Paperclip, Loader2, ChevronDown, Clock, Zap, Flame, AlertTriangle, Send, CheckCircle2, Image as ImageIcon, FileText, Upload, Trash2, Info } from 'lucide-react';
import { API_BASE } from '../config/api';

const token = () => localStorage.getItem('authToken');
const getLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const PRIORITY_OPTIONS = [
    { value: 'Normal', label: 'ปกติ', hint: 'รอได้ตามคิว', Icon: Clock, active: 'border-slate-600 bg-slate-600 text-white', idle: 'text-slate-700 hover:border-slate-400' },
    { value: 'Medium', label: 'ปานกลาง', hint: 'ควรทำภายในวันนี้', Icon: Zap, active: 'border-amber-500 bg-amber-500 text-white', idle: 'text-amber-800 hover:border-amber-400' },
    { value: 'High', label: 'ด่วน', hint: 'กระทบการทำงานบางส่วน', Icon: Flame, active: 'border-orange-500 bg-orange-500 text-white', idle: 'text-orange-800 hover:border-orange-400' },
    { value: 'Critical', label: 'วิกฤต', hint: 'งานหยุดชะงัก', Icon: AlertTriangle, active: 'border-rose-600 bg-rose-600 text-white', idle: 'text-rose-800 hover:border-rose-400' },
];

export default function OpenTicketModal({ user, onClose, onSubmit, isSubmittingTicket }) {
    const [masterData, setMasterData] = useState(null);
    const [loadingMaster, setLoadingMaster] = useState(true);
    const [attachments, setAttachments] = useState([]);
    const [isDragActive, setIsDragActive] = useState(false);
    const [attachmentMessage, setAttachmentMessage] = useState('');
    const [previewUrls, setPreviewUrls] = useState({});

    const [formData, setFormData] = useState({
        problemTypeId: '',
        problemSubtypeId: '',
        locationId: '',
        subLocationId: '',
        deviceTypeId: '',
        projectName: '',
        targetDate: getLocalDate(),
        deviceCount: 1,
        priority: 'Normal',
        requirements: '',
        phone_internal: '',
        phone_personal: '',
        problem_type_name: '',
        problem_subtype_name: '',
    });

    // Derived filtered lists
    const subtypes = masterData?.problemSubtypes.filter(s => s.type_id === parseInt(formData.problemTypeId)) || [];
    const subLocations = masterData?.subLocations.filter(s => s.location_id === parseInt(formData.locationId)) || [];

    // Progress: required fields filled
    const requiredTotal = 3;
    const requiredFilled = [formData.problemTypeId, formData.projectName.trim(), formData.locationId].filter(Boolean).length;

    useEffect(() => {
        const fetchMaster = async () => {
            try {
                const res = await fetch(`${API_BASE}/master/all`, {
                    headers: { Authorization: `Bearer ${token()}` }
                });
                const data = await res.json();
                if (data.success) setMasterData(data.data);
            } catch (e) { console.error(e); }
            finally { setLoadingMaster(false); }
        };
        fetchMaster();
    }, []);

    // Image previews for attachments (revoked when the list changes)
    useEffect(() => {
        const next = {};
        attachments.forEach((f, i) => {
            if (f.type?.startsWith('image/')) next[i] = URL.createObjectURL(f);
        });
        setPreviewUrls(next);
        return () => Object.values(next).forEach(url => URL.revokeObjectURL(url));
    }, [attachments]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const next = { ...prev, [name]: value };
            // Reset dependent fields on parent change
            if (name === 'problemTypeId') next.problemSubtypeId = '';
            if (name === 'locationId') next.subLocationId = '';
            return next;
        });
    };

    const addAttachments = (fileList) => {
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.svg'];
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'application/pdf'];
        let unsupportedCount = 0;
        let oversizedCount = 0;
        const acceptedFiles = [];

        Array.from(fileList || []).forEach((file, index) => {
            const fileName = file.name?.toLowerCase() || '';
            const isSupported = allowedTypes.includes(file.type) || allowedExtensions.some(extension => fileName.endsWith(extension));
            if (!isSupported) {
                unsupportedCount += 1;
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                oversizedCount += 1;
                return;
            }

            const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1] || 'png';
            acceptedFiles.push(file.name ? file : new File([file], `pasted-image-${Date.now()}-${index + 1}.${extension}`, { type: file.type }));
        });

        setAttachments(previous => {
            const existing = new Set(previous.map(file => `${file.name}:${file.size}:${file.lastModified}`));
            return [...previous, ...acceptedFiles.filter(file => {
                const key = `${file.name}:${file.size}:${file.lastModified}`;
                if (existing.has(key)) return false;
                existing.add(key);
                return true;
            })];
        });

        const messages = [];
        if (unsupportedCount) messages.push(`ไม่รองรับไฟล์ ${unsupportedCount} รายการ`);
        if (oversizedCount) messages.push(`ไฟล์เกิน 5MB จำนวน ${oversizedCount} รายการ`);
        setAttachmentMessage(messages.join(' · '));
    };

    const handlePasteAttachments = (e) => {
        const target = e.target instanceof HTMLElement ? e.target : null;
        if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
        const items = Array.from(e.clipboardData.items || []).filter(item => item.kind === 'file');
        const files = items.map(item => item.getAsFile()).filter(Boolean);
        if (files.length) {
            e.preventDefault();
            addAttachments(files);
        } else if (target?.closest('[data-attachment-dropzone]')) {
            e.preventDefault();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Upload files ก่อน (ถ้ามี)
        let uploadedFiles = [];
        if (attachments.length > 0) {
            const formDataFiles = new FormData();
            attachments.forEach(f => formDataFiles.append('files', f));
            try {
                const uploadRes = await fetch(`${API_BASE}/upload/ticket-attachment`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token()}` },
                    body: formDataFiles,
                });
                const uploadData = await uploadRes.json();
                if (uploadData.success) uploadedFiles = uploadData.files;
            } catch (e) {
                console.error('Upload failed:', e);
            }
        }

        const selectedType = masterData?.problemTypes.find(t => t.id === parseInt(formData.problemTypeId));
        const selectedSubtype = masterData?.problemSubtypes.find(s => s.id === parseInt(formData.problemSubtypeId));
        const selectedLoc = masterData?.locations.find(l => l.id === parseInt(formData.locationId));
        const selectedSubLoc = masterData?.subLocations.find(s => s.id === parseInt(formData.subLocationId));
        const selectedDevice = masterData?.deviceTypes.find(d => d.id === parseInt(formData.deviceTypeId));

        const payload = {
            request_type: selectedSubtype?.name || selectedType?.name || 'Other',
            problem_type_id: selectedType?.id || null,
            problem_subtype_id: selectedSubtype?.id || null,
            problem_type_name: selectedType?.name || '',
            problem_subtype_name: selectedSubtype?.name || '',
            project_name: formData.projectName,
            device_type: selectedDevice?.name || 'Not Applicable (N/A)',
            device_count: parseInt(formData.deviceCount, 10) || 1,
            location: [selectedLoc?.name, selectedSubLoc?.name].filter(Boolean).join(' › '),
            priority: formData.priority,
            target_date: formData.targetDate || getLocalDate(),
            notes: formData.requirements,
            attachments: uploadedFiles,
            phone_internal: formData.phone_internal,
            phone_personal: formData.phone_personal,
            emp_pic_url: user?.empPic || '',
        };
        onSubmit(payload);
    };

    return (
        <div onPaste={handlePasteAttachments} className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 bg-black/40 backdrop-blur-sm animate-fade">
            <div role="dialog" aria-modal="true" aria-labelledby="open-ticket-title" className="bg-surface w-full h-[100dvh] sm:h-auto sm:max-w-3xl sm:rounded-lg shadow-lift overflow-hidden flex flex-col sm:max-h-[92vh] animate-modal-pop border border-line">

                {/* Header */}
                <div className="flex items-start justify-between gap-4 px-5 sm:px-7 pt-5 pb-4 border-b border-line bg-surface shrink-0">
                    <div className="flex items-start gap-3 min-w-0">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                            <Send className="w-5 h-5" />
                        </span>
                        <div className="min-w-0">
                            <h2 id="open-ticket-title" className="font-display text-xl font-bold text-ink tracking-tight">แจ้งปัญหาใหม่</h2>
                            <p className="text-sm text-muted mt-0.5">กรอกรายละเอียดให้ครบ ทีม IT จะได้ดำเนินการได้เร็วขึ้น</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} aria-label="ปิดหน้าต่าง" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-paper hover:text-ink">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Requester strip */}
                <div className="px-5 sm:px-7 pt-5 shrink-0">
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-lg border border-line bg-paper p-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                            {user?.empPic ? (
                                <img src={user.empPic} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover border border-line bg-surface" />
                            ) : (
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface border border-line font-bold text-ink-soft">
                                    {user?.name?.charAt(0) || 'U'}
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold text-muted">ผู้แจ้ง</p>
                                <p className="text-sm font-bold text-ink truncate">{user?.name || 'ไม่ทราบชื่อ'}</p>
                            </div>
                        </div>
                        <div className="min-w-0 flex-1 basis-40">
                            <p className="text-[11px] font-semibold text-muted">แผนก</p>
                            <p className="text-sm font-semibold text-ink-soft truncate">{user?.sect_long || user?.sect || '-'}</p>
                        </div>
                        <div className="min-w-0 flex-1 basis-40">
                            <p className="text-[11px] font-semibold text-muted">อีเมล</p>
                            <p className="text-sm font-semibold text-ink-soft truncate">{user?.email || 'ไม่มีอีเมล'}</p>
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="mt-4 flex items-center gap-3">
                        <div className="flex-1 h-1.5 rounded-full bg-line overflow-hidden" aria-hidden="true">
                            <div className="h-full rounded-full bg-ink transition-all duration-500" style={{ width: `${(requiredFilled / requiredTotal) * 100}%` }} />
                        </div>
                        <p className="text-xs font-semibold text-muted whitespace-nowrap">
                            {requiredFilled === requiredTotal ? (
                                <span className="inline-flex items-center gap-1 text-teal-700"><CheckCircle2 className="w-3.5 h-3.5" /> กรอกครบแล้ว</span>
                            ) : (
                                <>กรอกแล้ว {requiredFilled}/{requiredTotal} ช่องจำเป็น</>
                            )}
                        </p>
                    </div>
                </div>

                {loadingMaster ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3 text-muted">
                        <Loader2 className="w-6 h-6 animate-spin text-ink" />
                        <span className="text-sm font-medium">กำลังเตรียมข้อมูล...</span>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 sm:px-7 py-5 space-y-5">

                            {/* Section 1 */}
                            <Section num="1" title="ปัญหาที่พบ">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field id="problemTypeId" label="ประเภทปัญหาหลัก" required>
                                        <Select id="problemTypeId" name="problemTypeId" value={formData.problemTypeId} onChange={handleChange} required>
                                            <option value="">เลือกประเภทปัญหา</option>
                                            {masterData?.problemTypes.map(t => (
                                                <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                                            ))}
                                        </Select>
                                    </Field>
                                    <Field id="problemSubtypeId" label="ประเภทย่อย">
                                        <Select id="problemSubtypeId" name="problemSubtypeId" value={formData.problemSubtypeId} onChange={handleChange} disabled={!formData.problemTypeId || subtypes.length === 0}>
                                            <option value="">เลือกประเภทย่อย</option>
                                            {subtypes.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </Select>
                                    </Field>
                                </div>

                                <Field id="projectName" label="หัวข้อปัญหา" required hint="สรุปสั้น ๆ เช่น คอมเปิดไม่ติด, พิมพ์เอกสารไม่ได้">
                                    <input
                                        id="projectName" name="projectName" value={formData.projectName} onChange={handleChange} required
                                        placeholder="เช่น คอมพิวเตอร์เปิดไม่ติด"
                                        className={inputCls}
                                    />
                                </Field>
                            </Section>

                            {/* Section 2 */}
                            <Section num="2" title="สถานที่และอุปกรณ์">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field id="locationId" label="สถานที่หลัก" required>
                                        <Select id="locationId" name="locationId" value={formData.locationId} onChange={handleChange} required>
                                            <option value="">เลือกสถานที่</option>
                                            {masterData?.locations.map(l => (
                                                <option key={l.id} value={l.id}>{l.name}</option>
                                            ))}
                                        </Select>
                                    </Field>
                                    <Field id="subLocationId" label="สถานที่ย่อย">
                                        <Select id="subLocationId" name="subLocationId" value={formData.subLocationId} onChange={handleChange} disabled={!formData.locationId || subLocations.length === 0}>
                                            <option value="">เลือกสถานที่ย่อย</option>
                                            {subLocations.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </Select>
                                    </Field>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="sm:col-span-2">
                                        <Field id="deviceTypeId" label="ประเภทอุปกรณ์">
                                            <Select id="deviceTypeId" name="deviceTypeId" value={formData.deviceTypeId} onChange={handleChange}>
                                                <option value="">เลือกประเภทอุปกรณ์</option>
                                                {masterData?.deviceTypes.map(d => (
                                                    <option key={d.id} value={d.id}>{d.icon} {d.name}</option>
                                                ))}
                                            </Select>
                                        </Field>
                                    </div>
                                    <Field id="deviceCount" label="จำนวน">
                                        <input id="deviceCount" type="number" name="deviceCount" value={formData.deviceCount} onChange={handleChange} min="1" className={inputCls} />
                                    </Field>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field id="phone_internal" label="เบอร์ภายใน">
                                        <input
                                            id="phone_internal" name="phone_internal" value={formData.phone_internal} onChange={handleChange}
                                            placeholder="เช่น 1234" className={inputCls}
                                        />
                                    </Field>
                                    <Field id="phone_personal" label="เบอร์มือถือ" optional>
                                        <input
                                            id="phone_personal" name="phone_personal" value={formData.phone_personal} onChange={handleChange}
                                            placeholder="เช่น 081-xxx-xxxx" className={inputCls}
                                        />
                                    </Field>
                                </div>
                            </Section>

                            {/* Section 3 */}
                            <Section num="3" title="ความเร่งด่วนและกำหนดเวลา">
                                <div>
                                    <p className="mb-2 text-xs font-semibold text-ink-soft">ระดับความเร่งด่วน</p>
                                    <div role="radiogroup" aria-label="ระดับความเร่งด่วน" className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                                        {PRIORITY_OPTIONS.map(({ value, label, hint, Icon, active, idle }) => {
                                            const isSelected = formData.priority === value;
                                            return (
                                                <label
                                                    key={value}
                                                    className={`lift cursor-pointer rounded-lg border-2 p-3 transition-colors focus-within:ring-4 focus-within:ring-ink/10 ${isSelected ? active : `bg-surface border-line ${idle}`}`}
                                                >
                                                    <input type="radio" name="priority" value={value} checked={isSelected} onChange={handleChange} className="sr-only" />
                                                    <span className="flex items-center gap-2 text-sm font-bold">
                                                        <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                                                        {label}
                                                    </span>
                                                    <span className={`mt-1 block text-[11px] leading-snug ${isSelected ? 'text-white/85' : 'text-muted'}`}>{hint}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                <Field id="targetDate" label="วันที่ต้องการให้เสร็จ" hint="ค่าเริ่มต้นคือวันนี้ เปลี่ยนได้หากไม่เร่งด่วน">
                                    <input id="targetDate" type="date" name="targetDate" value={formData.targetDate} onChange={handleChange} className={`${inputCls} sm:max-w-xs`} />
                                </Field>
                            </Section>

                            {/* Section 4 */}
                            <Section num="4" title="รายละเอียดเพิ่มเติมและไฟล์แนบ">
                                <Field id="requirements" label="รายละเอียดเพิ่มเติม" optional>
                                    <textarea id="requirements" rows="3" name="requirements" value={formData.requirements} onChange={handleChange}
                                        className={`${inputCls} resize-none`}
                                        placeholder="เช่น ข้อความที่ขึ้นบนจอ, โปรแกรมที่ใช้, เวลาที่เกิดปัญหา" />
                                </Field>

                                <div>
                                    <p className="mb-1.5 text-xs font-semibold text-ink-soft">ไฟล์แนบ <span className="font-normal text-muted">(ไม่บังคับ)</span></p>
                                    <div
                                        data-attachment-dropzone="true"
                                        onDragOver={(e) => e.preventDefault()}
                                        onDragEnter={(e) => { e.preventDefault(); setIsDragActive(true); }}
                                        onDragLeave={() => setIsDragActive(false)}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            setIsDragActive(false);
                                            addAttachments(e.dataTransfer.files);
                                        }}
                                        className={`rounded-lg border-2 border-dashed p-5 text-center transition-colors ${isDragActive ? 'border-ink bg-ink/5' : 'border-line bg-paper'}`}
                                    >
                                        <input
                                            id="file-input" type="file" multiple accept=".jpg,.jpeg,.png,.gif,.pdf,.svg" className="sr-only"
                                            onChange={(e) => {
                                                addAttachments(e.target.files);
                                                e.target.value = '';
                                            }}
                                        />
                                        <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-surface border border-line text-ink-soft">
                                            <Upload className="w-5 h-5" />
                                        </span>
                                        <p className="text-sm font-semibold text-ink">ลากไฟล์มาวางที่นี่ หรือ</p>
                                        <button
                                            type="button"
                                            onClick={() => document.getElementById('file-input').click()}
                                            className="mt-2 inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-line bg-surface px-4 py-2 text-xs font-bold text-ink transition-colors hover:bg-paper focus-visible:ring-4 focus-visible:ring-ink/10 focus-visible:outline-none"
                                        >
                                            <Paperclip className="w-3.5 h-3.5" /> เลือกไฟล์
                                        </button>
                                        <p className="mt-3 text-[11px] text-muted">
                                            รองรับ JPG, PNG, GIF, SVG, PDF ขนาดไม่เกิน 5MB ต่อไฟล์ · วางรูปด้วย <kbd className="rounded border border-line bg-surface px-1 py-0.5 font-mono">Ctrl</kbd> + <kbd className="rounded border border-line bg-surface px-1 py-0.5 font-mono">V</kbd> ได้เลย
                                        </p>

                                        {attachmentMessage && (
                                            <p role="alert" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
                                                <Info className="w-3.5 h-3.5" /> {attachmentMessage}
                                            </p>
                                        )}

                                        {attachments.length > 0 && (
                                            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                                                {attachments.map((f, i) => (
                                                    <li key={`${f.name}-${f.size}-${i}`} className="flex items-center gap-3 rounded-lg border border-line bg-surface p-2">
                                                        {previewUrls[i] ? (
                                                            <img src={previewUrls[i]} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover border border-line" />
                                                        ) : (
                                                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-paper border border-line text-muted">
                                                                {f.type?.startsWith('image/') ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                                            </span>
                                                        )}
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-xs font-semibold text-ink">{f.name}</p>
                                                            <p className="text-[11px] text-muted">{(f.size / 1024).toFixed(0)} KB</p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            aria-label={`ลบไฟล์ ${f.name}`}
                                                            onClick={() => setAttachments(previous => previous.filter((_, index) => index !== i))}
                                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-rose-50 hover:text-rose-600"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            </Section>
                        </div>

                        {/* Footer */}
                        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 px-5 sm:px-7 py-4 border-t border-line bg-paper shrink-0">
                            <p className="text-[11px] text-muted"><span className="text-rose-600">*</span> จำเป็นต้องกรอก</p>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isSubmittingTicket}
                                    className="flex-1 sm:flex-none min-h-[44px] rounded-lg border border-line bg-surface px-5 text-sm font-bold text-ink-soft transition-colors hover:bg-paper disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingTicket}
                                    className="lift flex-1 sm:flex-none min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-6 text-sm font-bold text-white shadow-soft transition-colors hover:bg-ink-soft disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isSubmittingTicket ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> กำลังส่ง...</>
                                    ) : (
                                        <><Send className="w-4 h-4" /> ส่งแจ้งซ่อม</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

// ---- UI building blocks ----
const inputCls = "w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm font-medium text-ink placeholder:text-muted/80 focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/10 transition-all disabled:bg-paper disabled:text-muted";

const Section = ({ num, title, children }) => (
    <section className="rounded-lg border border-line bg-surface p-5 space-y-4">
        <header className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink text-xs font-bold text-white">{num}</span>
            <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
        </header>
        {children}
    </section>
);

const Field = ({ id, label, required, optional, hint, children }) => (
    <div className="min-w-0">
        <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-ink-soft">
            {label}
            {required && <span className="ml-0.5 text-rose-600" aria-hidden="true">*</span>}
            {optional && <span className="ml-1 font-normal text-muted">(ไม่บังคับ)</span>}
        </label>
        {children}
        {hint && <p className="mt-1.5 text-[11px] text-muted">{hint}</p>}
    </div>
);

const Select = ({ id, children, disabled, ...props }) => (
    <div className="relative">
        <select id={id} disabled={disabled} className={`${inputCls} appearance-none cursor-pointer pr-10`} {...props}>
            {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
    </div>
);
