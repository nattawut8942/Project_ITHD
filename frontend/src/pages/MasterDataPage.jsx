// frontend/src/pages/MasterDataPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { Plus, Pencil, Trash2, X, Check, ChevronDown, ChevronRight, Settings, Database } from 'lucide-react';
import { API_BASE } from '../config/api';

const SECTIONS = [
  { key: 'problem_types',    label: 'Problem Types',      hasParent: false, parentKey: null,            parentLabel: null },
  { key: 'problem_subtypes', label: 'Problem Subtypes',   hasParent: true,  parentKey: 'problem_types', parentLabel: 'Problem Types' },
  { key: 'locations',        label: 'Locations',          hasParent: false, parentKey: null,            parentLabel: null },
  { key: 'sub_locations',    label: 'Sub-Locations',      hasParent: true,  parentKey: 'locations',     parentLabel: 'Locations' },
  { key: 'device_types',     label: 'Device Types',       hasParent: false, parentKey: null,            parentLabel: null },
];

const token = () => localStorage.getItem('authToken');

async function apiCall(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
    body: body ? JSON.stringify(body) : undefined,
  });   
  return res.json();
}

export default function MasterDataPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isITStaff = user?.cost_center === '7510';

  const [data, setData] = useState({});
  const [activeSection, setActiveSection] = useState('problem_types');
  const [editItem, setEditItem] = useState(null);
  const [addForm, setAddForm] = useState({ name: '', icon: '', parent_id: '' });
  const [showAdd, setShowAdd] = useState(false);
  const [notification, setNotification] = useState(null);
  const [expandedParents, setExpandedParents] = useState({});

  useEffect(() => {
    if (!isITStaff) { navigate('/'); return; }
    fetchAll();
  }, [isITStaff]);

  const fetchAll = async () => {
    const res = await apiCall('GET', '/master/all');
    if (res.success) {
      setData({
        problem_types:    res.data.problemTypes,
        problem_subtypes: res.data.problemSubtypes,
        locations:        res.data.locations,
        sub_locations:    res.data.subLocations,
        device_types:     res.data.deviceTypes,
      });
    }
  };

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const section = SECTIONS.find(s => s.key === activeSection);
  const items = data[activeSection] || [];
  const parentItems = section.hasParent ? (data[section.parentKey] || []) : [];

  const handleAdd = async () => {
    if (!addForm.name.trim()) return;
    const payload = { name: addForm.name, icon: addForm.icon };
    if (section.hasParent) payload.parent_id = parseInt(addForm.parent_id);
    const res = await apiCall('POST', `/master/${activeSection}`, payload);
    if (res.success) { notify('เพิ่มรายการสำเร็จ'); fetchAll(); setAddForm({ name: '', icon: '', parent_id: '' }); setShowAdd(false); }
    else notify(res.message || 'เกิดข้อผิดพลาด', 'error');
  };

  const handleEdit = async () => {
    if (!editItem?.name?.trim()) return;
    const res = await apiCall('PUT', `/master/${activeSection}/${editItem.id}`, { name: editItem.name, icon: editItem.icon });
    if (res.success) { notify('อัปเดตข้อมูลสำเร็จ'); fetchAll(); setEditItem(null); }
    else notify(res.message || 'เกิดข้อผิดพลาด', 'error');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('คุณต้องการลบรายการนี้ใช่หรือไม่? ข้อมูลที่เกี่ยวข้องอาจได้รับผลกระทบ')) return;
    const res = await apiCall('DELETE', `/master/${activeSection}/${id}`);
    if (res.success) { notify('ลบรายการสำเร็จ'); fetchAll(); }
    else notify(res.message || 'เกิดข้อผิดพลาด', 'error');
  };

  const groupedItems = section.hasParent
    ? parentItems.map(p => ({
        parent: p,
        children: items.filter(i => {
          const f = section.key === 'problem_subtypes' ? 'type_id' : 'location_id';
          return i[f] === p.id;
        })
      }))
    : null;

  if (!isITStaff) return null;

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans flex overflow-hidden">
      <Sidebar user={user} isITStaff={isITStaff} logout={logout} />

      <main className="flex-1 flex flex-col h-screen overflow-hidden p-4 pl-0">
        <div className="bg-white rounded-[2rem] flex flex-col h-full shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-200/60 relative">
          
          {/* Notification Toast */}
          {notification && (
            <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-300">
              <div className={`flex items-center gap-3.5 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-md border border-white/20 min-w-[280px] ${
                notification.type === 'error' 
                  ? 'bg-rose-500/95 text-white shadow-rose-500/20' 
                  : 'bg-emerald-500/95 text-white shadow-emerald-500/20'
              }`}>
                <div className="bg-white/20 p-2 rounded-full shrink-0">
                  {notification.type === 'error' ? <X className="w-4 h-4"/> : <Check className="w-4 h-4"/>}
                </div>
                <div className="flex-1 pr-2">
                  <p className="font-bold text-sm leading-tight">
                    {notification.type === 'error' ? 'เกิดข้อผิดพลาด' : 'สำเร็จ'}
                  </p>
                  <p className="text-white/90 text-xs font-semibold mt-0.5">{notification.msg}</p>
                </div>
                <button 
                  onClick={() => setNotification(null)} 
                  className="p-1 hover:bg-white/10 rounded-lg transition text-white/70 hover:text-white shrink-0"
                >
                  <X className="w-4 h-4"/>
                </button>
              </div>
            </div>
          )}
          {/* Header */}
          <header className="px-8 py-6 border-b border-slate-100 bg-white flex justify-between items-center z-10 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center ring-4 ring-violet-50/50">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Master Data</h1>
                <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-widest">จัดการตัวเลือกของระบบ</p>
              </div>
            </div>
          </header>

          <div className="flex flex-1 overflow-hidden">
            
            {/* Left Nav Menu */}
            <div className="w-64 bg-slate-50/30 border-r border-slate-100 p-6 flex flex-col gap-2 shrink-0 overflow-y-auto custom-scrollbar">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-2">Data Categories</p>
              {SECTIONS.map(s => {
                const isActive = activeSection === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => { setActiveSection(s.key); setShowAdd(false); setEditItem(null); }}
                    className={`group w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 relative overflow-hidden ${
                      isActive ? 'bg-white text-violet-700 shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-white hover:text-slate-800'
                    }`}
                  >
                    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-violet-600 rounded-r-full" />}
                    <span className="relative z-10">{s.label}</span>
                    <span className={`relative z-10 text-[10px] px-2 py-1 rounded-lg font-bold transition-colors ${
                      isActive ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                    }`}>
                      {(data[s.key] || []).length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/20 custom-scrollbar relative">
              <div className="w-full"> {/* แก้ตรงนี้: เอา max-w-4xl ออก เปลี่ยนเป็น w-full ให้ยืดสุดจอ */}
                
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{section.label}</h2>
                    <p className="text-sm text-slate-500 mt-1">รายการทั้งหมดในหมวดหมู่นี้</p>
                  </div>
                  <button
                    onClick={() => { setShowAdd(!showAdd); setAddForm({ name: '', icon: '', parent_id: '' }); }}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 shadow-sm ${
                      showAdd 
                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' 
                        : 'bg-violet-600 text-white hover:bg-violet-700 hover:shadow-violet-500/30 shadow-violet-500/20 active:scale-95'
                    }`}
                  >
                    {showAdd ? <X className="w-4 h-4"/> : <Plus className="w-4 h-4"/>} 
                    {showAdd ? 'ปิดหน้าต่าง' : 'เพิ่มรายการใหม่'}
                  </button>
                </div>

                {/* Add Form */}
                {showAdd && (
                  <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6 mb-8 animate-in slide-in-from-top-2 fade-in duration-200">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-violet-50 flex items-center justify-center"><Plus className="w-4 h-4 text-violet-600"/></div>
                      สร้าง {section.label}
                    </h3>
                    <div className="flex flex-wrap gap-4 items-end">
                      {section.hasParent && (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{section.parentLabel} <span className="text-rose-500">*</span></label>
                          <select
                            value={addForm.parent_id}
                            onChange={e => setAddForm(f => ({ ...f, parent_id: e.target.value }))}
                            className={inputCls + " min-w-[200px]"}
                          >
                            <option value="">-- เลือกรายการหลัก --</option>
                            {parentItems.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                      )}
                      
                      <div className="flex flex-col gap-1.5 flex-1 min-w-[250px]">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">ชื่อรายการ <span className="text-rose-500">*</span></label>
                        <input
                          value={addForm.name}
                          onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && handleAdd()}
                          placeholder="ระบุชื่อที่ต้องการเพิ่ม..."
                          className={inputCls}
                        />
                      </div>

                      {!section.hasParent && (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide text-center">Icon</label>
                          <input
                            value={addForm.icon}
                            onChange={e => setAddForm(f => ({ ...f, icon: e.target.value }))}
                            placeholder="💻"
                            className={inputCls + " w-20 text-center text-lg"}
                          />
                        </div>
                      )}
                      
                      <button onClick={handleAdd} className="bg-violet-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-violet-700 hover:shadow-lg hover:shadow-violet-500/30 transition-all duration-300 active:scale-95">
                        บันทึกข้อมูล
                      </button>
                    </div>
                  </div>
                )}

                {/* Items List Table */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  
                  {/* Table Header - แก้บัค Grid ล้นเกิน 12 ช่อง */}
                  <div className="grid grid-cols-12 px-6 py-4 bg-slate-50/80 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <div className="col-span-1">ID</div>
                    {section.hasParent && <div className="col-span-3">{section.parentLabel}</div>}
                    <div className={section.hasParent ? 'col-span-6' : 'col-span-7'}>Name</div> {/* แก้ตรงนี้: ลดจาก 9 เป็น 7 */}
                    {!section.hasParent && <div className="col-span-2 text-center">Icon</div>}
                    <div className="col-span-2 text-right">Actions</div>
                  </div>

                  {/* Table Body */}
                  <div className="divide-y divide-slate-50">
                    {section.hasParent ? (
                      groupedItems?.map(({ parent, children }) => (
                        <div key={parent.id} className="group/parent">
                          <div
                            className="flex items-center gap-3 px-6 py-3.5 bg-slate-50/50 hover:bg-indigo-50/30 transition-colors cursor-pointer"
                            onClick={() => setExpandedParents(p => ({ ...p, [parent.id]: !p[parent.id] }))}
                          >
                            <div className="w-5 h-5 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover/parent:border-indigo-300 group-hover/parent:text-indigo-500 transition-colors">
                              {expandedParents[parent.id] ? <ChevronDown className="w-3 h-3"/> : <ChevronRight className="w-3 h-3"/>}
                            </div>
                            <span className="text-sm font-bold text-slate-700">{parent.icon} {parent.name}</span>
                            <span className="ml-auto text-[11px] font-semibold text-slate-400 bg-white px-2.5 py-1 rounded-full border border-slate-100">{children.length} รายการ</span>
                          </div>
                          
                          <div className={`overflow-hidden transition-all duration-300 ${expandedParents[parent.id] === false ? 'max-h-0' : 'max-h-[2000px]'}`}>
                            {children.length > 0 ? children.map(item => (
                              <ItemRow key={item.id} item={item} section={section} editItem={editItem} setEditItem={setEditItem} handleEdit={handleEdit} handleDelete={handleDelete} indent />
                            )) : (
                              <div className="px-14 py-4 text-xs font-medium text-slate-400 bg-white">ไม่มีข้อมูลย่อย</div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      items.map(item => (
                        <ItemRow key={item.id} item={item} section={section} editItem={editItem} setEditItem={setEditItem} handleEdit={handleEdit} handleDelete={handleDelete} />
                      ))
                    )}
                  </div>

                  {/* Empty State */}
                  {items.length === 0 && (
                    <div className="px-6 py-16 flex flex-col items-center justify-center text-slate-400 bg-slate-50/30">
                      <Database className="w-12 h-12 mb-3 text-slate-200" />
                      <p className="text-sm font-bold text-slate-500">ยังไม่มีข้อมูลในหมวดหมู่นี้</p>
                      <p className="text-xs mt-1">กดปุ่ม "เพิ่มรายการใหม่" ด้านบนเพื่อเริ่มต้น</p>
                    </div>
                  )}
                </div>
                
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Sub-component สำหรับแถวข้อมูล (ปรับแก้ Grid ให้สอดคล้องกับ Header)
function ItemRow({ item, section, editItem, setEditItem, handleEdit, handleDelete, indent }) {
  const isEditing = editItem?.id === item.id;

  return (
    <div className={`group flex grid grid-cols-12 px-6 py-3.5 items-center bg-white hover:bg-slate-50/80 transition-colors ${indent ? 'pl-14' : ''}`}>
      <div className="col-span-1 text-xs font-semibold text-slate-400">#{item.id}</div>
      
      {section.hasParent && <div className="col-span-3" />}
      
      <div className={section.hasParent ? 'col-span-6' : 'col-span-7'}> {/* แก้ตรงนี้: ลดจาก 9 เป็น 7 */}
        {isEditing ? (
          <input
            value={editItem.name}
            onChange={e => setEditItem(ei => ({ ...ei, name: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleEdit()}
            className="border-2 border-violet-400 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-4 focus:ring-violet-500/20 w-full shadow-sm"
            autoFocus
          />
        ) : (
          <span className="text-sm font-semibold text-slate-700">{item.name}</span>
        )}
      </div>

      {!section.hasParent && (
        <div className="col-span-2 text-center">
          {isEditing ? (
            <input
              value={editItem.icon || ''}
              onChange={e => setEditItem(ei => ({ ...ei, icon: e.target.value }))}
              className="border-2 border-violet-400 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-4 focus:ring-violet-500/20 w-16 text-center mx-auto shadow-sm"
            />
          ) : (
            <span className="text-xl bg-slate-50 w-10 h-10 inline-flex items-center justify-center rounded-xl border border-slate-100">{item.icon || '—'}</span>
          )}
        </div>
      )}

      <div className="col-span-2 flex justify-end gap-2">
        {isEditing ? (
          <>
            <button onClick={handleEdit} className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors shadow-sm"><Check className="w-4 h-4"/></button>
            <button onClick={() => setEditItem(null)} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors shadow-sm"><X className="w-4 h-4"/></button>
          </>
        ) : (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            <button onClick={() => setEditItem({ ...item })} className="p-2 text-slate-400 bg-white border border-slate-200 hover:text-violet-600 hover:bg-violet-50 hover:border-violet-200 rounded-lg transition-all shadow-sm">
              <Pencil className="w-3.5 h-3.5"/>
            </button>
            <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 bg-white border border-slate-200 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 rounded-lg transition-all shadow-sm">
              <Trash2 className="w-3.5 h-3.5"/>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Styling ตัวช่วยสำหรับ Input
const inputCls = "w-full bg-slate-50/50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all duration-300";