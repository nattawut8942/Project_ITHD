// frontend/src/components/OpenTicketModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Paperclip, Loader2, ChevronDown } from 'lucide-react';
import { API_BASE } from '../config/api';

const token = () => localStorage.getItem('authToken');
const today = new Date().toISOString().split('T')[0];

export default function OpenTicketModal({ user, onClose, onSubmit }) {
    const [masterData, setMasterData] = useState(null);
    const [loadingMaster, setLoadingMaster] = useState(true);
    const [attachments, setAttachments] = useState([]);
    
    // หมายเหตุ: ปรับให้ปลอดภัยจากการเกิด ReferenceError (เนื่องจาก selectedType ยังไม่ถูกประกาศในจังหวะเริ่มต้น)
    const [formData, setFormData] = useState({
        problemTypeId: '',
        problemSubtypeId: '',
        locationId: '',
        subLocationId: '',
        deviceTypeId: '',
        projectName: '',
        targetDate: today,
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
            target_date: formData.targetDate || new Date().toISOString().split('T')[0],
            notes: formData.requirements,
            attachments: uploadedFiles,
            phone_internal: formData.phone_internal,
            phone_personal: formData.phone_personal,
            emp_pic_url: user?.empPic || '',
        };
        onSubmit(payload);
    };

    // ฟังก์ชันจัดการสีของ Priority แบบไดนามิก
    const getPriorityStyle = (level, isSelected) => {
        if (!isSelected) return 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300';
        switch(level) {
            case 'Normal': return 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20';
            case 'Medium': return 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/20';
            case 'High': return 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20';
            case 'Critical': return 'bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-500/20';
            default: return 'bg-slate-900 border-slate-900 text-white';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-500">
            <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in-[0.98] slide-in-from-bottom-4 duration-700 ease-out border border-white/50">

                {/* Header (Sticky) */}
                <div className="px-6 py-5 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-20">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-14 rounded-xl bg-indigo-50 flex items-center justify-center">
                                <span className="text-xl">🎫</span>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 tracking-tight">New Ticket</h2>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">กรอกรายละเอียดเพื่อให้ IT ดำเนินการได้รวดเร็ว</p>
                            </div>
                        </div>
                        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors bg-slate-50 hover:bg-slate-100 p-2.5 rounded-full">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* User Info Micro-Cards */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 transition-colors hover:bg-slate-50">
                            <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-1">Requester</p>
                            <p className="text-sm font-bold text-slate-800 truncate">{user?.name || 'Unknown'}</p>
                            <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">{user?.email || 'No email'}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 transition-colors hover:bg-slate-50">
                            <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-1">Department</p>
                            <p className="text-sm font-bold text-slate-800 truncate">{user?.sect_long || user?.sect || '-'}</p>
                            <p className="text-[11px] font-medium text-slate-500 mt-0.5">CC: <span className="text-indigo-600 font-bold">{user?.cost_center || 'N/A'}</span></p>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-2 flex items-center justify-center">
                            {user?.empPic ? (
                                <img src={user.empPic} alt={user?.name} className="h-18 w-20 rounded-xl object-cover ring-2 ring-white shadow-sm" />
                            ) : (
                                <div className="h-14 w-14 rounded-xl bg-gradient-to-tr from-indigo-100 to-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xl ring-2 ring-white shadow-sm">
                                    {user?.name?.charAt(0) || 'U'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {loadingMaster ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                        <span className="text-sm font-medium">กำลังเตรียมข้อมูล...</span>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 custom-scrollbar">
                        <div className="p-6 space-y-8">
                            
                            {/* Section 1 */}
                            <div className="space-y-4">
                                <SectionHeader num="1" label="ประเภทปัญหา" />
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <SelectWrapper label="ประเภทปัญหาหลัก" required>
                                        <select name="problemTypeId" value={formData.problemTypeId} onChange={handleChange} required className={selectCls}>
                                            <option value="">-- เลือกประเภท --</option>
                                            {masterData?.problemTypes.map(t => (
                                                <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                                            ))}
                                        </select>
                                    </SelectWrapper>
                                    
                                    <SelectWrapper label="ประเภทย่อย">
                                        <select name="problemSubtypeId" value={formData.problemSubtypeId} onChange={handleChange} disabled={!formData.problemTypeId || subtypes.length === 0} className={selectCls}>
                                            <option value="">-- เลือกประเภทย่อย --</option>
                                            {subtypes.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </SelectWrapper>
                                </div>

                                <div>
                                    <Label>หัวข้อ / รายละเอียดปัญหา <Req /></Label>
                                    <input
                                        name="projectName" value={formData.projectName} onChange={handleChange} required
                                        placeholder="เช่น คอมพิวเตอร์เปิดไม่ติด, ปริ้นเตอร์ไม่ทำงาน"
                                        className={inputCls}
                                    />
                                </div>
                            </div>

                            {/* Section 2 */}
                            <div className="space-y-4 pt-2">
                                <SectionHeader num="2" label="สถานที่และอุปกรณ์" />

                                <div className="grid grid-cols-2 gap-4">
                                    <SelectWrapper label="Location" required>
                                        <select name="locationId" value={formData.locationId} onChange={handleChange} required className={selectCls}>
                                            <option value="">-- เลือก Location --</option>
                                            {masterData?.locations.map(l => (
                                                <option key={l.id} value={l.id}>{l.name}</option>
                                            ))}
                                        </select>
                                    </SelectWrapper>
                                    
                                    <SelectWrapper label="Sub-Location">
                                        <select name="subLocationId" value={formData.subLocationId} onChange={handleChange} disabled={!formData.locationId || subLocations.length === 0} className={selectCls}>
                                            <option value="">-- เลือก Sub-Location --</option>
                                            {subLocations.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </SelectWrapper>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2">
                                        <SelectWrapper label="ประเภท Device">
                                            <select name="deviceTypeId" value={formData.deviceTypeId} onChange={handleChange} className={selectCls}>
                                                <option value="">-- เลือกประเภท --</option>
                                                {masterData?.deviceTypes.map(d => (
                                                    <option key={d.id} value={d.id}>{d.icon} {d.name}</option>
                                                ))}
                                            </select>
                                        </SelectWrapper>
                                    </div>
                                    <div>
                                        <Label>จำนวน</Label>
                                        <input type="number" name="deviceCount" value={formData.deviceCount} onChange={handleChange} min="1" className={inputCls} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>เบอร์ภายใน</Label>
                                        <input
                                            name="phone_internal" value={formData.phone_internal} onChange={handleChange}
                                            placeholder="เช่น 1234" className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <Label>เบอร์ส่วนตัว</Label>
                                        <input
                                            name="phone_personal" value={formData.phone_personal} onChange={handleChange}
                                            placeholder="เช่น 08x-xxx-xxxx" className={inputCls}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3 */}
                            <div className="space-y-4 pt-2">
                                <SectionHeader num="3" label="ความเร่งด่วนและกำหนดเวลา" />
                                
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <Label>ระดับความเร่งด่วน</Label>
                                        <div className="flex gap-2 mt-2">
                                            {['Normal', 'Medium', 'High', 'Critical'].map(level => {
                                                const isSelected = formData.priority === level;
                                                return (
                                                    <label key={level} className={`flex-1 cursor-pointer text-center px-2 py-2.5 border rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${getPriorityStyle(level, isSelected)}`}>
                                                        <input type="radio" name="priority" value={level} checked={isSelected} onChange={handleChange} className="hidden" />
                                                        {level}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div>
                                        <Label>วันที่ต้องการเสร็จ</Label>
                                        <input
                                            type="date"
                                            name="targetDate"
                                            value={formData.targetDate}
                                            onChange={handleChange}
                                            className={inputCls}
                                        />
                                        <p className="mt-2 text-[11px] font-medium text-slate-500">ค่าเริ่มต้นจะเป็นวันที่ปัจจุบัน และคุณสามารถเปลี่ยนได้หากไม่รีบ</p>
                                    </div>
                                </div>
                            </div>

                            {/* Notes & Attachments */}
                            <div className="space-y-4 pt-2">
                                <div>
                                    <Label>รายละเอียดเพิ่มเติม</Label>
                                    <textarea rows="3" name="requirements" value={formData.requirements} onChange={handleChange}
                                        className={`${inputCls} resize-none`}
                                        placeholder="ระบุซอฟต์แวร์ที่ต้องการ หรืออธิบายข้อมูลเพิ่มเติม..." />
                                </div>

                                <div>
                                    <Label>แนบไฟล์ (ไม่บังคับ)</Label>
                                    <div
                                        className="border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-300 cursor-pointer transition-all duration-300 group"
                                        onClick={() => document.getElementById('file-input').click()}
                                    >
                                        <input
                                            id="file-input" type="file" multiple accept=".jpg,.jpeg,.png,.gif,.pdf,.svg" className="hidden"
                                            onChange={(e) => {
                                                const files = Array.from(e.target.files);
                                                setAttachments(files);
                                            }}
                                        />
                                        <div className="flex flex-col items-center text-slate-400 group-hover:text-indigo-500 transition-colors">
                                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm mb-2 group-hover:scale-110 transition-transform">
                                                <Paperclip className="w-5 h-5" />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-600">คลิกเพื่อแนบไฟล์</p>
                                            <p className="text-[11px] mt-1 font-medium">รองรับ JPG, PNG, PDF (สูงสุด 5MB)</p>
                                        </div>
                                        
                                        {attachments.length > 0 && (
                                            <div className="mt-4 space-y-2 w-full max-w-md mx-auto">
                                                {attachments.map((f, i) => (
                                                    <div key={i} className="flex items-center gap-3 text-xs text-slate-600 bg-white px-4 py-2.5 rounded-xl border border-slate-100 shadow-sm" onClick={(e) => e.stopPropagation()}>
                                                        <Paperclip className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                                                        <span className="flex-1 truncate font-medium">{f.name}</span>
                                                        <span className="text-slate-400 font-medium">{(f.size / 1024).toFixed(0)} KB</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions (Sticky Bottom) */}
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white/80 backdrop-blur-md">
                            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all">
                                ยกเลิก
                            </button>
                            <button type="submit" className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all duration-300 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 active:scale-95 flex items-center gap-2">
                                <span>Submit Ticket</span>
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

// UI Components & Styles
const inputCls = "w-full bg-slate-50/50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all duration-300";
const selectCls = `${inputCls} appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 pr-10`;

const Label = ({ children }) => <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">{children}</label>;
const Req = () => <span className="text-rose-500 ml-0.5">*</span>;

const SectionHeader = ({ num, label }) => (
    <div className="flex items-center gap-3 mb-2">
        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black">
            {num}
        </div>
        <h3 className="text-sm font-bold text-slate-800">{label}</h3>
        <div className="flex-1 h-px bg-slate-100 ml-2"></div>
    </div>
);

// Wrapper สำหรับ Select เพื่อใส่ไอคอนลูกศรที่สวยกว่าค่า Default
const SelectWrapper = ({ label, required, children }) => (
    <div>
        <Label>{label} {required && <Req />}</Label>
        <div className="relative">
            {children}
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
            </div>
        </div>
    </div>
);