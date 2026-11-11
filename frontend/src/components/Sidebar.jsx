import React from 'react';
import EmployeeAvatar from './EmployeeAvatar';
import { useNavigate, useLocation } from 'react-router-dom';
import { Computer, LogOut, LayoutDashboard, Ticket, User, BarChart2, Database, ChevronRight, Monitor, X, ShieldCheck, History } from 'lucide-react';
import logodaikin from '../../public/icon-daikin (Custom).png';

export default function Sidebar({ user, isITStaff, logout, mobileOpen, setMobileOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentView = new URLSearchParams(location.search).get('view') || 'all';

  const isActive = (path, view = null) => {
    if (view) return location.pathname === path && currentView === view;
    return location.pathname === path;
  };

  const handleMenuClick = (path) => {
    navigate(path);
    if (setMobileOpen) setMobileOpen(false); // Close mobile drawer
  };

  // Helper สำหรับสร้างปุ่มเมนูที่ปรับปรุงแล้ว (สไตล์ Modern & Formal ลดความโค้งมน)
  const MenuButton = ({ onClick, icon: Icon, label, active, adminBadge }) => (
    <button
      onClick={onClick}
      className={`relative w-full min-h-[44px] group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 mb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 ${
        active
          ? 'bg-ink text-white shadow-soft'
          : 'text-ink-soft hover:text-ink hover:bg-paper hover:translate-x-0.5'
      }`}
    >
      {/* ไอคอน */}
      <Icon className={`w-4 h-4 xl:w-5 xl:h-5 transition-colors duration-200 ${
        active ? 'text-white' : 'text-muted group-hover:text-ink'
      }`} />

      {/* ข้อความ */}
      <span className={`font-semibold text-[13px] xl:text-sm tracking-wide whitespace-nowrap truncate block w-full text-left ${
        active ? 'text-white' : ''
      }`}>
        {label}
      </span>

      {/* Admin Badge */}
      {adminBadge && !active && (
        <span className="ml-auto rounded-full bg-surface text-muted px-2 py-0.5 text-[10px] font-semibold border border-line">
          Admin
        </span>
      )}

      {/* ลูกศรขวาเมื่อ Active */}
      {active && <ChevronRight className="ml-auto w-3.5 h-3.5 xl:w-4 xl:h-4 text-white/70" />}
    </button>
  );

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside 
        className={`w-64 xl:w-72 bg-surface border-r border-line h-screen h-[100dvh] flex flex-col z-50 transition-transform duration-300
          ${mobileOpen 
            ? 'fixed inset-y-0 left-0 translate-x-0 shadow-2xl' 
            : 'hidden md:flex -translate-x-full md:translate-x-0'}
        `}
      >
        {/* Header Section (Flat & Formal) */}
        <div className="h-16 xl:h-20 flex items-center justify-between px-4 xl:px-6 bg-surface border-b border-line shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-lg shadow-sm flex items-center justify-center border border-slate-200">
              <img src={logodaikin} alt="DAIKIN Logo" className="w-5 h-5 xl:w-6 xl:h-6 object-contain" />
            </div>
            <span className="text-lg xl:text-xl font-display font-bold text-ink tracking-tight flex items-center">
              IT HELP<span className="text-muted mx-1 font-normal">|</span><span className="text-blue-600 font-bold">DESK</span>
            </span>
          </div>

          {/* Mobile Close Button */}
          {mobileOpen && (
            <button 
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation menu" className="flex h-11 w-11 items-center justify-center bg-paper hover:bg-line text-ink rounded-lg md:hidden transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* User Profile Section (Corporate Structure) */}
        <div className="p-5 border-b border-line bg-surface shrink-0">
          <div className="flex items-start gap-3 xl:gap-4">
            <div className="relative shrink-0">
              <EmployeeAvatar src={user?.empPic} name={user?.name} size={56} className="rounded-full ring-1 ring-line" />
              <div className="absolute -bottom-1 -right-1 bg-green-500 w-3.5 h-3.5 xl:w-4 xl:h-4 rounded-full border-2 border-surface"></div>
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-ink font-semibold text-sm truncate">
                {user?.name || 'User Name'}
              </p>
              <p className="text-muted text-xs truncate mb-1.5">
                {user?.email || 'no-email@company.com'}
              </p>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold border ${
                isITStaff
                  ? 'bg-ink text-white border-ink'
                  : 'bg-teal/10 text-teal border-teal/25'
              }`}>
                {isITStaff ? 'IT STAFF' : 'USER'}
              </span>
            </div>
          </div>

          {/* ปรับ grid โดยเพิ่ม gap-x-2 เพื่อเว้นช่องว่างแนวนอน */}
          <div className="mt-4 pt-4 border-t border-line grid grid-cols-2 gap-y-3 gap-x-3 text-left">
            {/* ใส่ col-span-2 ให้ Section เพื่อให้มันอยู่เต็มบรรทัดบน */}
            <div className="col-span-2">
              <p className="text-muted text-[11px] mb-0.5">Section</p>
              <p className="text-ink-soft font-medium text-xs truncate pr-2" title={user?.sect_long || user?.sect || 'Department'}>
                {user?.sect_long || user?.sect || 'DEPARTMENT'}
              </p>
            </div>
            {/* Position และ Cost Center จะถูกแบ่งคนละ 50% ในบรรทัดเดียวกันอัตโนมัติ */}
            <div>
              <p className="text-muted text-[11px] mb-0.5">Position</p>
              <p className="text-ink-soft font-medium text-xs truncate">
                {user?.Position || 'POSITION'}
              </p>
            </div>
            <div>
              <p className="text-muted text-[11px] mb-0.5">Cost Center</p>
              <p className="text-ink-soft font-medium text-xs truncate">
                {user?.cost_center || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
          
          <div className="px-4 mb-4">
            <h3 className="px-3 text-[11px] font-semibold text-muted mb-2">
              General
            </h3>
            <nav className="space-y-0.5">
              <MenuButton
                label="Dashboard"
                icon={LayoutDashboard}
                active={isActive('/dashboard')}
                onClick={() => handleMenuClick('/dashboard')}
              />
              <MenuButton
                label="All Tickets"
                icon={Ticket}
                active={isActive('/') && currentView === 'all'}
                onClick={() => handleMenuClick('/?view=all')}
              />
              <MenuButton
                label="My Tickets"
                icon={User}
                active={isActive('/') && currentView === 'mine'}
                onClick={() => handleMenuClick('/?view=mine')}
              />
            </nav>
          </div>

          {isITStaff && (
            <div className="px-4 mb-4">
              <h3 className="px-3 text-[11px] font-semibold text-muted mb-2">
                Admin Tools
              </h3>
              <nav className="space-y-0.5">
                <MenuButton
                  label="Reports"
                  icon={BarChart2}
                  active={isActive('/report')}
                  onClick={() => handleMenuClick('/report')}
                />
                {Array.isArray(user?.permissions) && user.permissions.includes('master.edit') && (
                  <MenuButton
                    label="Master Data"
                    icon={Database}
                    active={isActive('/master')}
                    onClick={() => handleMenuClick('/master')}
                    adminBadge={true}
                  />
                )}
                {Array.isArray(user?.permissions) && user.permissions.includes('users.manage') && (
                  <MenuButton
                    label="จัดการสิทธิ์"
                    icon={ShieldCheck}
                    active={isActive('/admin/users')}
                    onClick={() => handleMenuClick('/admin/users')}
                    adminBadge={true}
                  />
                )}
                {Array.isArray(user?.permissions) && user.permissions.includes('logs.view') && (
                  <MenuButton
                    label="ประวัติการเข้าสู่ระบบ"
                    icon={History}
                    active={isActive('/admin/login-logs')}
                    onClick={() => handleMenuClick('/admin/login-logs')}
                    adminBadge={true}
                  />
                )}
              </nav>
            </div>
          )}
        </div>

        {/* Bottom Section / Logout */}
        <div className="p-4 border-t border-line bg-surface shrink-0">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mb-3 xl:mb-4 text-sm font-semibold min-h-[44px] text-ink-soft hover:text-ink bg-paper hover:bg-line border border-line rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>

          <div className="text-center flex flex-col items-center justify-center">
            <span className="text-[11px] text-muted mb-1">
              Developed By
            </span>
            <span className="text-[11px] font-semibold text-ink-soft bg-paper px-2 py-0.5 rounded-full border border-line">
              NATTHAWUT.Y
            </span>
          </div>
        </div>
        
      </aside>

      {/* Global Style for Custom Scrollbar (สามารถนำไปใส่ใน index.css หรือ global css ของโปรเจกต์ได้) */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569; 
        }
      `}</style>
    </>
  );
}

