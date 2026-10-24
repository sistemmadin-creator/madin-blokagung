'use client';

import React, { useMemo } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useJadwalStore } from '@/stores/useJadwalStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { LIST_HARI, KelasKbmItem } from '@/types/jadwal';
import { normalisasiNamaKelas } from '@/lib/utils/jadwalHelper';
import {
  UserCheck,
  Users,
  Calendar,
  Pencil,
  Trash2,
} from 'lucide-react';

interface ModalDetailKelasKBMProps {
  masterStrukturKelas: KelasKbmItem[];
}

export default function ModalDetailKelasKBM({ masterStrukturKelas }: ModalDetailKelasKBMProps) {
  const {
    isModalDetailKelasOpen,
    closeModalDetailKelas,
    selectedDetailKelasKey,
    openModalInputJadwal,
    hapusJadwalJamKelas,
  } = useJadwalStore();

  const { asatidzList } = useAsatidzStore();

  const currentClass = useMemo(() => {
    if (!selectedDetailKelasKey) return null;
    const direct = masterStrukturKelas.find((k) => k.key === selectedDetailKelasKey);
    if (direct) return direct;
    const norm = normalisasiNamaKelas(selectedDetailKelasKey);
    return (
      masterStrukturKelas.find((k) => {
        const kNorm1 = normalisasiNamaKelas(`${k.kls} ${k.bag} ${k.tingkat}`);
        const kNorm2 = normalisasiNamaKelas(`${k.kls} ${k.bag} ${k.tingkat} (${k.papi})`);
        return kNorm1 === norm || kNorm2 === norm || k.key === selectedDetailKelasKey;
      }) || null
    );
  }, [selectedDetailKelasKey, masterStrukturKelas]);

  // Kumpulkan seluruh Asatidz yang mengajar di kelas ini
  const mapGuru = useMemo(() => {
    if (!currentClass) return {};
    const map: Record<string, { nama: string; kg: string; mapel: Set<string> }> = {};

    LIST_HARI.forEach((hari) => {
      [1, 2].forEach((jam) => {
        const sesiList = currentClass.jadwal[hari]?.[jam as 1 | 2] || [];
        sesiList.forEach((sesi) => {
          if (sesi && sesi.guru && sesi.guru !== '-') {
            if (!map[sesi.guru]) {
              map[sesi.guru] = {
                nama: sesi.guru,
                kg: sesi.kg || '-',
                mapel: new Set(),
              };
            }
            map[sesi.guru].mapel.add(`${sesi.fan} (${hari} J${jam})`);
          }
        });
      });
    });

    return map;
  }, [currentClass]);

  if (!currentClass) return null;

  const genderTag = currentClass.papi ? `(${currentClass.papi})` : '';
  const labelKelas = `${currentClass.kls} ${currentClass.bag} ${currentClass.tingkat} ${genderTag}`.trim();

  const handleEditJam = (jam: 1 | 2) => {
    closeModalDetailKelas();
    openModalInputJadwal(currentClass.key, jam);
  };

  const handleHapusJam = async (jam: 1 | 2) => {
    if (
      confirm(
        `Hapus seluruh jadwal Jam ${jam} (Sabtu s/d Kamis) untuk kelas ${labelKelas}?\nAsatidz yang bersangkutan akan dikosongkan pada slot ini.`
      )
    ) {
      await hapusJadwalJamKelas(currentClass.key, currentClass, jam, asatidzList);
    }
  };

  return (
    <Dialog
      isOpen={isModalDetailKelasOpen}
      onClose={closeModalDetailKelas}
      title={`Detail Kelas: ${labelKelas}`}
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Card 1: Informasi Wali Kelas / Mustahiq */}
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center gap-1.5 pb-2 mb-2.5 border-b border-slate-100 text-xs font-bold text-emerald-800">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>Data Mustahiq / Wali Kelas</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
            <div className="sm:col-span-6">
              <span className="text-slate-400 block text-[11px]">Nama Mustahiq / Wali Kelas:</span>
              <span className="font-bold text-slate-800 text-sm">{currentClass.mustahiqNama}</span>
            </div>
            <div className="sm:col-span-3">
              <span className="text-slate-400 block text-[11px]">KG / NIA:</span>
              <span className="font-mono font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-800">
                {currentClass.mustahiqKG}
              </span>
            </div>
            <div className="sm:col-span-3">
              <span className="text-slate-400 block text-[11px]">Lokal / Ruang:</span>
              <span className="font-semibold text-slate-700">{currentClass.lokal}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Daftar Asatidz Pengajar di Kelas Ini */}
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center gap-1.5 pb-2 mb-2.5 border-b border-slate-100 text-xs font-bold text-emerald-800">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Daftar Asatidz Mengajar di Kelas Ini ({Object.keys(mapGuru).length})</span>
          </div>

          <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto">
            {Object.keys(mapGuru).length === 0 ? (
              <span className="text-slate-400 italic text-xs">
                Belum ada data asatidz mengajar yang dijadwalkan di kelas ini.
              </span>
            ) : (
              Object.values(mapGuru).map((g) => (
                <div
                  key={g.nama}
                  className="p-2 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs min-w-[200px]"
                >
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="font-bold text-slate-800 truncate" title={g.nama}>
                      {g.nama}
                    </span>
                    <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-semibold ml-2">
                      {g.kg}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-700 font-medium truncate" title={Array.from(g.mapel).join(', ')}>
                    Mengajar: {Array.from(g.mapel).join(', ')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 3: Rincian Jadwal Pelajaran (Sabtu s/d Kamis) */}
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center gap-1.5 pb-2 mb-2.5 border-b border-slate-100 text-xs font-bold text-emerald-800">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Jadwal Pelajaran Mingguan (Sabtu s/d Kamis)</span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2 px-2 border-r border-slate-200 w-[95px]">JAM</th>
                  {LIST_HARI.map((h) => (
                    <th key={h} className="py-2 px-2 border-r border-slate-200">
                      {h.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {([1, 2] as const).map((jam) => (
                  <tr key={jam} className="border-b border-slate-200">
                    <td className="p-2 border-r border-slate-200 bg-slate-50 align-middle">
                      <div className="flex flex-col gap-1 items-center justify-center">
                        <button
                          type="button"
                          onClick={() => handleEditJam(jam)}
                          className="flex items-center justify-center gap-1 w-full py-1 px-1.5 text-[11px] font-bold rounded border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 shadow-xs transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit Jam {jam}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleHapusJam(jam)}
                          className="flex items-center justify-center gap-1 w-full py-0.5 px-1.5 text-[10px] font-semibold rounded border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>

                    {LIST_HARI.map((h) => {
                      const sesiList = currentClass.jadwal[h]?.[jam] || [];
                      const slot = sesiList[0];

                      return (
                        <td key={h} className="p-2 border-r border-slate-200 align-middle">
                          {slot ? (
                            <div>
                              <div className="font-bold text-slate-800">{slot.fan}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[90px] mx-auto" title={slot.guru}>
                                {slot.guru} <b className="text-emerald-700">({slot.kg})</b>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={closeModalDetailKelas}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Tutup
          </button>
        </div>
      </div>
    </Dialog>
  );
}
