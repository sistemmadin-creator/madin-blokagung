'use client';

import React, { useState, useMemo } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useAbsensiStore } from '@/stores/useAbsensiStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { RecordSesiAbsensi } from '@/types/absensi';
import { Asatidz } from '@/types/asatidz';
import { Copy, CheckCheck } from 'lucide-react';

export default function ModalGeneratorWA({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { absensiMapByDate, selectedDate } = useAbsensiStore();
  const { asatidzList } = useAsatidzStore();

  const [date, setDate] = useState(selectedDate);
  const [includeJam12, setIncludeJam12] = useState(true);
  const [includeJam3, setIncludeJam3] = useState(true);
  const [includeJam4, setIncludeJam4] = useState(true);
  const [genderFilter, setGenderFilter] = useState<'SEMUA' | 'PA' | 'PI'>('SEMUA');
  const [copied, setCopied] = useState(false);

  // Generate WhatsApp text
  const waText = useMemo(() => {
    const sessions = absensiMapByDate[date];
    if (!sessions) {
      return `*LAPORAN REKAPITULASI PRESENSI KBM ASATIDZ*\nMadrasah Diniyyah Al Amiriyyah Blokagung\nTanggal: ${date}\n\nBelum ada data presensi yang tersimpan untuk tanggal ini.`;
    }

    // Collect all records according to active sessions
    let allRecords: RecordSesiAbsensi[] = [];
    if (includeJam12) {
      if (sessions[1]) allRecords = allRecords.concat(sessions[1]);
      if (sessions[2]) allRecords = allRecords.concat(sessions[2]);
    }
    if (includeJam3 && sessions[3]) {
      allRecords = allRecords.concat(sessions[3]);
    }
    if (includeJam4 && sessions[4]) {
      allRecords = allRecords.concat(sessions[4]);
    }

    // Map gender lookup
    const asatidzMap = new Map<string, Asatidz>();
    asatidzList.forEach((a) => asatidzMap.set(a.nama_asatidz.toUpperCase(), a));

    if (genderFilter !== 'SEMUA') {
      allRecords = allRecords.filter((r) => {
        const aObj = asatidzMap.get(r.nama_asatidz.toUpperCase());
        return aObj?.pa_pi === genderFilter;
      });
    }

    const total = allRecords.length;
    const hadir = allRecords.filter((r) => r.status === 'Hadir').length;
    const izin = allRecords.filter((r) => r.status === 'Izin').length;
    const sakit = allRecords.filter((r) => r.status === 'Sakit').length;
    const alfa = allRecords.filter((r) => r.status === 'Alfa').length;
    const badal = allRecords.filter((r) => r.status === 'Badal').length;

    const persen = total > 0 ? Math.round((hadir / total) * 100) : 0;

    const tidakHadirList = allRecords.filter((r) => r.status !== 'Hadir');

    let text = `*LAPORAN REKAPITULASI PRESENSI KBM ASATIDZ*\n`;
    text += `*MADRASAH DINIYYAH AL AMIRIYYAH BLOKAGUNG*\n`;
    text += `Tanggal : ${date}\n`;
    text += `Kategori : ${genderFilter === 'SEMUA' ? 'Putra & Putri' : genderFilter === 'PA' ? 'Santri Putra' : 'Santri Putri'}\n`;
    text += `---------------------------------------------------\n`;
    text += `TOTAL SLOT TUGAS : ${total}\n`;
    text += `✅ HADIR : ${hadir} (${persen}%)\n`;
    text += `⚠️ IZIN  : ${izin}\n`;
    text += `🏥 SAKIT : ${sakit}\n`;
    text += `❌ ALFA  : ${alfa}\n`;
    text += `🔄 BADAL : ${badal}\n`;
    text += `---------------------------------------------------\n`;

    if (tidakHadirList.length === 0) {
      text += `_Alhamdulillah seluruh dewan asatidz hadir lengkap._\n`;
    } else {
      text += `*DAFTAR ASATIDZ TIDAK HADIR / BADAL:*\n`;
      tidakHadirList.forEach((r, idx) => {
        text += `${idx + 1}. *${r.nama_asatidz}* (${r.kelas} - ${r.fan})\n`;
        text += `   Status: *${r.status}*`;
        if (r.status === 'Badal' && r.asatidz_pengganti) {
          text += ` (Badal: ${r.asatidz_pengganti})`;
        }
        text += `\n`;
      });
    }

    text += `---------------------------------------------------\n`;
    text += `_Dilaporkan otomatis oleh Sistem Informasi Madin Al Amiriyyah_`;

    return text;
  }, [absensiMapByDate, date, includeJam12, includeJam3, includeJam4, genderFilter, asatidzList]);

  const handleCopy = () => {
    navigator.clipboard.writeText(waText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Generator Pesan WhatsApp Rekapitulasi Presensi"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tanggal Laporan</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Kategori Dewan Asatidz</label>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value as 'SEMUA' | 'PA' | 'PI')}
              className="w-full py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
            >
              <option value="SEMUA">Semua (Putra & Putri)</option>
              <option value="PA">Khusus Ustadz (PA)</option>
              <option value="PI">Khusus Ustadzah (PI)</option>
            </select>
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="block font-semibold text-slate-700">Sesi Jam Pelajaran:</label>
            <div className="flex flex-wrap gap-4 pt-0.5">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeJam12}
                  onChange={(e) => setIncludeJam12(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600"
                />
                <span>Jam 1 & 2 (Diniyyah)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeJam3}
                  onChange={(e) => setIncludeJam3(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600"
                />
                <span>Jam 3 (Bandongan/Syawir)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeJam4}
                  onChange={(e) => setIncludeJam4(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600"
                />
                <span>Jam 4 (Takror)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Preview Area */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Preview Teks Pesan WhatsApp:
          </label>
          <pre className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs font-mono text-slate-800 whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed">
            {waText}
          </pre>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
          >
            {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Teks Tersalin!' : 'Salin Teks WhatsApp'}</span>
          </button>
        </div>
      </div>
    </Dialog>
  );
}
