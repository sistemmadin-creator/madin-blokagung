'use client';

import React, { useMemo } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useJadwalStore, LIST_HARI } from '@/stores/useJadwalStore';
import { parseJadwalCell_Client, formatTampilanKelas } from '@/lib/utils/jadwalHelper';
import { CalendarCheck, User, BookOpen, Layers, MapPin, Calendar } from 'lucide-react';

interface ModalDetailSelJadwalProps {
  isOpen: boolean;
  onClose: () => void;
  session: {
    nama: string;
    hari: string;
    jam: number;
  } | null;
}

export default function ModalDetailSelJadwal({ isOpen, onClose, session }: ModalDetailSelJadwalProps) {
  const { jadwalMap } = useJadwalStore();

  const details = useMemo(() => {
    if (!session || !session.nama) return null;

    const teacherKey = session.nama.trim().toUpperCase();
    const jdw = jadwalMap[teacherKey] || null;
    const hariKey = session.hari.toLowerCase() as 'sabtu' | 'ahad' | 'senin' | 'selasa' | 'rabu' | 'kamis';
    const cellVal = jdw ? jdw[hariKey] || '' : '';

    let fan = '-';
    let kelas = '-';
    let lokasi = '-';

    if (cellVal) {
      const slots = parseJadwalCell_Client(cellVal);
      slots.forEach((s) => {
        if (s.jam === session.jam) {
          fan = s.fan && s.fan !== '-' ? s.fan : '-';
          const rawLok = s.lokasi && s.lokasi !== '-' ? s.lokasi : '-';
          const matchLok = rawLok.match(/^(.*?)\s*\(([^()]*)\)$/);
          if (matchLok) {
            const isiKurung = matchLok[2].trim().toUpperCase();
            if (isiKurung === 'PA' || isiKurung === 'PI' || isiKurung === 'UG') {
              kelas = formatTampilanKelas(rawLok) || '-';
              lokasi = '-';
            } else {
              kelas = formatTampilanKelas(matchLok[1].trim()) || '-';
              lokasi = matchLok[2].trim() || '-';
            }
          } else {
            kelas = formatTampilanKelas(rawLok) || '-';
            lokasi = '-';
          }
        }
      });
    }

    return {
      jdw,
      fan,
      kelas,
      lokasi,
    };
  }, [session, jadwalMap]);

  if (!session) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`${session.hari} - Jam ${session.jam === 1 ? 'I' : 'II'}`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Subjudul */}
        <p className="text-xs text-slate-500 -mt-2">
          Rincian Sesi &amp; Ringkasan Jadwal Mingguan Tenaga Pendidik
        </p>

        {/* 1. Kartu Rincian Sesi Mengajar Terpilih */}
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-emerald-100 pb-2">
            <CalendarCheck className="h-4 w-4 text-emerald-700" />
            <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-800">
              Rincian Sesi Mengajar Terpilih
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                <User className="h-3 w-3 text-slate-400" />
                Nama Tenaga Pendidik:
              </span>
              <p className="font-bold text-slate-800 mt-0.5">{session.nama}</p>
            </div>

            <div>
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                <BookOpen className="h-3 w-3 text-slate-400" />
                Fan / Mata Pelajaran:
              </span>
              <p className="font-bold text-emerald-700 mt-0.5">{details?.fan || '-'}</p>
            </div>

            <div>
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                <Layers className="h-3 w-3 text-slate-400" />
                Kelas Diniyyah:
              </span>
              <span className="inline-block mt-0.5 rounded-md bg-white border border-slate-200 px-2.5 py-0.5 font-bold text-slate-700">
                {details?.kelas || '-'}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-slate-400" />
                Lokasi / Ruang KBM:
              </span>
              <p className="font-semibold text-slate-600 mt-0.5">{details?.lokasi || '-'}</p>
            </div>
          </div>
        </div>

        {/* 2. Kartu Ringkasan Jadwal Mengajar Mingguan (Sabtu s/d Kamis) */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Calendar className="h-4 w-4 text-emerald-700" />
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-800">
              Ringkasan Jadwal Mengajar Mingguan (Sabtu s/d Kamis)
            </h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-50 text-slate-600 text-center font-bold">
                <tr>
                  <th className="py-2 px-3 border-b border-r border-slate-200 w-24">HARI</th>
                  <th className="py-2 px-3 border-b border-slate-200 text-left">RINCIAN JAM, FAN &amp; KELAS MENGAJAR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {LIST_HARI.map((h) => {
                  const hKey = h.toLowerCase() as 'sabtu' | 'ahad' | 'senin' | 'selasa' | 'rabu' | 'kamis';
                  const val = details?.jdw ? (details.jdw as any)[hKey] || '' : '';
                  const isActive = h.toLowerCase() === session.hari.toLowerCase();
                  const slots = parseJadwalCell_Client(formatTampilanKelas(val));

                  return (
                    <tr
                      key={h}
                      className={isActive ? 'bg-emerald-50/70 border-l-4 border-l-emerald-600 font-medium' : 'hover:bg-slate-50/50'}
                    >
                      <td className={`py-2 px-3 text-center font-bold border-r border-slate-200 ${isActive ? 'text-emerald-800' : 'text-slate-700'}`}>
                        {h}
                      </td>
                      <td className="py-2 px-3">
                        {slots.length === 0 ? (
                          <span className="text-slate-400 italic text-[11px]">Tidak ada jadwal</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {slots.map((s, idx) => {
                              const fan = s.fan && s.fan !== '-' ? s.fan : '';
                              const lok = s.lokasi && s.lokasi !== '-' ? `(${s.lokasi})` : '';
                              const text = [fan, lok].filter(Boolean).join(' ');
                              return (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[11px] shadow-2xs"
                                >
                                  <b className="text-emerald-700">Jam {s.jam}:</b>
                                  <span className="text-slate-700">{text || '-'}</span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </Dialog>
  );
}
