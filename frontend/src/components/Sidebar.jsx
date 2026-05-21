import React from 'react';
import { Computer, LogOut } from 'lucide-react';

export default function Sidebar({ user, logout, currentView, setCurrentView, isITStaff, IconLayoutDashboard, IconUser }) {
  return (
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

      <button
        onClick={logout}
        className="w-full flex items-center gap-3 p-3 rounded-xl text-red-600 hover:bg-red-50 transition font-medium text-sm mt-auto"
      >
        <LogOut className="w-5 h-5" /> Logout
      </button>
    </aside>
  );
}