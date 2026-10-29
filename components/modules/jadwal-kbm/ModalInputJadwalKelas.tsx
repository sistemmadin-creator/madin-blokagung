'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useJadwalStore } from '@/stores/useJadwalStore';
import { useFanStore } from '@/stores/useFanStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { LIST_HARI, KelasKbmItem } from '@/types/jadwal';
import {
  normalisasiNamaKelas,
  siapkanCacheRelasiFanJadwalKelas,
  cekFanMSuntukKelas,
  dapatkanBatasJamFan,
} from '@/lib/utils/jadwalHelper';
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
    selectedInputJamFokus,
    simpanJadwalDariKelas,
  } = useJadwalStore();

  const { fanConfig, fanDetail } = useFanStore();
  const { asatidzList } = useAsatidzStore();
  const { formasiList } = useFormasiStore();

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
  const [highlightMSCell, setHighlightMSCell] = useState<string | null>(null);
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
        fan: s1?.fanAsli && s1.fanAsli !== '-' ? s1.fanAsli : s1?.fan && s1.fan !== '-' ? s1.fan : '',
      };

      const s2 = currentClass.jadwal[hari]?.[2]?.[0];
      j2[hari] = {
        asatidz: s2?.guru && s2.guru !== '-' ? s2.guru : '',
        fan: s2?.fanAsli && s2.fanAsli !== '-' ? s2.fanAsli : s2?.fan && s2.fan !== '-' ? s2.fan : '',
      };
    });

    setJam1Data(j1);
    setJam2Data(j2);
  }, [isModalInputJadwalOpen, currentClass]);

  // Cache relasi Fan <-> Asatidz & peta guru sibuk di kelas lain
  const cacheRelasi = useMemo(() => {
    if (!currentClass) return null;
    return siapkanCacheRelasiFanJadwalKelas(
      currentClass,
      formasiList,
      fanConfig,
      fanDetail,
      masterStrukturKelas
    );
  }, [currentClass, formasiList, fanConfig, fanDetail, masterStrukturKelas]);

  if (!currentClass || !cacheRelasi) return null;

  const genderTag = currentClass.papi ? `(${currentClass.papi})` : '';
  const labelKelas = `${currentClass.kls} ${currentClass.bag} ${currentClass.tingkat} ${genderTag}`.trim();
  const namaMS =
    currentClass.mustahiqNama && currentClass.mustahiqNama !== '-'
      ? currentClass.mustahiqNama.trim()
      : '';

  const resolveFanQuota = (nilai: string) => {
    let info = dapatkanBatasJamFan(cacheRelasi.primaryFanKey, nilai, fanConfig, fanDetail);
    if (!info && cacheRelasi.isUg) {
      info = dapatkanBatasJamFan(cacheRelasi.fallbackFanKey, nilai, fanConfig, fanDetail);
    }
    return info;
  };

  const validasiBatasJamFanKelas = (
    targetJam: 1 | 2,
    targetHari: string,
    newFanVal: string,
    nextJ1 = jam1Data,
    nextJ2 = jam2Data
  ): boolean => {
    const cleanVal = newFanVal.trim();
    if (!cleanVal) return true;

    const fanInfo = resolveFanQuota(cleanVal);
    if (!fanInfo || fanInfo.maxJam === null) return true;
    const maxBatas = fanInfo.maxJam;

    let totalPakai = 0;
    ([1, 2] as const).forEach((j) => {
      const sourceObj = j === 1 ? nextJ1 : nextJ2;
      LIST_HARI.forEach((h) => {
        const v =
          j === targetJam && h === targetHari ? cleanVal : (sourceObj[h]?.fan || '').trim();
        if (!v) return;
        const mi = resolveFanQuota(v);
        if (mi && mi.rawItem === fanInfo.rawItem) {
          totalPakai++;
        }
      });
    });

    if (totalPakai > maxBatas) {
      alert(
        `⚠️ MELEBIHI BATAS JAM!\n\nFan/Mata Pelajaran "${cleanVal}" hanya dialokasikan maksimal ${maxBatas} Jam tiap minggu untuk kelas ini.\nTotal jam yang Anda masukkan (Jam 1 & Jam 2) sudah mencapai ${totalPakai} Jam.`
      );
      return false;
    }
    return true;
  };

  // Handle input perubahan Asatidz (dengan sinkronisasi ke Fan)
  const handleAsatidzChange = (jam: 1 | 2, hari: string, rawVal: string) => {
    const mapBusy = cacheRelasi.mapBusyAll[`${hari}_${jam}`] || {};
    const matchTerpakai = rawVal.match(/^\[TERPAKAI di (.+?)\]\s*(.+)$/);
    if (matchTerpakai) {
      alert(
        `⚠️ BENTROK JADWAL MENGAJAR!\n\n${matchTerpakai[2]} tidak dapat dipilih pada ${hari} Jam ${jam} karena sudah memiliki jadwal mengajar di ${matchTerpakai[1]}.\n\nSolusi:\n1. Pilih hari lain (Sabtu, Ahad, Senin, Rabu, atau Kamis) untuk ${matchTerpakai[2]} di kelas ini; ATAU\n2. Pindahkan/kosongkan jadwal beliau di ${matchTerpakai[1]} terlebih dahulu.`
      );
      return;
    }

    const cleanGuru = rawVal
      .replace(/^\[TERPAKAI di [^\]]+\]\s*/i, '')
      .replace(/^⭐\s*\[MUSTAHIQ KELAS\]\s*/i, '')
      .trim();
    const gUpper = cleanGuru.toUpperCase();
    const busyClass = mapBusy[gUpper];

    if (busyClass) {
      alert(
        `⚠️ BENTROK JADWAL MENGAJAR!\n\n${cleanGuru} tidak dapat dipilih pada ${hari} Jam ${jam} karena sudah memiliki jadwal mengajar di ${busyClass}.\n\nSolusi:\n1. Pilih hari lain (Sabtu, Ahad, Senin, Rabu, atau Kamis) untuk ${cleanGuru} di kelas ini; ATAU\n2. Pindahkan/kosongkan jadwal beliau di ${busyClass} terlebih dahulu.`
      );
      return;
    }

    const currentEntry = (jam === 1 ? jam1Data : jam2Data)[hari] || { asatidz: '', fan: '' };
    let nextFan = currentEntry.fan;

    // Auto-fill Fan jika guru hanya mengajar 1 Fan di kelas ini dan kolom Fan masih kosong
    if (cleanGuru && !nextFan.trim()) {
      const fansGuru = cacheRelasi.mapAsatidzKeFan[gUpper] || [];
      if (fansGuru.length === 1) {
        if (validasiBatasJamFanKelas(jam, hari, fansGuru[0])) {
          nextFan = fansGuru[0];
        }
      }
    }

    if (jam === 1) {
      setJam1Data((prev) => ({
        ...prev,
        [hari]: { asatidz: cleanGuru, fan: nextFan },
      }));
    } else {
      setJam2Data((prev) => ({
        ...prev,
        [hari]: { asatidz: cleanGuru, fan: nextFan },
      }));
    }
  };

  // Handle input perubahan Fan (dengan sinkronisasi ke Asatidz, Auto-MS, & validasi kuota jam)
  const handleFanChange = (jam: 1 | 2, hari: string, val: string) => {
    if (val.trim() && !validasiBatasJamFanKelas(jam, hari, val)) {
      return;
    }

    const targetData = jam === 1 ? jam1Data : jam2Data;
    const currentGuru = targetData[hari]?.asatidz || '';
    const mapBusy = cacheRelasi.mapBusyAll[`${hari}_${jam}`] || {};

    let autoGuru = currentGuru;
    const valTrim = val.trim();

    if (valTrim) {
      // 1. Cek apakah Fan berstatus wajib MS (Mustahiq)
      const isMS = cekFanMSuntukKelas(
        cacheRelasi.primaryFanKey,
        cacheRelasi.fallbackFanKey,
        valTrim,
        fanDetail
      );

      if (isMS && namaMS && !mapBusy[namaMS.toUpperCase()]) {
        autoGuru = namaMS;
        const cellKey = `${jam}_${hari}`;
        setHighlightMSCell(cellKey);
        setTimeout(() => {
          setHighlightMSCell((prev) => (prev === cellKey ? null : prev));
        }, 1300);
      } else if (!currentGuru.trim()) {
        // 2. Jika kolom Asatidz masih kosong dan Fan hanya punya 1 pengajar, auto-fill
        const valLower = valTrim.toLowerCase();
        let guruFan = cacheRelasi.mapFanKeAsatidz[valLower] || [];
        if (guruFan.length === 0) {
          const matchItem = cacheRelasi.listFanKelas.find(
            (f) =>
              f.fan.toLowerCase() === valLower ||
              f.mapel.toLowerCase() === valLower ||
              f.rawItem.toLowerCase().includes(valLower) ||
              valLower.includes(f.fan.toLowerCase())
          );
          if (matchItem) guruFan = matchItem.asatidz || [];
        }
        if (guruFan.length === 1) {
          const calon = guruFan[0].trim();
          if (!mapBusy[calon.toUpperCase()]) {
            autoGuru = calon;
          }
        }
      }
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
      asatidzList,
      formasiList
    );
    setIsSubmitting(false);

    if (!success) {
      alert('Gagal menyimpan jadwal kelas.');
    }
  };

  const renderRowHari = (jam: 1 | 2, hari: string) => {
    const mapBusy = cacheRelasi.mapBusyAll[`${hari}_${jam}`] || {};
    const sourceData = jam === 1 ? jam1Data : jam2Data;
    const entry = sourceData[hari] || { asatidz: '', fan: '' };
    const cleanGuruUpper = entry.asatidz.trim().toUpperCase();
    const valFanLower = entry.fan.trim().toLowerCase();

    // Datalist Fan tersaring berdasarkan Asatidz jika dipilih
    const opsiFan = (() => {
      if (cleanGuruUpper) {
        const fansGuru = cacheRelasi.mapAsatidzKeFan[cleanGuruUpper] || [];
        if (fansGuru.length > 0) return fansGuru;
      }
      return cacheRelasi.listSemuaFan;
    })();

    // Datalist Asatidz tersaring berdasarkan Fan jika dipilih
    const opsiAsatidz = (() => {
      if (valFanLower) {
        let guruFan = cacheRelasi.mapFanKeAsatidz[valFanLower] || [];
        if (guruFan.length === 0) {
          const matchItem = cacheRelasi.listFanKelas.find(
            (f) =>
              f.fan.toLowerCase() === valFanLower ||
              f.mapel.toLowerCase() === valFanLower ||
              f.rawItem.toLowerCase().includes(valFanLower) ||
              valFanLower.includes(f.fan.toLowerCase())
          );
          if (matchItem) guruFan = matchItem.asatidz || [];
        }
        if (guruFan.length > 0) return guruFan;
      }
      if (cacheRelasi.setSemuaAsatidz.length > 0) {
        return cacheRelasi.setSemuaAsatidz;
      }
      return asatidzList.map((a) => a.nama_asatidz).filter(Boolean);
    })();

    const busyTeachersForThisFan = opsiAsatidz
      .map((g) => {
        const gUpper = g.trim().toUpperCase();
        const busy = mapBusy[gUpper];
        return busy ? `${g} (di ${busy})` : null;
      })
      .filter(Boolean);

    const isMSHighlighted = highlightMSCell === `${jam}_${hari}`;

    return (
      <div
        key={hari}
        className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2"
      >
        <span
          className={`w-20 text-[11px] font-bold text-center shrink-0 leading-tight ${
            jam === 1 ? 'text-emerald-800' : 'text-blue-800'
          }`}
        >
          {hari} - Jam {jam}
        </span>

        <div className="flex-1 space-y-1">
          {/* Asatidz Input / Datalist */}
          <input
            type="text"
            list={`dl_asatidz_${jam}_${hari}`}
            value={entry.asatidz}
            onChange={(e) => handleAsatidzChange(jam, hari, e.target.value)}
            placeholder={
              valFanLower && opsiAsatidz.length > 0
                ? 'Pilih Asatidz pengajar fan ini...'
                : 'Ketik / Pilih Asatidz...'
            }
            className={`w-full text-xs py-1.5 px-2 rounded border focus:outline-none font-medium bg-white transition-all ${
              isMSHighlighted
                ? 'border-emerald-600 ring-2 ring-emerald-500/30 bg-emerald-50/30'
                : jam === 1
                ? 'border-slate-300 focus:ring-1 focus:ring-emerald-500'
                : 'border-slate-300 focus:ring-1 focus:ring-blue-500'
            }`}
          />
          {busyTeachersForThisFan.length > 0 && !entry.asatidz && (
            <p className="text-[10.5px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 leading-tight">
              ⚠️ Pengajar bentrok di sesi ini: <b>{busyTeachersForThisFan.join(', ')}</b>
            </p>
          )}
          <datalist id={`dl_asatidz_${jam}_${hari}`}>
            {namaMS && (
              <option value={namaMS} label={`⭐ [MUSTAHIQ KELAS] ${namaMS}`}>
                ⭐ [MUSTAHIQ KELAS] {namaMS}
              </option>
            )}
            {opsiAsatidz.map((namaGuru, gIdx) => {
              if (namaMS && namaGuru.trim().toUpperCase() === namaMS.toUpperCase()) return null;
              const gUpper = namaGuru.trim().toUpperCase();
              const busyClass = mapBusy[gUpper];
              if (busyClass) {
                return (
                  <option
                    key={`${namaGuru}_${gIdx}`}
                    value={`[TERPAKAI di ${busyClass}] ${namaGuru}`}
                    label={`⚠️ Sedang Mengajar di ${busyClass} (${hari} Jam ${jam})`}
                  />
                );
              }
              return (
                <option
                  key={`${namaGuru}_${gIdx}`}
                  value={namaGuru}
                  label="Pengajar Fan Terdaftar"
                />
              );
            })}
          </datalist>

          {/* Fan Input / Datalist */}
          <input
            type="text"
            list={`dl_fan_${jam}_${hari}`}
            value={entry.fan}
            onChange={(e) => handleFanChange(jam, hari, e.target.value)}
            placeholder={
              cleanGuruUpper && opsiFan.length > 0
                ? 'Pilih Fan yang diajar...'
                : 'Ketik / Pilih Fan / Mapel...'
            }
            className={`w-full text-xs py-1.5 px-2 rounded border border-slate-300 focus:outline-none bg-white ${
              jam === 1 ? 'focus:ring-1 focus:ring-emerald-500' : 'focus:ring-1 focus:ring-blue-500'
            }`}
          />
          <datalist id={`dl_fan_${jam}_${hari}`}>
            {opsiFan.map((fanName, fIdx) => (
              <option key={`${fanName}_${fIdx}`} value={fanName} />
            ))}
          </datalist>
        </div>

        <button
          type="button"
          onClick={() => handleClearDay(jam, hari)}
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-200 rounded transition-colors"
          title={`Hapus baris ${hari} Jam ${jam}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
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
          <div
            className={`rounded-xl overflow-hidden shadow-xs bg-white ${
              selectedInputJamFokus === 1
                ? 'border-2 border-emerald-500 ring-2 ring-emerald-500/15'
                : 'border border-emerald-200'
            }`}
          >
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
              {LIST_HARI.map((hari) => renderRowHari(1, hari))}
            </div>
          </div>

          {/* KOTAK JAM KE-2 */}
          <div
            className={`rounded-xl overflow-hidden shadow-xs bg-white ${
              selectedInputJamFokus === 2
                ? 'border-2 border-blue-500 ring-2 ring-blue-500/15'
                : 'border border-blue-200'
            }`}
          >
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
              {LIST_HARI.map((hari) => renderRowHari(2, hari))}
            </div>
          </div>
        </div>

        {/* Info Alert */}
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2">
          <Info className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span>
            Isi asatidz dan mapel untuk tiap hari pada Jam 1 dan Jam 2. Kosongkan baris jika tidak
            ada jadwal. Perubahan baru tersimpan setelah menekan tombol{' '}
            <b>Simpan Jadwal Kelas (Jam 1 &amp; 2)</b>.
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
