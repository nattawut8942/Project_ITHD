import { AlertCircle } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isLoading = false,
  loadingLabel = 'กำลังดำเนินการ...',
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={isLoading ? undefined : onCancel}
      />
      <div
        className="relative z-[110] w-full max-w-sm overflow-hidden rounded-3xl border border-white/50 bg-white p-6 text-center shadow-2xl animate-modal-pop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-message"
        aria-busy={isLoading}
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 ring-4 ring-rose-50/50">
          <AlertCircle className="h-8 w-8 text-rose-500" />
        </div>
        <h3 id="confirm-modal-title" className="mb-2 text-xl font-black text-slate-800">{title}</h3>
        <p id="confirm-modal-message" className="mb-8 whitespace-pre-line px-4 text-sm font-medium leading-relaxed text-slate-500">{message}</p>

        <div className="flex w-full gap-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="flex-1 min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 py-3 text-sm font-bold text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className="flex-1 min-h-[44px] rounded-xl bg-ink py-3 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 shadow-lg shadow-ink/20 transition-all hover:bg-ink-soft active:scale-95 disabled:pointer-events-none disabled:opacity-50"
          >
            {isLoading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}