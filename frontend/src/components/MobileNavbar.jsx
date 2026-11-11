import React from 'react';
import EmployeeAvatar from './EmployeeAvatar';
import { Menu } from 'lucide-react';
import logodaikin from '../../public/icon-daikin (Custom).png';

export default function MobileNavbar({ user, onMenuClick }) {
  return (
    <header className="md:hidden flex items-center justify-between px-4 py-3 bg-surface border-b border-line text-ink sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-ink transition-all hover:bg-paper active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          aria-label="Open navigation menu"
        >
          <Menu className="w-6 h-6" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2">
          <div className="bg-white p-1 rounded-lg">
            <img src={logodaikin} alt="DAIKIN" className="w-5 h-5 object-contain" />
          </div>
          <span className="text-sm font-black tracking-tight">
            IT HELP<span className="text-blue-400">|</span><span className="text-blue-400">DESK</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-xs font-semibold text-ink truncate max-w-[100px]">{user?.name?.split(' ')[0] || 'User'}</p>
          <p className="text-[10px] text-muted font-semibold tracking-tight">
            {user?.role === 'admin' ? 'ADMIN' : user?.role === 'it_staff' ? 'IT STAFF' : 'USER'}
          </p>
        </div>

        <EmployeeAvatar src={user?.empPic} name={user?.name} size={48} />
      </div>
    </header>
  );
}
