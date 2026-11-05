'use client';

import React, { useMemo } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useKonsorsiumStore } from '@/stores/useKonsorsiumStore';
import {
  KelasKonsorsium,
  AnggotaKonsorsium,
  SesiPresensiKonsorsium,
} from '@/types/konsorsium';
import {
  getTahunAjaranKonsorsium,
  getHariNamaKonsorsium,
} from '@/lib/utils/konsorsiumHelper';
import * as XLSX from 'xlsx';
import {
  Calendar,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  Clock,
  BookOpen,
  ArrowRight,
} from 'lucide-react';

interface ModalDetailMatriksTahunanProps {
  isOpen: boolean;
  onClose: () => void;
  kelas: KelasKonsorsium | null;
  onInputPresensi?: (kelas: KelasKonsorsium, tanggal?: string) => void;
}

export default function ModalDetailMatriksTahunan({
  isOpen,
  onClose,
  kelas,
  onInputPresensi,
}: ModalDetailMatriksTahunanProps) {
  const { anggotaList, sesiList } = useKonsorsiumStore();

  const enrolledAnggota = useMemo(() => {
    if (!kelas) return [];
    return anggotaList.filter((a) => a.kelasId === kelas.id);
  }, [anggotaList, kelas]);

  const kelasSesiList = useMemo(() => {
    if (!kelas) return [];
    return sesiList.filter((s) => s.kelasId === kelas.id);
  }, [sesiList, kelas]);

  // Hitung kalender 12 bulan Tahun Ajaran (Juli - Juni)
  const tahunAjaranData = useMemo(() => {
    if (!kelas) return null;
    return getTahunAjaranKonsorsium(new Date(), kelas.jenisKonsor);
  }, [kelas]);

  // Indexing map: tanggal -> (nia -> status)
  const attendanceMap = useMemo(() => {
    const map = new Map<string, Map<string, string>>();
    kelasSesiList.forEach((sesi) => {
      const perTanggalMap = new Map<string, string>();
      sesi.records.forEach((r) => {
        perTanggalMap.set(r.nia, r.status);
      });
      map.set(sesi.tanggal, perTanggalMap);
    });
    return map;
  }, [kelasSesiList]);

  // Rekap akumulasi tahunan per asatidz
  const rekapTahunanPerAsatidz = useMemo(() => {
    if (!tahunAjaranData) return new Map();

    // Kumpulkan seluruh tanggal pertemuan sah sepanjang tahun ajaran
    const allValidDates: string[] = [];
    tahunAjaranData.bulanList.forEach((bln) => {
      bln.pertemuanList.forEach((p) => {
        allValidDates.push(p.tanggal);
      });
    });

    const resultMap = new Map<
      string,
      { hadir: number; izin: number; sakit: number; alfa: number; terlambat: number; persen: number }
    >();

    enrolledAnggota.forEach((agt) => {
      let h = 0,
        i = 0,
        s = 0,
        a = 0,
        t = 0;
      let totalSesiTerlaksana = 0;

      allValidDates.forEach((tgl) => {
        const sesiAda = attendanceMap.get(tgl);
        if (sesiAda) {
          totalSesiTerlaksana++;
          const status = sesiAda.get(agt.nia);
          if (status === 'Hadir') h++;
          else if (status === 'Izin') i++;
          else if (status === 'Sakit') s++;
          else if (status === 'Alfa') a++;
          else if (status === 'Terlambat') t++;
        }
      });

      const persen =
        totalSesiTerlaksana > 0
          ? Math.round(((h + t) / totalSesiTerlaksana) * 100)
          : 0;

      resultMap.set(agt.nia, {
        hadir: h,
        izin: i,
        sakit: s,
        alfa: a,
        terlambat: t,
        persen,
      });
    });

    return resultMap;
  }, [tahunAjaranData, enrolledAnggota, attendanceMap]);

  const handleExportExcel = () => {
    if (!kelas || !tahunAjaranData) return;

    const headers: string[] = ['NO', 'NIA', 'NAMA ASATIDZ'];
    const dateKeys: string[] = [];

    tahunAjaranData.bulanList.forEach((bln) => {
      bln.pertemuanList.forEach((p) => {
        headers.push(`${bln.namaBulan.slice(0, 3)} - P${p.ke} (${p.labelTanggal})`);
        dateKeys.push(p.tanggal);
      });
    });

    headers.push('TOTAL HADIR', 'TOTAL IZIN', 'TOTAL SAKIT', 'TOTAL ALFA', 'TOTAL TERLAMBAT', '% KEHADIRAN');

    const rows: (string | number)[][] = [headers];

    enrolledAnggota.forEach((agt, idx) => {
      const row: (string | number)[] = [idx + 1, agt.nia, agt.nama];
      dateKeys.forEach((tgl) => {
        const status = attendanceMap.get(tgl)?.get(agt.nia) || '-';
        row.push(status);
      });

      const rkp = rekapTahunanPerAsatidz.get(agt.nia) || {
        hadir: 0,
        izin: 0,
        sakit: 0,
        alfa: 0,
        terlambat: 0,
        persen: 0,
      };
      row.push(rkp.hadir, rkp.izin, rkp.sakit, rkp.alfa, rkp.terlambat, `${rkp.persen}%`);
      rows.push(row);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Matriks Konsorsium');
    XLSX.writeFile(
      workbook,
      `Matriks_Absen_${kelas.namaKelas.replace(/\s+/g, '_')}_${tahunAjaranData.labelTahunAjaran.replace('/', '-')}.xlsx`
    );
  };

  if (!kelas || !tahunAjaranData) return null;

  const hariJadwal = getHariNamaKonsorsium(kelas.jenisKonsor);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Detail Matriks Absensi: ${kelas.namaKelas} (Tahun Ajaran ${tahunAjaranData.labelTahunAjaran})`}
      maxWidth="5xl"
    >
      <div className="p-5 space-y-4 max-h-[85vh] flex flex-col">
        {/* Header Ringkasan Kelas & Aksi */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                Tingkat {kelas.tingkat}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${
                  kelas.jenisKonsor === 'Mustahiq/qoh'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-teal-50 text-teal-800 border-teal-300'
                }`}
              >
                Konsorsium {kelas.jenisKonsor}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                • Hari Pertemuan: <strong>Setiap {hariJadwal}</strong>
              </span>
            </div>

            <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap pt-0.5">
              <span>Pembimbing: <strong className="text-slate-900">{kelas.pembimbingNama}</strong></span>
              <span className="text-slate-300">|</span>
              <span>Total Asatidz: <strong className="text-slate-900">{enrolledAnggota.length}</strong></span>
              <span className="text-slate-300">|</span>
              <span>Periode Akademik: <strong className="text-emerald-700">Juli {tahunAjaranData.startYear} s/d Juni {tahunAjaranData.endYear}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors flex items-center gap-2 shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Matriks Excel</span>
            </button>
          </div>
        </div>

        {/* Legend Status Kehadiran */}
        <div className="flex flex-wrap items-center justify-between text-xs px-1 text-slate-600 gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-700">Keterangan:</span>
            <span className="inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px]">
              H = Hadir
            </span>
            <span className="inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px]">
              I = Izin
            </span>
            <span className="inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px]">
              S = Sakit
            </span>
            <span className="inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px]">
              A = Alfa
            </span>
            <span className="inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 text-[10px]">
              T = Terlambat
            </span>
            <span className="inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 text-[10px]">
              - = Belum Diabsen
            </span>
          </div>
          <span className="text-[11px] text-slate-400 italic">
            * Geser tabel ke kanan untuk melihat seluruh bulan
          </span>
        </div>

        {/* Tabel Matriks 12 Bulan (Juli s/d Juni) */}
        <div className="border border-slate-200 rounded-xl overflow-hidden flex-1 overflow-x-auto bg-white shadow-2xs">
          <table className="w-full text-center border-collapse text-xs">
            <thead>
              {/* Baris 1: Header Bulan */}
              <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200 text-[11px] font-bold">
                <th
                  rowSpan={2}
                  className="py-2.5 px-3 w-10 text-center sticky left-0 bg-slate-100 z-20 border-r border-slate-200 shadow-xs"
                >
                  No
                </th>
                <th
                  rowSpan={2}
                  className="py-2.5 px-3 w-20 text-center sticky left-10 bg-slate-100 z-20 border-r border-slate-200 font-mono shadow-xs"
                >
                  NIA
                </th>
                <th
                  rowSpan={2}
                  className="py-2.5 px-3 text-left min-w-[170px] sticky left-28 bg-slate-100 z-20 border-r border-slate-200 shadow-xs"
                >
                  Nama Asatidz
                </th>

                {/* 12 Bulan Headers */}
                {tahunAjaranData.bulanList.map((bln) => (
                  <th
                    key={`${bln.tahun}-${bln.bulan}`}
                    colSpan={bln.pertemuanList.length}
                    className="py-1.5 px-2 border-r border-slate-200 bg-slate-100 uppercase tracking-wider text-[11px] whitespace-nowrap"
                  >
                    {bln.namaBulan} {bln.tahun}
                  </th>
                ))}

                {/* Header Rekap Tahunan */}
                <th colSpan={5} className="py-1.5 px-2 bg-emerald-100/70 text-emerald-900 border-l border-slate-300 font-bold uppercase text-[10px]">
                  Rekap Akumulasi
                </th>
                <th rowSpan={2} className="py-2.5 px-2.5 bg-emerald-700 text-white font-bold text-[11px] border-l border-slate-300">
                  %
                </th>
              </tr>

              {/* Baris 2: Sub-Header Kolom Pertemuan (1, 2, 3, 4, [5]) + Tanggal Kecil */}
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[10px]">
                {tahunAjaranData.bulanList.map((bln) =>
                  bln.pertemuanList.map((p) => (
                    <th
                      key={p.tanggal}
                      className="py-1 px-1.5 border-r border-slate-200 min-w-[34px] font-medium"
                      title={p.fullFormatted}
                    >
                      <div className="font-bold text-slate-800">{p.ke}</div>
                      <div className="text-[9px] text-slate-400 font-mono scale-90 -mt-0.5">
                        {p.labelTanggal.split('/')[0]}
                      </div>
                    </th>
                  ))
                )}

                {/* Sub-Header Kolom Rekap */}
                <th className="py-1 px-1.5 w-7 text-emerald-800 bg-emerald-50/70 font-bold border-r border-emerald-200">H</th>
                <th className="py-1 px-1.5 w-7 text-amber-800 bg-amber-50/70 font-bold border-r border-amber-200">I</th>
                <th className="py-1 px-1.5 w-7 text-blue-800 bg-blue-50/70 font-bold border-r border-blue-200">S</th>
                <th className="py-1 px-1.5 w-7 text-rose-800 bg-rose-50/70 font-bold border-r border-rose-200">A</th>
                <th className="py-1 px-1.5 w-7 text-orange-800 bg-orange-50/70 font-bold border-r border-orange-200">T</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {enrolledAnggota.length === 0 ? (
                <tr>
                  <td
                    colSpan={60}
                    className="py-12 text-center text-slate-400 text-sm"
                  >
                    Belum ada asatidz terdaftar pada kelas konsorsium ini.
                  </td>
                </tr>
              ) : (
                enrolledAnggota.map((agt, idx) => {
                  const rkp = rekapTahunanPerAsatidz.get(agt.nia) || {
                    hadir: 0,
                    izin: 0,
                    sakit: 0,
                    alfa: 0,
                    terlambat: 0,
                    persen: 0,
                  };

                  return (
                    <tr
                      key={agt.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-2 px-2 text-center text-slate-400 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-100 z-10 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-slate-600 font-medium sticky left-10 bg-white group-hover:bg-slate-50 border-r border-slate-100 z-10 text-[11px]">
                        {agt.nia}
                      </td>
                      <td className="py-2 px-3 text-left font-semibold text-slate-800 sticky left-28 bg-white group-hover:bg-slate-50 border-r border-slate-100 z-10 truncate max-w-[200px]">
                        {agt.nama}
                      </td>

                      {/* Sel Presensi per Pertemuan 1..5 */}
                      {tahunAjaranData.bulanList.map((bln) =>
                        bln.pertemuanList.map((p) => {
                          const status = attendanceMap.get(p.tanggal)?.get(agt.nia);

                          return (
                            <td
                              key={p.tanggal}
                              className="py-1.5 px-1 border-r border-slate-100 font-bold text-[10px]"
                            >
                              {status === 'Hadir' ? (
                                <span className="inline-block w-5 h-5 leading-5 rounded bg-emerald-100 text-emerald-800">
                                  H
                                </span>
                              ) : status === 'Izin' ? (
                                <span className="inline-block w-5 h-5 leading-5 rounded bg-amber-100 text-amber-800">
                                  I
                                </span>
                              ) : status === 'Sakit' ? (
                                <span className="inline-block w-5 h-5 leading-5 rounded bg-blue-100 text-blue-800">
                                  S
                                </span>
                              ) : status === 'Alfa' ? (
                                <span className="inline-block w-5 h-5 leading-5 rounded bg-rose-100 text-rose-800">
                                  A
                                </span>
                              ) : status === 'Terlambat' ? (
                                <span className="inline-block w-5 h-5 leading-5 rounded bg-orange-100 text-orange-800">
                                  T
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          );
                        })
                      )}

                      {/* Rekap Angka */}
                      <td className="py-1.5 px-1 font-bold text-emerald-700 bg-emerald-50/30 border-r border-slate-100">
                        {rkp.hadir}
                      </td>
                      <td className="py-1.5 px-1 font-semibold text-amber-700 bg-amber-50/30 border-r border-slate-100">
                        {rkp.izin}
                      </td>
                      <td className="py-1.5 px-1 font-semibold text-blue-700 bg-blue-50/30 border-r border-slate-100">
                        {rkp.sakit}
                      </td>
                      <td className="py-1.5 px-1 font-semibold text-rose-700 bg-rose-50/30 border-r border-slate-100">
                        {rkp.alfa}
                      </td>
                      <td className="py-1.5 px-1 font-semibold text-orange-700 bg-orange-50/30 border-r border-slate-100">
                        {rkp.terlambat}
                      </td>
                      <td className="py-1.5 px-1.5 font-bold text-slate-800 bg-emerald-50/50">
                        {rkp.persen}%
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            Tahun Ajaran aktif: <strong>{tahunAjaranData.labelTahunAjaran}</strong> • Terhubung dengan data master absensi.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </Dialog>
  );
}
