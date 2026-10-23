'use client';

import React, { useState, useEffect } from 'react';
import Dialog from '@/components/ui/Dialog';
import { supabase } from '@/lib/supabase/client';
import { ActivityLog } from '@/types/settings';
import { RefreshCw, Search, User } from 'lucide-react';

export default function ModalAuditLogs({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setLogs((data as ActivityLog[]) || []);
    } catch (err) {
      console.error('Fetch audit logs error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  const filteredLogs = logs.filter(
    (l) =>
      (l.aktivitas && l.aktivitas.toLowerCase().includes(search.toLowerCase())) ||
      (l.nama && l.nama.toLowerCase().includes(search.toLowerCase())) ||
      (l.detail && l.detail.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Audit Log Aktivitas Sistem (100 Terakhir)"
      maxWidth="3xl"
    >
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari aktivitas, admin, rincian..."
              className="w-full text-xs pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-madin-600"
            />
          </div>

          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Muat Ulang</span>
          </button>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[55vh] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-semibold z-10">
              <tr>
                <th className="p-2.5 w-10 text-center">No</th>
                <th className="p-2.5 whitespace-nowrap">Waktu</th>
                <th className="p-2.5 whitespace-nowrap">Pengguna</th>
                <th className="p-2.5 whitespace-nowrap">Aksi / Aktivitas</th>
                <th className="p-2.5">Rincian Deskripsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-madin-600" />
                    Mengambil riwayat audit log...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Belum ada riwayat aktivitas tercatat.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => {
                  const dateStr = log.created_at
                    ? new Date(log.created_at).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '-';

                  return (
                    <tr key={log.id || idx} className="hover:bg-slate-50">
                      <td className="p-2.5 text-center text-slate-400">{idx + 1}</td>
                      <td className="p-2.5 font-mono text-slate-500 whitespace-nowrap text-[11px]">
                        {dateStr}
                      </td>
                      <td className="p-2.5 font-medium text-slate-800 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {log.nama || log.username || 'Admin'}
                        </span>
                      </td>
                      <td className="p-2.5 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {log.aktivitas}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-600">{log.detail || '-'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-white hover:bg-slate-900 shadow-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </Dialog>
  );
}
