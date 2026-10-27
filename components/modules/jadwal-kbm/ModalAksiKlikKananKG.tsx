'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useJadwalStore } from '@/stores/useJadwalStore';
import { useFanStore } from '@/stores/useFanStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { LIST_HARI, KelasKbmItem } from '@/types/jadwal';
import {
  siapkanCacheRelasiFanJadwalKelas,
  cekFanMSuntukKelas,
  dapatkanBatasJamFan,
} from '@/lib/utils/jadwalHelper';
import {
  CalendarRange,
  Clock,
  DoorOpen,
  CheckCircle2,
  ArrowLeftRight,
  Trash2,
  Info,
  X,
  Save,
} from 'lucide-react';

interface ModalAksiKlikKananKGProps {
  masterStrukturKelas: KelasKbmItem[];
}

export default function ModalAksiKlikKananKG({ masterStrukturKelas }: ModalAksiKlikKananKGProps) {
  const {
    isModalAksiKGOpen,
    closeModalAksiKG,
    stateContextKG,
    actionTypeModalKG,
    eksekusiAksiKlikKananKG,
  } = useJadwalStore();

  const { fanConfig, fanDetail } = useFanStore();
  const { asatidzList } = useAsatidzStore();
  const { formasiList } = useFormasiStore();

  const [targetKelasKey, setTargetKelasKey] = useState('');
  const [targetHari, setTargetHari] = useState('Sabtu');
  const [targetJam, setTargetJam] = useState<1 | 2>(1);
  const [slotAsatidz, setSlotAsatidz] = useState('');
  const [slotFan, setSlotFan] = useState('');
  const [highlightMS, setHighlightMS] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const actionType = actionTypeModalKG || stateContextKG?.actionType || 'asatidz';
  const currentClass = stateContextKG?.classObj || null;

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

  useEffect(() => {
    if (!isModalAksiKGOpen || !stateContextKG) return;
    const srcHari = stateContextKG.hari;
    const srcJam = (parseInt(String(stateContextKG.jam), 10) === 2 ? 2 : 1) as 1 | 2;

    if (actionType === 'hari') {
      const firstOtherDay = LIST_HARI.find((h) => h !== srcHari) || 'Sabtu';
      setTargetHari(firstOtherDay);
      setTargetJam(srcJam);
      setTargetKelasKey(stateContextKG.kelasKey);
    } else if (actionType === 'jam') {
      setTargetHari(srcHari);
      setTargetJam(srcJam === 1 ? 2 : 1);
      setTargetKelasKey(stateContextKG.kelasKey);
    } else if (actionType === 'kelas') {
      const firstOtherClass =
        masterStrukturKelas.find((c) => c.key !== stateContextKG.kelasKey)?.key ||
        stateContextKG.kelasKey;
      setTargetKelasKey(firstOtherClass);
      setTargetHari(srcHari);
      setTargetJam(srcJam);
    } else if (actionType === 'asatidz') {
      setSlotAsatidz(stateContextKG.guru || '');
      setSlotFan(stateContextKG.fan && stateContextKG.fan !== '-' ? stateContextKG.fan : '');
      setTargetKelasKey(stateContextKG.kelasKey);
      setTargetHari(srcHari);
      setTargetJam(srcJam);
    }
  }, [isModalAksiKGOpen, stateContextKG, actionType, masterStrukturKelas]);

  if (!isModalAksiKGOpen || !stateContextKG || !currentClass) return null;

  const srcHari = stateContextKG.hari;
  const srcJam = (parseInt(String(stateContextKG.jam), 10) === 2 ? 2 : 1) as 1 | 2;
  const mapBusy = cacheRelasi?.mapBusyAll[`${srcHari}_${srcJam}`] || {};

  // Datalist dua arah untuk mode 'asatidz'
  const cleanAsatidzUpper = slotAsatidz
    .replace(/^\[TERPAKAI di [^\]]+\]\s*/i, '')
    .replace(/^⭐\s*\[MUSTAHIQ KELAS\]\s*/i, '')
    .trim()
    .toUpperCase();

  const opsiFanDatalist = (() => {
    if (!cacheRelasi) return [];
    if (cleanAsatidzUpper) {
      const fansGuru = cacheRelasi.mapAsatidzKeFan[cleanAsatidzUpper] || [];
      if (fansGuru.length > 0) return fansGuru;
    }
    return cacheRelasi.listSemuaFan;
  })();

  const opsiAsatidzDatalist = (() => {
    if (!cacheRelasi) return [];
    const valFanTrim = slotFan.trim().toLowerCase();
    if (valFanTrim) {
      let guruFan = cacheRelasi.mapFanKeAsatidz[valFanTrim] || [];
      if (guruFan.length === 0) {
        const matchItem = cacheRelasi.listFanKelas.find(
          (f) =>
            f.fan.toLowerCase() === valFanTrim ||
            f.mapel.toLowerCase() === valFanTrim ||
            f.rawItem.toLowerCase().includes(valFanTrim) ||
            valFanTrim.includes(f.fan.toLowerCase())
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

  const validasiBatasJamFanSlot = (fanVal: string): boolean => {
    if (!fanVal || !cacheRelasi) return true;
    const resolveFan = (nilai: string) => {
      let info = dapatkanBatasJamFan(cacheRelasi.primaryFanKey, nilai, fanConfig, fanDetail);
      if (!info && cacheRelasi.isUg) {
        info = dapatkanBatasJamFan(cacheRelasi.fallbackFanKey, nilai, fanConfig, fanDetail);
      }
      return info;
    };

    const fanInfo = resolveFan(fanVal);
    if (!fanInfo || fanInfo.maxJam === null) return true;
    const maxBatas = fanInfo.maxJam;

    let totalPakai = 1;
    ([1, 2] as const).forEach((j) => {
      LIST_HARI.forEach((h) => {
        if (h === srcHari && j === srcJam) return;
        const sesiList = currentClass.jadwal[h]?.[j] || [];
        if (sesiList.length > 0) {
          const v = (sesiList[0].fanAsli || sesiList[0].fan || '').trim();
          if (v && v !== '-') {
            const mi = resolveFan(v);
            if (mi && mi.rawItem === fanInfo.rawItem) totalPakai++;
          }
        }
      });
    });

    if (totalPakai > maxBatas) {
      alert(
        `⚠️ MELEBIHI BATAS JAM!\n\nFan/Mata Pelajaran "${fanVal}" hanya dialokasikan maksimal ${maxBatas} Jam tiap minggu untuk kelas ini.\nTotal jam untuk fan ini sudah mencapai ${totalPakai} Jam.`
      );
      return false;
    }
    return true;
  };

  const handleChangeAsatidzSlot = (rawVal: string) => {
    const matchTerpakai = rawVal.match(/^\[TERPAKAI di (.+?)\]\s*(.+)$/);
    if (matchTerpakai) {
      alert(
        `⚠️ TIDAK BISA DIPILIH!\n\n${matchTerpakai[2]} sudah memiliki jadwal mengajar di ${matchTerpakai[1]} pada hari ${srcHari} Jam ${srcJam}.`
      );
      setSlotAsatidz('');
      return;
    }

    const cleanVal = rawVal.replace(/^⭐\s*\[MUSTAHIQ KELAS\]\s*/i, '').trim();
    const busyKls = mapBusy[cleanVal.toUpperCase()];
    if (busyKls) {
      alert(
        `⚠️ TIDAK BISA DIPILIH!\n\n${cleanVal} sudah memiliki jadwal mengajar di ${busyKls} pada hari ${srcHari} Jam ${srcJam}.`
      );
      setSlotAsatidz('');
      return;
    }

    setSlotAsatidz(cleanVal);

    if (cleanVal && cacheRelasi) {
      const fansGuru = cacheRelasi.mapAsatidzKeFan[cleanVal.toUpperCase()] || [];
      if (
        fansGuru.length === 1 &&
        (!slotFan || !fansGuru.some((f) => f.toLowerCase() === slotFan.trim().toLowerCase()))
      ) {
        if (validasiBatasJamFanSlot(fansGuru[0])) {
          setSlotFan(fansGuru[0]);
        }
      }
    }
  };

  const handleChangeFanSlot = (rawFan: string) => {
    const valFan = rawFan.trim();
    if (valFan && !validasiBatasJamFanSlot(valFan)) {
      setSlotFan('');
      return;
    }

    setSlotFan(rawFan);

    if (valFan && cacheRelasi) {
      // Auto-Assign Mustahiq jika Fan berstatus wajib MS
      const isMSFan = cekFanMSuntukKelas(
        cacheRelasi.primaryFanKey,
        cacheRelasi.fallbackFanKey,
        valFan,
        fanDetail
      );
      const namaMS =
        currentClass.mustahiqNama && currentClass.mustahiqNama !== '-'
          ? currentClass.mustahiqNama.trim()
          : '';

      if (isMSFan && namaMS) {
        const busyMS = mapBusy[namaMS.toUpperCase()];
        if (!busyMS) {
          setSlotAsatidz(namaMS);
          setHighlightMS(true);
          setTimeout(() => setHighlightMS(false), 1300);
          return;
        }
      }

      // Auto-Assign jika Fan hanya punya 1 pengajar dan kolom Asatidz masih kosong
      if (!slotAsatidz.trim()) {
        const valLower = valFan.toLowerCase();
        let guruFan = cacheRelasi.mapFanKeAsatidz[valLower] || [];
        if (guruFan.length === 0) {
          const matchItem = cacheRelasi.listFanKelas.find(
            (f) =>
              f.fan.toLowerCase() === valLower ||
              f.mapel.toLowerCase() === valLower ||
              f.rawItem.toLowerCase().includes(valLower)
          );
          if (matchItem) guruFan = matchItem.asatidz || [];
        }
        if (guruFan.length === 1) {
          const calon = guruFan[0].trim();
          if (!mapBusy[calon.toUpperCase()]) {
            setSlotAsatidz(calon);
          }
        }
      }
    }
  };

  // Hitung status preview target
  const targetKlsObj = masterStrukturKelas.find(
    (c) => c.key === (actionType === 'kelas' ? targetKelasKey : stateContextKG.kelasKey)
  );
  const sesiTargetList =
    targetKlsObj?.jadwal[actionType === 'jam' ? srcHari : targetHari]?.[targetJam] || [];
  const targetSlotOccupied =
    sesiTargetList.length > 0 && sesiTargetList[0].guru && sesiTargetList[0].guru !== '-'
      ? sesiTargetList[0]
      : null;

  const modalTitle = (() => {
    if (actionType === 'hari') return 'Ganti Hari Mengajar';
    if (actionType === 'jam') return 'Ganti Jam Mengajar';
    if (actionType === 'kelas') return 'Ganti Kelas Mengajar';
    return stateContextKG.guru ? 'Isi / Edit Slot Ini' : 'Isi Slot Ini';
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const res = await eksekusiAksiKlikKananKG(
      {
        actionType,
        targetKelasKey: actionType === 'kelas' ? targetKelasKey : stateContextKG.kelasKey,
        targetHari: actionType === 'jam' ? srcHari : targetHari,
        targetJam,
        guruBaru: slotAsatidz,
        fanBaru: slotFan,
      },
      asatidzList,
      formasiList
    );

    setIsSubmitting(false);
    if (!res.ok && res.errorMsg) {
      alert(res.errorMsg);
    }
  };

  const genderTag = currentClass.papi ? `(${currentClass.papi})` : '';
  const labelKelasSumber = `${currentClass.kls} ${currentClass.bag} ${currentClass.tingkat} ${genderTag}`.trim();
  const guruLama = (stateContextKG.guru || '').trim();
  const guruBaruTrim = slotAsatidz.trim();
  const namaMS =
    currentClass.mustahiqNama && currentClass.mustahiqNama !== '-'
      ? currentClass.mustahiqNama.trim()
      : '';

  return (
    <Dialog
      isOpen={isModalAksiKGOpen}
      onClose={closeModalAksiKG}
      title={modalTitle}
      maxWidth={actionType === 'asatidz' ? '2xl' : 'md'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info Slot Sumber */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <div className="font-bold text-slate-800">{labelKelasSumber}</div>
            <div className="text-[11px] text-emerald-700 font-semibold">
              {srcHari} • Jam {srcJam}
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-slate-800">
              {stateContextKG.guru
                ? `${stateContextKG.guru} (${stateContextKG.kg || '-'})`
                : 'Belum Ada Asatidz'}
            </div>
            <div className="text-[11px] text-slate-500">
              Fan: {stateContextKG.fan && stateContextKG.fan !== '-' ? stateContextKG.fan : '-'}
            </div>
          </div>
        </div>

        {/* Dynamic Fields Berdasarkan Mode */}
        {actionType === 'hari' && (
          <div className="grid grid-cols-12 gap-3 text-xs">
            <div className="col-span-7">
              <label className="block font-bold text-slate-700 mb-1">Ganti Hari:</label>
              <select
                value={targetHari}
                onChange={(e) => setTargetHari(e.target.value)}
                className="w-full py-2 px-2.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {LIST_HARI.map((h) => (
                  <option key={h} value={h} disabled={h === srcHari}>
                    {h} {h === srcHari ? '(Hari Asal)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-5">
              <label className="block font-bold text-slate-700 mb-1">Jam Ke:</label>
              <select
                value={targetJam}
                onChange={(e) => setTargetJam((parseInt(e.target.value, 10) === 2 ? 2 : 1) as 1 | 2)}
                className="w-full py-2 px-2.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value={1}>Jam Ke-1</option>
                <option value={2}>Jam Ke-2</option>
              </select>
            </div>
          </div>
        )}

        {actionType === 'jam' && (
          <div className="text-xs">
            <label className="block font-bold text-slate-700 mb-1">Ganti Jam Ke:</label>
            <select
              value={targetJam}
              onChange={(e) => setTargetJam((parseInt(e.target.value, 10) === 2 ? 2 : 1) as 1 | 2)}
              className="w-full py-2 px-2.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value={1}>Jam Ke-1</option>
              <option value={2}>Jam Ke-2</option>
            </select>
          </div>
        )}

        {actionType === 'kelas' && (
          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Ganti ke Kelas:</label>
              <select
                value={targetKelasKey}
                onChange={(e) => setTargetKelasKey(e.target.value)}
                className="w-full py-2 px-2.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {masterStrukturKelas.map((c) => (
                  <option key={c.key} value={c.key} disabled={c.key === stateContextKG.kelasKey}>
                    {c.kls} {c.bag} {c.tingkat} {c.papi ? `(${c.papi})` : ''}{' '}
                    {c.key === stateContextKG.kelasKey ? '(Kelas Asal)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-7">
                <label className="block font-bold text-slate-700 mb-1">Ganti Hari:</label>
                <select
                  value={targetHari}
                  onChange={(e) => setTargetHari(e.target.value)}
                  className="w-full py-2 px-2.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {LIST_HARI.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-5">
                <label className="block font-bold text-slate-700 mb-1">Jam Ke:</label>
                <select
                  value={targetJam}
                  onChange={(e) =>
                    setTargetJam((parseInt(e.target.value, 10) === 2 ? 2 : 1) as 1 | 2)
                  }
                  className="w-full py-2 px-2.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={1}>Jam Ke-1</option>
                  <option value={2}>Jam Ke-2</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {actionType === 'asatidz' && (
          <div
            className={`border-2 rounded-xl overflow-hidden shadow-xs ${
              srcJam === 1 ? 'border-emerald-500' : 'border-blue-500'
            }`}
          >
            <div
              className={`px-3.5 py-2 flex justify-between items-center text-xs font-bold ${
                srcJam === 1
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-blue-50 text-blue-800'
              }`}
            >
              <span>Jam Ke-{srcJam}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-white text-[10px] ${
                  srcJam === 1 ? 'bg-emerald-600' : 'bg-blue-600'
                }`}
              >
                Hari {srcHari}
              </span>
            </div>
            <div className="overflow-x-auto bg-white">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-2.5 w-20 text-center border-r border-slate-200">HARI</th>
                    <th className="py-2 px-2.5 text-left border-r border-slate-200">ASATIDZ</th>
                    <th className="py-2 px-2.5 text-left border-r border-slate-200">FAN / MAPEL</th>
                    <th className="py-2 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 text-center font-bold text-emerald-700 border-r border-slate-200">
                      {srcHari}
                    </td>
                    <td className="p-2 border-r border-slate-200">
                      <input
                        type="text"
                        list="dl_akg_slot_asatidz"
                        value={slotAsatidz}
                        onChange={(e) => handleChangeAsatidzSlot(e.target.value)}
                        placeholder={
                          slotFan.trim() && opsiAsatidzDatalist.length > 0
                            ? 'Pilih Asatidz pengajar fan ini...'
                            : 'Ketik / Pilih Asatidz...'
                        }
                        className={`w-full py-1.5 px-2.5 rounded border text-xs font-medium focus:outline-none transition-all ${
                          highlightMS
                            ? 'border-emerald-600 ring-2 ring-emerald-500/30 bg-emerald-50/30'
                            : 'border-slate-300 focus:ring-1 focus:ring-emerald-500'
                        }`}
                      />
                      <datalist id="dl_akg_slot_asatidz">
                        {namaMS && (
                          <option
                            value={namaMS}
                            label={`⭐ [MUSTAHIQ KELAS] ${namaMS}`}
                          />
                        )}
                        {opsiAsatidzDatalist.map((namaGuru, idx) => {
                          if (namaMS && namaGuru.trim().toUpperCase() === namaMS.toUpperCase()) {
                            return null;
                          }
                          const klsLain = mapBusy[namaGuru.trim().toUpperCase()];
                          if (klsLain) {
                            return (
                              <option
                                key={`${namaGuru}_${idx}`}
                                value={`[TERPAKAI di ${klsLain}] ${namaGuru}`}
                              />
                            );
                          }
                          return <option key={`${namaGuru}_${idx}`} value={namaGuru} />;
                        })}
                      </datalist>
                    </td>
                    <td className="p-2 border-r border-slate-200">
                      <input
                        type="text"
                        list="dl_akg_slot_fan"
                        value={slotFan}
                        onChange={(e) => handleChangeFanSlot(e.target.value)}
                        placeholder={
                          cleanAsatidzUpper && opsiFanDatalist.length > 0
                            ? 'Pilih Fan yang diajar...'
                            : 'Ketik / Pilih Fan / Mapel...'
                        }
                        className="w-full py-1.5 px-2.5 rounded border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <datalist id="dl_akg_slot_fan">
                        {opsiFanDatalist.map((f, idx) => (
                          <option key={`${f}_${idx}`} value={f} />
                        ))}
                      </datalist>
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSlotAsatidz('');
                          setSlotFan('');
                        }}
                        title={`Kosongkan ${srcHari} Jam ${srcJam}`}
                        className="p-1.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Kotak Preview Status Target (#akg_status_preview) */}
        <div id="akg_status_preview">
          {actionType === 'asatidz' ? (
            !guruBaruTrim && !guruLama ? (
              <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs flex items-start gap-2">
                <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>
                  Silakan isi kolom <b>Asatidz</b> dan <b>Fan / Mapel</b> untuk hari{' '}
                  <b>
                    {srcHari} (Jam Ke-{srcJam})
                  </b>
                  .
                </span>
              </div>
            ) : !guruBaruTrim && guruLama ? (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <Trash2 className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>
                  Slot hari{' '}
                  <b>
                    {srcHari} (Jam Ke-{srcJam})
                  </b>{' '}
                  yang sebelumnya diisi oleh <b>{guruLama}</b> akan <b>dikosongkan</b>.
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Hari{' '}
                  <b>
                    {srcHari} (Jam Ke-{srcJam})
                  </b>{' '}
                  akan diisi Asatidz: <b>{guruBaruTrim}</b> • Fan/Mapel:{' '}
                  <b>{slotFan.trim() || '-'}</b>.
                </span>
              </div>
            )
          ) : !targetSlotOccupied ? (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Slot pada hari <b>{actionType === 'jam' ? srcHari : targetHari}</b> Jam Ke-
                <b>{targetJam}</b> di kelas ini <b>KOSONG</b> (Belum ada asatidz).
              </span>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-2">
              <ArrowLeftRight className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div>
                  Slot target <b>TERISI</b> oleh: <b>{targetSlotOccupied.guru}</b> [KG:{' '}
                  {targetSlotOccupied.kg || '-'}] - Fan: <b>{targetSlotOccupied.fan || '-'}</b>.
                </div>
                <div className="text-[11px] text-amber-800 mt-0.5">
                  *Aksi ini akan menukar posisi asatidz secara otomatis.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={closeModalAksiKG}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Batal
          </button>

          {actionType === 'asatidz' ? (
            <button
              type="submit"
              disabled={isSubmitting || (!guruBaruTrim && !guruLama)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50 ${
                !guruBaruTrim && guruLama
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {!guruBaruTrim && guruLama ? (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Kosongkan & Simpan'}</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Menyimpan...' : `Simpan Jadwal (${srcHari})`}</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50 ${
                targetSlotOccupied
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {actionType === 'hari' && <CalendarRange className="w-3.5 h-3.5" />}
              {actionType === 'jam' && <Clock className="w-3.5 h-3.5" />}
              {actionType === 'kelas' && <DoorOpen className="w-3.5 h-3.5" />}
              <span>
                {isSubmitting
                  ? 'Menyimpan...'
                  : targetSlotOccupied
                  ? 'Ganti dan Simpan'
                  : 'Simpan'}
              </span>
            </button>
          )}
        </div>
      </form>
    </Dialog>
  );
}
