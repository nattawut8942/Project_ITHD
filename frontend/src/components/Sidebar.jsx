import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Computer, LogOut, LayoutDashboard, Ticket, User, BarChart2, Database, ChevronRight } from 'lucide-react';
import logodaikin from '../../public/icon-daikin (Custom).png';
export default function Sidebar({ user, isITStaff, logout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentView = new URLSearchParams(location.search).get('view') || 'all';

  const isActive = (path, view = null) => {
    if (view) return location.pathname === path && currentView === view;
    return location.pathname === path;
  };

  // Helper สำหรับสร้างปุ่มเมนูให้ดูคลีนขึ้น
  const MenuButton = ({ onClick, icon: Icon, label, active, colorClass, adminBadge }) => (
    <button
      onClick={onClick}
      className={`w-full group flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 mb-1 relative overflow-hidden ${
        active 
          ? `${colorClass} shadow-sm` 
          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
      }`}
    >
      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-current rounded-r-full" />}
      <Icon className={`w-5 h-5 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
      <span className="font-semibold text-sm tracking-wide">{label}</span>
      {adminBadge && !active && (
        <span className="ml-auto text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg font-bold uppercase">Admin</span>
      )}
      {active && <ChevronRight className="ml-auto w-4 h-4 opacity-40" />}
    </button>
  );

  return (
    <aside className="w-72 bg-slate-50/50 h-screen p-4 hidden md:flex flex-col z-10">
      <div className="bg-white border border-slate-200/60 rounded-[2rem] flex flex-col h-full shadow-xl shadow-slate-200/50 overflow-hidden">
        
        {/* Header Section */}
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3 px-2">
            <div className="relative">
              <div className="absolute inset-0 bg-white-500 blur-md opacity-20 animate-pulse"></div>
              <div className="relative bg-white-600  p-2 rounded-xl text-white shadow-slate-200 shadow-lg">
                <img src={logodaikin} alt="DAIKIN Logo" className="w-8 h-8 object-contain" />
                {/* <Computer className="w-6 h-6" /> */}
              </div>
            </div>
            <span className="text-xl font-black text-slate-800 tracking-tighter">
              IT HELP<span className="text-red-800">|</span><span className="text-indigo-600">DESK</span>
            </span>
          </div>
        </div>

        {/* User Profile Card */}
        <div className="px-6 py-4">
          <div className="bg-gradient-to-b from-slate-50 to-white border border-slate-100 rounded-3xl p-4 flex flex-col items-center shadow-sm">
            <div className="relative group cursor-default">
              <div className="absolute inset-0 bg-indigo-200 rounded-2xl blur-lg opacity-0 group-hover:opacity-40 transition-opacity"></div>
              <div className="relative w-20 h-22 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-indigo-50 flex items-center justify-center">
                {user?.empPic ? (
                  <img src={user.empPic} alt={user?.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                ) : (
                  <span className="text-indigo-600 font-bold text-2xl">{user?.name?.charAt(0) || 'U'}</span>
                )}
              </div>
            </div>
            
            <div className="mt-3 text-center w-full">
              <p className="text-slate-900 font-bold text-sm truncate leading-none">{user?.name || 'User Name'}</p>
              <p className="text-slate-400 text-[10px] mt-1.5 font-medium truncate uppercase tracking-wider">{user?.email || 'no-email@company.com'}</p>
              
              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-1">
                <p className="text-slate-500 text-[10px] font-semibold">{user?.sect_long || user?.sect || 'Department'}</p>
                <p className="text-slate-400 text-[9px]">CC: {user?.cost_center || 'N/A'}</p>
              </div>

              <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-tight shadow-sm ${
                isITStaff ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-100'
              }`}>
                {isITStaff ? '✨ IT STAFF' : '👤 EMPLOYEE'}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="px-4 mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">General</span>
          </div>
          
          <MenuButton 
            label="Dashboard" 
            icon={LayoutDashboard} 
            active={isActive('/dashboard')} 
            colorClass="bg-indigo-50 text-indigo-700"
            onClick={() => navigate('/dashboard')} 
          />
          
          <MenuButton 
            label="All Tickets" 
            icon={Ticket} 
            active={isActive('/') && currentView === 'all'} 
            colorClass="bg-indigo-50 text-indigo-700"
            onClick={() => navigate('/?view=all')} 
          />

          <MenuButton 
            label="My Tickets" 
            icon={User} 
            active={isActive('/') && currentView === 'mine'} 
            colorClass="bg-indigo-50 text-indigo-700"
            onClick={() => navigate('/?view=mine')} 
          />

          {isITStaff && (
            <div className="mt-6">
              <div className="px-4 mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Admin Tools</span>
              </div>
              <MenuButton 
                label="Reports" 
                icon={BarChart2} 
                active={isActive('/report')} 
                colorClass="bg-emerald-50 text-emerald-700"
                onClick={() => navigate('/report')} 
              />
              <MenuButton 
                label="Master Data" 
                icon={Database} 
                active={isActive('/master')} 
                colorClass="bg-violet-50 text-violet-700"
                onClick={() => navigate('/master')} 
              />
            </div>
          )}
        </nav>

        {/* Bottom Section / Logout */}
        <div className="p-4 mt-auto border-t border-slate-50">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-3 p-3.5 rounded-2xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all duration-300 font-bold text-sm border border-transparent hover:border-red-100 shadow-sm hover:shadow-red-100 shadow-transparent"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
          
          <div className="mt-5 text-center flex flex-col items-center justify-center gap-0.5">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Developed by</p>
            <p className="text-[11px] font-black text-indigo-600 tracking-wider bg-indigo-50 px-3 py-1 rounded-full w-max">NATTHAWUT.Y</p>
          </div>
        </div>
      </div>
    </aside>
  );
}