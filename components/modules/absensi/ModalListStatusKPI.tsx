'use client';

import React, { useMemo } from 'react';
import { X, ListChecks, CheckCircle2, Info, AlertTriangle, Clock } from 'lucide-react';
import {
  JamKbm,
  KpiKategori,
  SesiJadwalHarian,
  StatusSesiData,
} from '@/types/absensi';
import { formatTanggalPanjangIndo } from '@/lib/utils/absensiHelper';
import { formatLabelBlokHariKBM } from '@/lib/utils/jadwalHelper';

interface ModalListStatusKPIProps {
  isOpen: boolean;
  onClose: () => void;
  kategori: KpiKategori | null;
  tanggal: string;
  sesiHariIni: Record<JamKbm, SesiJadwalHarian[]>;
  getSesiStatusData: (sesi: SesiJadwalHarian) => StatusSesiData;
}

const KONFIG_KATEGORI: Record<
  KpiKategori,
  {
    title: string;
    subtitle: string;
    headerBg: string;
    badgeBg: string;
  }
> = {
  SEMUA: {
    title: 'Daftar Semua Sesi KBM Hari Ini',
    subtitle: 'Seluruh sesi jadwal mengajar Jam Ke-1 s/d Jam Ke-4',
    headerBg: 'bg-slate-800 text-white',
    badgeBg: 'bg-slate-700 text-slate-100',
  },
  Hadir: {
    title: 'Daftar Sesi Status: Hadir',
    subtitle: 'Sesi mengajar dengan status kehadiran Hadir',
    headerBg: 'bg-emerald-700 text-white',
    badgeBg: 'bg-emerald-800 text-emerald-100',
  },
  IZIN_SAKIT: {
    title: 'Daftar Sesi Status: Izin / Sakit / Tugas Lain',
    subtitle: 'Sesi mengajar dengan status Izin, Sakit, atau Tugas Lain',
    headerBg: 'bg-sky-700 text-white',
    badgeBg: 'bg-sky-800 text-sky-100',
  },
  ALFA: {
    title: 'Daftar Sesi Status: Alfa / Jadwal Kosong',
    subtitle: 'Sesi mengajar dengan status Alfa atau Jadwal Kosong',
    headerBg: 'bg-rose-700 text-white',
    badgeBg: 'bg-rose-800 text-rose-100',
  },
  TERLAMBAT_GANTI: {
    title: 'Daftar Sesi Status: Terlambat / Digantikan (Badal)',
    subtitle: 'Sesi mengajar yang terlambat hadir atau digantikan oleh guru badal',
    headerBg: 'bg-amber-600 text-white',
    badgeBg: 'bg-amber-700 text-amber-100',
  },
};

export default function ModalListStatusKPI({
  isOpen,
  onClose,
  kategori,
  tanggal,
  sesiHariIni,
  getSesiStatusData,
}: ModalListStatusKPIProps) {
  const rows = useMemo(() => {
    if (!kategori) return [];
    const all: Array<{ sesi: SesiJadwalHarian; stData: StatusSesiData }> = [];

    ([1, 2, 3, 4] as JamKbm[]).forEach((j) => {
      (sesiHariIni[j] || []).forEach((sesi) => {
        const stData = getSesiStatusData(sesi);
        const st = stData.status || 'Hadir';

        let match = false;
        if (kategori === 'SEMUA') {
          match = true;
        } else if (kategori === 'Hadir') {
          match = st === 'Hadir';
        } else if (kategori === 'IZIN_SAKIT') {
          match = st === 'Izin' || st === 'Sakit' || st === 'Tugas Lain' || st === 'Tugas';
        } else if (kategori === 'ALFA') {
          match = st === 'Alfa' || st === 'Jadwal Kosong';
        } else if (kategori === 'TERLAMBAT_GANTI') {
          match = st === 'Terlambat' || st === 'Digantikan' || st === 'Badal';
        }

        if (match) {
          all.push({ sesi, stData });
        }
      });
    });

    return all;
  }, [kategori, sesiHariIni, getSesiStatusData]);

  if (!isOpen || !kategori) return null;

  const cfg = KONFIG_KATEGORI[kategori];

  const getBadgeStyle = (status: string) => {
    switch (status) {
      case 'Hadir':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Izin':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'Sakit':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Alfa':
      case 'Jadwal Kosong':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Terlambat':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Digantikan':
      case 'Badal':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 ${cfg.headerBg}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
              {kategori === 'Hadir' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : kategori === 'IZIN_SAKIT' ? (
                <Info className="w-5 h-5" />
              ) : kategori === 'ALFA' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : kategori === 'TERLAMBAT_GANTI' ? (
                <Clock className="w-5 h-5" />
              ) : (
                <ListChecks className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold">{cfg.title}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${cfg.badgeBg}`}>
                  {rows.length} Sesi
                </span>
              </div>
              <p className="text-[11px] opacity-85">
                {formatTanggalPanjangIndo(tanggal)} • {cfg.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-auto p-4">
          {rows.length === 0 ? (
            <div className="py-14 text-center text-slate-400">
              <p className="text-sm font-semibold text-slate-500">
                Tidak ada sesi mengajar pada kategori ini.
              </p>
              <p className="text-xs mt-1">
                Klik kartu ringkasan lain untuk melihat rincian sesi KBM.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                    <th className="py-2.5 px-3 text-center w-10">NO</th>
                    <th className="py-2.5 px-3 text-center w-20">JAM</th>
                    <th className="py-2.5 px-3 text-left">ASATIDZ</th>
                    <th className="py-2.5 px-3 text-left">KELAS & FAN</th>
                    <th className="py-2.5 px-3 text-center w-28">BLOK</th>
                    <th className="py-2.5 px-3 text-center w-28">STATUS</th>
                    <th className="py-2.5 px-3 text-left">KETERANGAN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map(({ sesi, stData }, idx) => {
                    const detailParts: string[] = [];
                    if (stData.status === 'Terlambat' && stData.menitTerlambat) {
                      detailParts.push(`Telat ${stData.menitTerlambat} mnt`);
                    }
                    if (
                      ['Digantikan', 'Badal', 'Izin', 'Sakit'].includes(
                        String(stData.status)
                      ) &&
                      stData.namaPengganti
                    ) {
                      detailParts.push(`Badal: ${stData.namaPengganti}`);
                    }
                    if (stData.keterangan) {
                      detailParts.push(stData.keterangan);
                    }

                    return (
                      <tr key={`${sesi.jamKe}-${sesi.nama}-${sesi.kelasMengajar}-${idx}`} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                            {sesi.jamKe}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-800">{sesi.nama}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            NIA: {sesi.nia}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-emerald-700">
                            {sesi.kelasMengajar}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {sesi.fan} • Ruang: {sesi.lokasi}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px]">
                            {formatLabelBlokHariKBM(sesi.blok)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full border font-bold text-[10px] ${getBadgeStyle(
                              stData.status || 'Hadir'
                            )}`}
                          >
                            {stData.status || 'Hadir'}
                          </span>
                          <div className="text-[9px] text-slate-400 mt-0.5">
                            {stData.isSaved ? 'Tersimpan' : 'Belum Disimpan'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                          {detailParts.length > 0 ? detailParts.join(' • ') : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-t border-slate-200">
          <span className="text-xs text-slate-500">
            Menampilkan <strong>{rows.length}</strong> sesi mengajar
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
