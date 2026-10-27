'use client';

import { useEffect } from 'react';
import { useUndoRedoStore } from '@/stores/useUndoRedoStore';

export default function UndoRedoGlobalHandler() {
  const { undo, redo, isExecuting } = useUndoRedoStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Abaikan jika modifier Ctrl/Cmd tidak ditekan
      if (!e.ctrlKey && !e.metaKey) return;

      // Abaikan jika fokus sedang berada di input atau textarea agar native typing undo tetap bekerja normal
      const target = e.target as HTMLElement | null;
      if (target) {
        const tagName = target.tagName;
        const isEditable = target.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA';
        if (isEditable) return;
      }

      const key = e.key.toLowerCase();

      // Ctrl + Z (Undo)
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (!isExecuting) {
          undo();
        }
      }
      // Ctrl + Y ATAU Ctrl + Shift + Z (Redo)
      else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        if (!isExecuting) {
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, isExecuting]);

  return null;
}
