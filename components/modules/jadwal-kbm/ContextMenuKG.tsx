'use client';

import React, { useEffect, useRef, useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useJadwalStore } from '@/stores/useJadwalStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useFanStore } from '@/stores/useFanStore';
import { ModeTempelKG, SyncPlanFanKBM } from '@/types/jadwal';
import {
  Scissors,
  ArrowLeftRight,
  Users,
  BookUp,
  FileMinus,
  UserCog,
  BookOpen,
  ArrowRightCircle,
  XOctagon,
  CalendarRange,
  Clock,
  DoorOpen,
  UserPlus,
  CalendarDays,
  UserCheck,
  Trash2,
  X,
  ClipboardCheck,
  CheckCheck,
} from 'lucide-react';
import {
  ambilNamaFanSingkat,
  removeSlotFromGuruObj,
  syncGuruMengajarAndTotalObj,
  getJadwalGuruFromMap,
  normalisasiNamaKelas,
} from '@/lib/utils/jadwalHelper';

export default function ContextMenuKG() {
  const {
    isContextMenuOpen,
    contextMenuPos,
    stateContextKG,
    stateClipboardKG,
    closeContextMenuKG,
    mulaiModePindahKG,
    batalkanModePindahKG,
    analisisSinkronisasiTempelKG,
    eksekusiTempelKG,
    openModalInputJadwal,
    openModalAksiKG,
    jadwalMap,
    simpanBatchJadwalAsatidz,
    rebuildMasterStrukturKelas,
  } = useJadwalStore();

  const { asatidzList, openDetailModal } = useAsatidzStore();
  const { formasiList } = useFormasiStore();
  const { fanConfig } = useFanStore();
  const menuRef = useRef<HTMLDivElement>(null);

  // State konfirmasi Smart Auto-Sync 4 Poin
  const [pendingTempel, setPendingTempel] = useState<{
    mode: ModeTempelKG;
    syncPlan: SyncPlanFanKBM;
    hari: string;
    jam: number;
    kelasKey: string;
    classObj: NonNullable<typeof stateContextKG>['classObj'];
    guru: string;
    fan: string;
  } | null>(null);
  const [pilihanMSMap, setPilihanMSMap] = useState<Record<string, 'use_ms' | 'keep_guru'>>({});
  const [isSyncSubmitting, setIsSyncSubmitting] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenuKG();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeContextMenuKG();
      }
    };
    const handleScroll = () => {
      closeContextMenuKG();
    };

    if (isContextMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isContextMenuOpen, closeContextMenuKG]);

  const handleTempelKlik = async (mode: ModeTempelKG) => {
    if (!stateContextKG) return;
    const { kelasKey, classObj: k, hari, jam, guru, fan } = stateContextKG;
    closeContextMenuKG();

    const analisis = analisisSinkronisasiTempelKG(
      mode,
      hari,
      jam,
      kelasKey,
      k,
      guru,
      fan,
      asatidzList,
      formasiList
    );

    if (!analisis.ok) {
      alert(analisis.errorMsg || 'Gagal memvalidasi jadwal.');
      return;
    }

    if (analisis.syncPlan && analisis.syncPlan.hasChanges) {
      const defaultMSChoices: Record<string, 'use_ms' | 'keep_guru'> = {};
      analisis.syncPlan.msPrompts.forEach((mp) => {
        defaultMSChoices[mp.slotId] = 'use_ms';
      });
      setPilihanMSMap(defaultMSChoices);
      setPendingTempel({
        mode,
        syncPlan: analisis.syncPlan,
        hari,
        jam,
        kelasKey,
        classObj: k,
        guru,
        fan,
      });
      return;
    }

    const res = await eksekusiTempelKG(
      mode,
      hari,
      jam,
      kelasKey,
      k,
      guru,
      fan,
      asatidzList,
      formasiList
    );
    if (!res.ok && res.errorMsg) {
      alert(res.errorMsg);
    }
  };

  const handleConfirmSyncTempel = async () => {
    if (!pendingTempel) return;
    setIsSyncSubmitting(true);
    const res = await eksekusiTempelKG(
      pendingTempel.mode,
      pendingTempel.hari,
      pendingTempel.jam,
      pendingTempel.kelasKey,
      pendingTempel.classObj,
      pendingTempel.guru,
      pendingTempel.fan,
      asatidzList,
      formasiList,
      pilihanMSMap
    );
    setIsSyncSubmitting(false);
    setPendingTempel(null);
    if (!res.ok && res.errorMsg) {
      alert(res.errorMsg);
    }
  };

  const renderSyncModal = () => {
    if (!pendingTempel) return null;
    const { syncPlan } = pendingTempel;

    return (
      <Dialog
        isOpen={Boolean(pendingTempel)}
        onClose={() => setPendingTempel(null)}
        title="Sinkronisasi Otomatis Fan Pelajaran"
        maxWidth="lg"
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-600">
            Sistem mendeteksi penyesuaian otomatis ke menu <b>Fan Pelajaran</b> agar data tetap
            100% sinkron:
          </p>

          <ul className="space-y-1.5 pl-4 list-disc text-slate-700">
            {syncPlan.addFanItems.map((a, idx) => (
              <li key={`add_${idx}`}>
                <span className="inline-block px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800 font-bold text-[10px] mr-1.5">
                  Atur Item Fan
                </span>
                Menambahkan Fan <b>{a.rawItem}</b> ke konfigurasi kelas <b>{a.kelasKey}</b>.
              </li>
            ))}

            {syncPlan.registerAsatidz.map((r, idx) => (
              <li key={`reg_${idx}`}>
                <span className="inline-block px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px] mr-1.5">
                  Pengajar Fan
                </span>
                Mendaftarkan <b>{r.guru}</b> sebagai pengajar Fan <b>{r.fanShort}</b> di kelas{' '}
                <b>{r.kelasKey}</b> (Kategori: <b>{r.newPengajarLabel}</b>).
              </li>
            ))}

            {syncPlan.updateJamQuotas.map((u, idx) => (
              <li key={`jam_${idx}`}>
                <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px] mr-1.5">
                  Kuota Jam Fan
                </span>
                Menaikkan kuota jam Fan <b>{u.fanShort}</b> ({u.kelasKey}) dari{' '}
                <b>{u.oldJam} Jam</b> menjadi <b>{u.newJam} Jam</b>/minggu.
              </li>
            ))}
          </ul>

          {syncPlan.msPrompts.map((mp, idx) => {
            const currentVal = pilihanMSMap[mp.slotId] || 'use_ms';
            return (
              <div
                key={`ms_${idx}`}
                className="p-3 rounded-xl border border-amber-300 bg-amber-50/70 space-y-2"
              >
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>
                    Fan Khusus Mustahiq (MS) Terdeteksi - {mp.labelSlot}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600">
                  Fan <b>{mp.fanShort}</b> berstatus wajib <b>MS</b>, sedangkan Asatidz yang
                  ditempel adalah <b>{mp.currentGuru}</b>. Pilih tindakan:
                </div>
                <div className="space-y-1.5 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-emerald-800">
                    <input
                      type="radio"
                      name={`ms_choice_${idx}`}
                      checked={currentVal === 'use_ms'}
                      onChange={() =>
                        setPilihanMSMap((prev) => ({ ...prev, [mp.slotId]: 'use_ms' }))
                      }
                      className="accent-emerald-600"
                    />
                    <span>
                      Otomatis gunakan Mustahiq Kelas (<b>{mp.mustahiqNama}</b>)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-blue-800">
                    <input
                      type="radio"
                      name={`ms_choice_${idx}`}
                      checked={currentVal === 'keep_guru'}
                      onChange={() =>
                        setPilihanMSMap((prev) => ({ ...prev, [mp.slotId]: 'keep_guru' }))
                      }
                      className="accent-blue-600"
                    />
                    <span>
                      Tetap gunakan <b>{mp.currentGuru}</b> &amp; tambahkan ke Pengajar Fan
                    </span>
                  </label>
                </div>
              </div>
            );
          })}

          <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setPendingTempel(null)}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isSyncSubmitting}
              onClick={handleConfirmSyncTempel}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>{isSyncSubmitting ? 'Menyinkronkan...' : 'Ya, Sinkronkan & Simpan'}</span>
            </button>
          </div>
        </div>
      </Dialog>
    );
  };

  if (!isContextMenuOpen || !stateContextKG) {
    return renderSyncModal();
  }

  const { kelasKey, classObj: k, hari, jam, guru, kg, fan } = stateContextKG;

  const isSameAsSource = !!(
    stateClipboardKG &&
    stateClipboardKG.kelasKey === kelasKey &&
    stateClipboardKG.hari === hari &&
    parseInt(String(stateClipboardKG.jam), 10) === parseInt(String(jam), 10)
  );

  // Position bounds adjustment
  const posX = Math.max(
    10,
    Math.min(contextMenuPos.x, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 290)
  );
  const posY = Math.max(
    10,
    Math.min(contextMenuPos.y, (typeof window !== 'undefined' ? window.innerHeight : 800) - 420)
  );

  // Handler for delete slot
  const handleHapusSlot = async () => {
    closeContextMenuKG();
    if (!guru) return;

    const okConfirm = window.confirm(
      `Hapus jadwal mengajar ${guru} di ${k.kls} ${k.bag} ${k.tingkat} pada ${hari} Jam ${jam}?`
    );

    if (okConfirm) {
      const guruUpper = guru.trim().toUpperCase();
      const existing = getJadwalGuruFromMap(guru, jadwalMap);
      const updated = { ...existing };
      const formatKelas = normalisasiNamaKelas(`${k.kls} ${k.bag} ${k.tingkat} (${k.papi})`);
      const formatKelasTanpaGen = normalisasiNamaKelas(`${k.kls} ${k.bag} ${k.tingkat}`);
      removeSlotFromGuruObj(updated, hari, jam, formatKelas);
      if (formatKelasTanpaGen) {
        removeSlotFromGuruObj(updated, hari, jam, formatKelasTanpaGen);
      }
      syncGuruMengajarAndTotalObj(updated, asatidzList);

      await simpanBatchJadwalAsatidz(
        { [guruUpper]: updated },
        `Hapus slot ${guru} ${hari} Jam ${jam}`
      );
      if (formasiList.length > 0) {
        rebuildMasterStrukturKelas(formasiList, asatidzList, fanConfig);
      }
    }
  };

  // Handler for view teacher detail
  const handleLihatProfil = () => {
    closeContextMenuKG();
    if (!guru) return;
    const found = asatidzList.find(
      (a) => a.nama_asatidz?.trim().toUpperCase() === guru.trim().toUpperCase()
    );
    if (found) {
      openDetailModal(found);
    } else {
      alert(`Data lengkap untuk ${guru} belum terdaftar di tabel master asatidz.`);
    }
  };

  // -------------------------------------------------------------
  // SKENARIO 1: MODE TEMPEL (State Clipboard aktif & bukan slot sumber)
  // -------------------------------------------------------------
  if (stateClipboardKG && !isSameAsSource) {
    const srcK = stateClipboardKG.classObj;
    const srcFanShort = ambilNamaFanSingkat(
      stateClipboardKG.fan,
      srcK?.tingkat || '',
      srcK?.kls || '',
      fanConfig
    );
    const tgtFanShort = guru ? ambilNamaFanSingkat(fan, k.tingkat, k.kls, fanConfig) : '-';

    return (
      <>
        {renderSyncModal()}
        <div
          ref={menuRef}
          style={{ top: posY, left: posX }}
          className="fixed z-50 w-72 bg-white rounded-xl shadow-2xl border border-amber-300 ring-1 ring-black/5 p-1 text-xs animate-in fade-in zoom-in-95 duration-150 select-none"
        >
          <div className="px-3 py-2 bg-amber-50 rounded-lg border-b border-amber-200/60 mb-1">
            <div className="flex items-center gap-1.5 text-amber-800 font-bold uppercase tracking-wider text-[10px]">
              <ClipboardCheck className="w-3.5 h-3.5" />
              Pop-up Tempel Jadwal
            </div>
            <div
              className="font-bold text-slate-800 truncate mt-0.5"
              title={`${stateClipboardKG.guru} (${srcFanShort})`}
            >
              Dari: <span className="text-amber-900">{stateClipboardKG.guru}</span> ({srcFanShort})
            </div>
            <div className="text-[11px] text-slate-600 mt-1 leading-tight">
              Ke:{' '}
              <b>
                {k.kls} {k.bag} {k.tingkat} ({k.papi}) • {hari} Jam {jam}
              </b>
              <div className="mt-0.5">
                {guru ? (
                  <span>
                    Isi saat ini: <b className="text-emerald-700">{guru} ({tgtFanShort})</b>
                  </span>
                ) : (
                  <span className="text-emerald-600 font-semibold">Status: Slot Kosong (-)</span>
                )}
              </div>
            </div>
          </div>

          {!guru ? (
            <button
              type="button"
              onClick={() => handleTempelKlik('langsung_pindah')}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 font-medium flex items-center gap-2.5 transition-colors"
            >
              <ArrowRightCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <div className="font-semibold">Langsung Pindah</div>
                <div className="text-[10px] text-slate-500 font-normal">
                  Pindahkan Asatidz &amp; Fan ke slot kosong ini
                </div>
              </div>
            </button>
          ) : (
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => handleTempelKlik('tukar_semua')}
                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 font-medium flex items-center gap-2.5 transition-colors"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>1. Tukar (Asatidz &amp; Fan)</span>
              </button>

              <button
                type="button"
                onClick={() => handleTempelKlik('tukar_asatidz')}
                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-blue-50 text-slate-800 hover:text-blue-800 font-medium flex items-center gap-2.5 transition-colors"
              >
                <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>
                  2. Tukar Asatidz <small className="text-slate-400 font-normal">(Fan Tetap)</small>
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTempelKlik('tukar_fan')}
                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-cyan-50 text-slate-800 hover:text-cyan-800 font-medium flex items-center gap-2.5 transition-colors"
              >
                <BookUp className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                <span>
                  3. Tukar Fan <small className="text-slate-400 font-normal">(Asatidz Tetap)</small>
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTempelKlik('pindah_hapus')}
                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-rose-50 text-slate-800 hover:text-rose-800 font-medium flex items-center gap-2.5 transition-colors"
              >
                <FileMinus className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>4. Pindah dan Hapus</span>
              </button>

              <button
                type="button"
                onClick={() => handleTempelKlik('ganti_asatidz')}
                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-amber-50 text-slate-800 hover:text-amber-800 font-medium flex items-center gap-2.5 transition-colors"
              >
                <UserCog className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  5. Ganti Asatidz{' '}
                  <small className="text-slate-400 font-normal">(Fan Tujuan Tetap)</small>
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTempelKlik('ganti_fan')}
                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-800 font-medium flex items-center gap-2.5 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span>
                  6. Ganti Fan{' '}
                  <small className="text-slate-400 font-normal">(Asatidz Tujuan Tetap)</small>
                </span>
              </button>
            </div>
          )}

          <div className="h-px bg-slate-200 my-1" />

          <button
            type="button"
            onClick={() => {
              batalkanModePindahKG();
              closeContextMenuKG();
            }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-50 text-rose-600 font-bold flex items-center gap-2 transition-colors"
          >
            <XOctagon className="w-4 h-4 text-rose-500" />
            <span>Batalkan Pindah</span>
          </button>
        </div>
      </>
    );
  }

  // -------------------------------------------------------------
  // SKENARIO 2: MENU KLIK KANAN STANDAR
  // -------------------------------------------------------------
  const headerTitle = guru ? `${guru} (${kg || '-'})` : `[Slot Kosong] ${k.kls} ${k.bag}`;
  const subTitle = `${k.kls} ${k.bag} ${k.tingkat} • ${hari} Jam ${jam}`;

  return (
    <>
      {renderSyncModal()}
      <div
        ref={menuRef}
        style={{ top: posY, left: posX }}
        className="fixed z-50 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 ring-1 ring-black/5 p-1 text-xs animate-in fade-in zoom-in-95 duration-150 select-none"
      >
        <div className="px-3 py-2 bg-slate-50 rounded-lg border-b border-slate-200/80 mb-1">
          <div className="font-bold text-slate-800 truncate" title={headerTitle}>
            {headerTitle}
          </div>
          <div className="text-[10.5px] text-slate-500 truncate mt-0.5">{subTitle}</div>
          {fan && fan !== '-' && (
            <div className="text-[10px] text-emerald-700 font-semibold truncate mt-0.5">
              Fan: {fan}
            </div>
          )}
        </div>

        {guru && (
          <button
            type="button"
            onClick={() => {
              mulaiModePindahKG();
              closeContextMenuKG();
            }}
            className="w-full text-left px-3 py-1.5 rounded-lg bg-amber-50/70 hover:bg-amber-100 text-amber-900 font-semibold flex items-center gap-2.5 transition-colors mb-0.5"
          >
            <Scissors className="w-3.5 h-3.5 text-amber-600" />
            <span>Pindah Ke</span>
          </button>
        )}

        <button
          type="button"
          disabled={!guru}
          onClick={() => openModalAksiKG('hari')}
          className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 font-medium flex items-center gap-2.5 transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <CalendarRange className="w-3.5 h-3.5 text-emerald-600" />
          <span>Ganti Hari</span>
        </button>

        <button
          type="button"
          disabled={!guru}
          onClick={() => openModalAksiKG('jam')}
          className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-blue-50 text-slate-800 hover:text-blue-800 font-medium flex items-center gap-2.5 transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>Ganti Jam</span>
        </button>

        <button
          type="button"
          disabled={!guru}
          onClick={() => openModalAksiKG('kelas')}
          className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-amber-50 text-slate-800 hover:text-amber-800 font-medium flex items-center gap-2.5 transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <DoorOpen className="w-3.5 h-3.5 text-amber-600" />
          <span>Ganti Kelas</span>
        </button>

        <div className="h-px bg-slate-200 my-1" />

        <button
          type="button"
          onClick={() => openModalAksiKG('asatidz')}
          className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-cyan-50 text-slate-800 hover:text-cyan-800 font-medium flex items-center gap-2.5 transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5 text-cyan-600" />
          <span>{guru ? 'Isi / Ganti Slot Ini' : 'Isi Slot Ini'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            closeContextMenuKG();
            openModalInputJadwal(kelasKey, jam as 1 | 2);
          }}
          className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 font-medium flex items-center gap-2.5 transition-colors"
        >
          <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
          <span>Atur Jadwal Kelas (Jam 1 &amp; 2)</span>
        </button>

        {guru && (
          <>
            <button
              type="button"
              onClick={handleLihatProfil}
              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-blue-50 text-slate-800 hover:text-blue-800 font-medium flex items-center gap-2.5 transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Lihat Profil Asatidz</span>
            </button>

            <button
              type="button"
              onClick={handleHapusSlot}
              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 font-medium flex items-center gap-2.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Hapus Slot Ini</span>
            </button>
          </>
        )}

        {stateClipboardKG && (
          <>
            <div className="h-px bg-slate-200 my-1" />
            <button
              type="button"
              onClick={() => {
                batalkanModePindahKG();
                closeContextMenuKG();
              }}
              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 font-bold flex items-center gap-2 transition-colors"
            >
              <XOctagon className="w-3.5 h-3.5 text-rose-500" />
              <span>Batalkan Pindah</span>
            </button>
          </>
        )}

        <div className="h-px bg-slate-200 my-1" />

        <button
          type="button"
          onClick={closeContextMenuKG}
          className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-500 font-medium flex items-center gap-2 transition-colors"
        >
          <X className="w-3.5 h-3.5 text-slate-400" />
          <span>Tutup</span>
        </button>
      </div>
    </>
  );
}
