import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

const TOAST_STYLES = {
  success: {
    title: 'สำเร็จ',
    Icon: CheckCircle,
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  error: {
    title: 'เกิดข้อผิดพลาด',
    Icon: AlertCircle,
    className: 'border-rose-200 bg-rose-50 text-rose-700',
  },
  info: {
    title: 'แจ้งให้ทราบ',
    Icon: Info,
    className: 'border-sky-200 bg-sky-50 text-sky-700',
  },
};

export default function ToastNotification({ message, type = 'success', onDismiss }) {
  if (!message) return null;

  const toast = TOAST_STYLES[type] || TOAST_STYLES.info;
  const Icon = toast.Icon;

  return (
    <div className="fixed right-4 top-4 z-[120] w-[min(calc(100vw-2rem),24rem)] animate-fade">
      <div
        className={`flex items-center gap-3 rounded border px-4 py-3 shadow-md ${toast.className}`}
        role={type === 'error' ? 'alert' : 'status'}
        aria-live={type === 'error' ? 'assertive' : 'polite'}
      >
        <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{toast.title}</p>
          <p className="break-words text-sm font-medium">{message}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="ปิดการแจ้งเตือน"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded text-current opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}