'use client';

import React, { useEffect } from 'react';
import { useUndoRedoStore } from '@/stores/useUndoRedoStore';
import { RotateCcw, RotateCw, CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function FloatingUndoToast() {
  const { notification, dismissNotification, undo, undoStack, isExecuting } = useUndoRedoStore();

  useEffect(() => {
    if (!notification) return;

    const timer = setTimeout(() => {
      dismissNotification();
    }, 6000);

    return () => clearTimeout(timer);
  }, [notification, dismissNotification]);

  if (!notification) return null;

  const isAction = notification.type === 'action';
  const isUndo = notification.type === 'undo';
  const isRedo = notification.type === 'redo';
  const isError = notification.type === 'error';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 md:bottom-7 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 bg-slate-900/95 text-white text-xs sm:text-sm rounded-xl shadow-xl border border-slate-700/80 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-3 duration-200 max-w-[92vw] sm:max-w-md"
    >
      <div className="shrink-0">
        {isAction && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
        {isUndo && <RotateCcw className="w-4 h-4 text-amber-400" />}
        {isRedo && <RotateCw className="w-4 h-4 text-sky-400" />}
        {isError && <AlertCircle className="w-4 h-4 text-rose-400" />}
      </div>

      <div className="flex-1 truncate font-medium text-slate-200">
        {notification.message}
      </div>

      {isAction && undoStack.length > 0 && (
        <button
          type="button"
          onClick={async () => {
            await undo();
          }}
          disabled={isExecuting}
          className="shrink-0 px-2.5 py-1 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-amber-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Batalkan</span>
        </button>
      )}

      <button
        type="button"
        onClick={dismissNotification}
        className="shrink-0 p-1 text-slate-400 hover:text-white rounded-md transition-colors"
        title="Tutup pemberitahuan"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
