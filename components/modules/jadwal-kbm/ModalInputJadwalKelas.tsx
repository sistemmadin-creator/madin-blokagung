'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useJadwalStore } from '@/stores/useJadwalStore';
import { useFanStore } from '@/stores/useFanStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { LIST_HARI, KelasKbmItem } from '@/types/jadwal';
import { parseFanItemString } from '@/lib/utils/fanHelper';
import { normalisasiNamaKelas } from '@/lib/utils/jadwalHelper';
import {
  Trash2,
  Save,
  Info,
  Clock,
} from 'lucide-react';

interface ModalInputJadwalKelasProps {
  masterStrukturKelas: KelasKbmItem[];
}

export default function ModalInputJadwalKelas({ masterStrukturKelas }: ModalInputJadwalKelasProps) {
  const {
    isModalInputJadwalOpen,
    closeModalInputJadwal,
    selectedInputKelasKey,
    simpanJadwalDariKelas,
  } = useJadwalStore();

  const { fanConfig, fanDetail } = useFanStore();
  const { asatidzList } = useAsatidzStore();

  const currentClass = useMemo(() => {
    if (!selectedInputKelasKey) return null;
    const direct = masterStrukturKelas.find((k) => k.key === selectedInputKelasKey);
    if (direct) return direct;
    const norm = normalisasiNamaKelas(selectedInputKelasKey);
    return (
      masterStrukturKelas.find((k) => {
        const kNorm1 = normalisasiNamaKelas(`${k.kls} ${k.bag} ${k.tingkat}`);
        const kNorm2 = normalisasiNamaKelas(`${k.kls} ${k.bag} ${k.tingkat} (${k.papi})`);
        return kNorm1 === norm || kNorm2 === norm || k.key === selectedInputKelasKey;
      }) || null
    );
  }, [selectedInputKelasKey, masterStrukturKelas]);

  // Form state: Jam 1 dan Jam 2 per hari
  const [jam1Data, setJam1Data] = useState<Record<string, { asatidz: string; fan: string }>>({});
  const [jam2Data, setJam2Data] = useState<Record<string, { asatidz: string; fan: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inisialisasi data dari kelas yang dipilih
  useEffect(() => {
    if (!isModalInputJadwalOpen || !currentClass) return;

    const j1: Record<string, { asatidz: string; fan: string }> = {};
    const j2: Record<string, { asatidz: string; fan: string }> = {};

    LIST_HARI.forEach((hari) => {
      const s1 = currentClass.jadwal[hari]?.[1]?.[0];
      j1[hari] = {
        asatidz: s1?.guru && s1.guru !== '-' ? s1.guru : '',
        fan: s1?.fanAsli || s1?.fan || '',
      };

      const s2 = currentClass.jadwal[hari]?.[2]?.[0];
      j2[hari] = {
        asatidz: s2?.guru && s2.guru !== '-' ? s2.guru : '',
        fan: s2?.fanAsli || s2?.fan || '',
      };
    });

    setJam1Data(j1);
    setJam2Data(j2);
  }, [isModalInputJadwalOpen, currentClass]);

  // Peta guru yang sibuk di kelas lain pada hari & jam tertentu
  const mapBusyTeachers = useMemo(() => {
    if (!currentClass) return {};
    const map: Record<string, Record<string, string>> = {};

    LIST_HARI.forEach((h) => {
      map[`${h}_1`] = {};
      map[`${h}_2`] = {};
    });

    masterStrukturKelas.forEach((kOther) => {
      if (kOther.key === currentClass.key) return;
      const labelKls = `${kOther.kls} ${kOther.bag || ''} ${kOther.tingkat} (${kOther.papi})`
        .replace(/\s+/g, ' ')
        .trim();

      LIST_HARI.forEach((h) => {
        [1, 2].forEach((j) => {
          const sesiList = kOther.jadwal[h]?.[j as 1 | 2] || [];
          sesiList.forEach((s) => {
            if (s.guru && s.guru !== '-') {
              map[`${h}_${j}`][s.guru.trim().toUpperCase()] = labelKls;
            }
          });
        });
      });
    });

    return map;
  }, [currentClass, masterStrukturKelas]);

  // Daftar Fan yang relevan untuk kelas ini
  const classFanList = useMemo(() => {
    if (!currentClass) return [];
    const namaKelasMurni = `${currentClass.kls} ${currentClass.bag} ${currentClass.tingkat}`.trim();
    const isUg = currentClass.key.toLowerCase().includes('ug');
    const primaryKey = isUg ? `${namaKelasMurni} (Ug)` : `${currentClass.kls} ${currentClass.tingkat}`;
    const fallbackKey = `${currentClass.kls} ${currentClass.tingkat}`;

    const items = fanConfig[primaryKey] || (isUg ? fanConfig[fallbackKey] : null) || [];
    return items.map((raw) => {
      const p = parseFanItemString(raw);
      return {
        rawItem: raw,
        fanName: p.fan && p.fan !== '-' ? p.fan : p.mapel,
        mapel: p.mapel,
      };
    });
  }, [currentClass, fanConfig]);

  if (!currentClass) return null;

  const genderTag = currentClass.papi ? `(${currentClass.papi})` : '';
  const labelKelas = `${currentClass.kls} ${currentClass.bag} ${currentClass.tingkat} ${genderTag}`.trim();

  // Handle input perubahan Asatidz
  const handleAsatidzChange = (jam: 1 | 2, hari: string, rawVal: string) => {
    const cleanGuru = rawVal.replace(/^\[TERPAKAI di [^\]]+\]\s*/i, '').trim();
    const gUpper = cleanGuru.toUpperCase();
    const busyClass = mapBusyTeachers[`${hari}_${jam}`]?.[gUpper];

    if (busyClass) {
      alert(`⚠️ TIDAK BISA DIPILIH!\n\n${cleanGuru} sudah memiliki jadwal mengajar di ${busyClass} pada hari ${hari} Jam ${jam}.`);
      return;
    }

    if (jam === 1) {
      setJam1Data((prev) => ({
        ...prev,
        [hari]: { ...prev[hari], asatidz: cleanGuru },
      }));
    } else {
      setJam2Data((prev) => ({
        ...prev,
        [hari]: { ...prev[hari], asatidz: cleanGuru },
      }));
    }
  };

  // Handle input perubahan Fan
  const handleFanChange = (jam: 1 | 2, hari: string, val: string) => {
    const targetData = jam === 1 ? jam1Data : jam2Data;
    const currentGuru = targetData[hari]?.asatidz || '';

    // Cek apakah Fan berstatus wajib MS (Mustahiq)
    let autoGuru = currentGuru;
    const isUg = currentClass.key.toLowerCase().includes('ug');
    const namaKelasMurni = `${currentClass.kls} ${currentClass.bag} ${currentClass.tingkat}`.trim();
    const primaryKey = isUg ? `${namaKelasMurni} (Ug)` : `${currentClass.kls} ${currentClass.tingkat}`;
    const fallbackKey = `${currentClass.kls} ${currentClass.tingkat}`;

    const itemKey1 = `${primaryKey}||${val}`;
    const itemKey2 = `${fallbackKey}||${val}`;
    const det = fanDetail.item?.[itemKey1] || fanDetail.item?.[itemKey2];

    if (det && det.pengajar === 'MS' && currentClass.mustahiqNama && currentClass.mustahiqNama !== '-') {
      autoGuru = currentClass.mustahiqNama;
    }

    if (jam === 1) {
      setJam1Data((prev) => ({
        ...prev,
        [hari]: { asatidz: autoGuru, fan: val },
      }));
    } else {
      setJam2Data((prev) => ({
        ...prev,
        [hari]: { asatidz: autoGuru, fan: val },
      }));
    }
  };

  const handleClearDay = (jam: 1 | 2, hari: string) => {
    if (jam === 1) {
      setJam1Data((prev) => ({
        ...prev,
        [hari]: { asatidz: '', fan: '' },
      }));
    } else {
      setJam2Data((prev) => ({
        ...prev,
        [hari]: { asatidz: '', fan: '' },
      }));
    }
  };

  const handleKosongkanSemua = () => {
    if (confirm('Kosongkan semua jadwal (Jam 1 & Jam 2, Sabtu s/d Kamis) untuk form ini?')) {
      const kosong: Record<string, { asatidz: string; fan: string }> = {};
      LIST_HARI.forEach((h) => {
        kosong[h] = { asatidz: '', fan: '' };
      });
      setJam1Data(kosong);
      setJam2Data(kosong);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await simpanJadwalDariKelas(
      currentClass.key,
      currentClass,
      jam1Data,
      jam2Data,
      asatidzList
    );
    setIsSubmitting(false);

    if (!success) {
      alert('Gagal menyimpan jadwal kelas.');
    }
  };

  return (
    <Dialog
      isOpen={isModalInputJadwalOpen}
      onClose={closeModalInputJadwal}
      title={`Input & Edit Jadwal Kelas: ${labelKelas}`}
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header Toolbar */}
        <div className="flex justify-between items-center pb-2 border-b border-slate-200 flex-wrap gap-2">
          <div>
            <span className="text-[11px] text-slate-400 block">Kelas yang sedang diedit:</span>
            <span className="text-base font-extrabold text-emerald-800">{labelKelas}</span>
          </div>
          <button
            type="button"
            onClick={handleKosongkanSemua}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 transition-colors shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Kosongkan Semua Jadwal (Jam 1 &amp; 2)</span>
          </button>
        </div>

        {/* 2 Kotak Berdampingan: Jam 1 dan Jam 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* KOTAK JAM KE-1 */}
          <div className="border border-emerald-200 rounded-xl overflow-hidden shadow-xs bg-white">
            <div className="bg-emerald-50 px-3.5 py-2.5 border-b border-emerald-200 flex justify-between items-center">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                <span>Sesi Jam Ke-1</span>
              </span>
              <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                Sabtu s/d Kamis
              </span>
            </div>

            <div className="p-2 space-y-2">
              {LIST_HARI.map((hari) => {
                const mapBusy = mapBusyTeachers[`${hari}_1`] || {};
                const entry = jam1Data[hari] || { asatidz: '', fan: '' };

                return (
                  <div
                    key={hari}
                    className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2"
                  >
                    <span className="w-20 text-[11px] font-bold text-emerald-800 text-center shrink-0 leading-tight">
                      {hari} - Jam 1
                    </span>

                    <div className="flex-1 space-y-1">
                      {/* Asatidz Input / Datalist */}
                      <input
                        type="text"
                        list={`dl_asatidz_1_${hari}`}
                        value={entry.asatidz}
                        onChange={(e) => handleAsatidzChange(1, hari, e.target.value)}
                        placeholder="Ketik / Pilih Asatidz..."
                        className="w-full text-xs py-1.5 px-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium bg-white"
                      />
                      <datalist id={`dl_asatidz_1_${hari}`}>
                        {currentClass.mustahiqNama && currentClass.mustahiqNama !== '-' && (
                          <option value={currentClass.mustahiqNama}>
                            ⭐ [MUSTAHIQ KELAS] {currentClass.mustahiqNama}
                          </option>
                        )}
                        {asatidzList.map((a) => {
                          const gUpper = a.nama_asatidz.toUpperCase();
                          const busyClass = mapBusy[gUpper];
                          if (busyClass) {
                            return (
                              <option
                                key={a.id || a.nama_asatidz}
                                value={`[TERPAKAI di ${busyClass}] ${a.nama_asatidz}`}
                              />
                            );
                          }
                          return <option key={a.id || a.nama_asatidz} value={a.nama_asatidz} />;
                        })}
                      </datalist>

                      {/* Fan Input / Datalist */}
                      <input
                        type="text"
                        list={`dl_fan_1_${hari}`}
                        value={entry.fan}
                        onChange={(e) => handleFanChange(1, hari, e.target.value)}
                        placeholder="Ketik / Pilih Fan / Mapel..."
                        className="w-full text-xs py-1.5 px-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                      />
                      <datalist id={`dl_fan_1_${hari}`}>
                        {classFanList.map((f, fIdx) => (
                          <option key={fIdx} value={f.rawItem} label={f.fanName} />
                        ))}
                      </datalist>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleClearDay(1, hari)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-200 rounded transition-colors"
                      title={`Hapus baris ${hari} Jam 1`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* KOTAK JAM KE-2 */}
          <div className="border border-blue-200 rounded-xl overflow-hidden shadow-xs bg-white">
            <div className="bg-blue-50 px-3.5 py-2.5 border-b border-blue-200 flex justify-between items-center">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-700" />
                <span>Sesi Jam Ke-2</span>
              </span>
              <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full">
                Sabtu s/d Kamis
              </span>
            </div>

            <div className="p-2 space-y-2">
              {LIST_HARI.map((hari) => {
                const mapBusy = mapBusyTeachers[`${hari}_2`] || {};
                const entry = jam2Data[hari] || { asatidz: '', fan: '' };

                return (
                  <div
                    key={hari}
                    className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2"
                  >
                    <span className="w-20 text-[11px] font-bold text-blue-800 text-center shrink-0 leading-tight">
                      {hari} - Jam 2
                    </span>

                    <div className="flex-1 space-y-1">
                      {/* Asatidz Input / Datalist */}
                      <input
                        type="text"
                        list={`dl_asatidz_2_${hari}`}
                        value={entry.asatidz}
                        onChange={(e) => handleAsatidzChange(2, hari, e.target.value)}
                        placeholder="Ketik / Pilih Asatidz..."
                        className="w-full text-xs py-1.5 px-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium bg-white"
                      />
                      <datalist id={`dl_asatidz_2_${hari}`}>
                        {currentClass.mustahiqNama && currentClass.mustahiqNama !== '-' && (
                          <option value={currentClass.mustahiqNama}>
                            ⭐ [MUSTAHIQ KELAS] {currentClass.mustahiqNama}
                          </option>
                        )}
                        {asatidzList.map((a) => {
                          const gUpper = a.nama_asatidz.toUpperCase();
                          const busyClass = mapBusy[gUpper];
                          if (busyClass) {
                            return (
                              <option
                                key={a.id || a.nama_asatidz}
                                value={`[TERPAKAI di ${busyClass}] ${a.nama_asatidz}`}
                              />
                            );
                          }
                          return <option key={a.id || a.nama_asatidz} value={a.nama_asatidz} />;
                        })}
                      </datalist>

                      {/* Fan Input / Datalist */}
                      <input
                        type="text"
                        list={`dl_fan_2_${hari}`}
                        value={entry.fan}
                        onChange={(e) => handleFanChange(2, hari, e.target.value)}
                        placeholder="Ketik / Pilih Fan / Mapel..."
                        className="w-full text-xs py-1.5 px-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                      />
                      <datalist id={`dl_fan_2_${hari}`}>
                        {classFanList.map((f, fIdx) => (
                          <option key={fIdx} value={f.rawItem} label={f.fanName} />
                        ))}
                      </datalist>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleClearDay(2, hari)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-200 rounded transition-colors"
                      title={`Hapus baris ${hari} Jam 2`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Info Alert */}
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2">
          <Info className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span>
            Isi asatidz dan mapel untuk tiap hari pada Jam 1 dan Jam 2. Kosongkan baris jika tidak ada jadwal.
            Perubahan baru tersimpan setelah menekan tombol <b>Simpan Jadwal (Jam 1 &amp; 2)</b>.
          </span>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={closeModalInputJadwal}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Jadwal Kelas (Jam 1 & 2)'}</span>
          </button>
        </div>
      </form>
    </Dialog>
  );
}
