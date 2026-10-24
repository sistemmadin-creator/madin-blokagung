'use client';

import React, { useEffect, useRef } from 'react';
import { useJadwalStore } from '@/stores/useJadwalStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import {
  Scissors,
  ArrowLeftRight,
  Replace,
  ArrowRightCircle,
  XOctagon,
  CalendarDays,
  UserCheck,
  Trash2,
  X,
  ClipboardCheck,
} from 'lucide-react';
import { ambilNamaFanSingkat, removeSlotFromGuruObj, syncGuruMengajarAndTotalObj } from '@/lib/utils/jadwalHelper';

export default function ContextMenuKG() {
  const {
    isContextMenuOpen,
    contextMenuPos,
    stateContextKG,
    stateClipboardKG,
    closeContextMenuKG,
    mulaiModePindahKG,
    batalkanModePindahKG,
    eksekusiTempelKG,
    openModalInputJadwal,
    jadwalMap,
    simpanBatchJadwalAsatidz,
  } = useJadwalStore();

  const { asatidzList, openDetailModal } = useAsatidzStore();
  const menuRef = useRef<HTMLDivElement>(null);

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

  if (!isContextMenuOpen || !stateContextKG) return null;

  const { kelasKey, classObj: k, hari, jam, guru, kg, fan } = stateContextKG;

  const isSameAsSource = !!(
    stateClipboardKG &&
    stateClipboardKG.kelasKey === kelasKey &&
    stateClipboardKG.hari === hari &&
    parseInt(String(stateClipboardKG.jam), 10) === parseInt(String(jam), 10)
  );

  // Position bounds adjustment
  const posX = Math.max(10, Math.min(contextMenuPos.x, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 280));
  const posY = Math.max(10, Math.min(contextMenuPos.y, (typeof window !== 'undefined' ? window.innerHeight : 800) - 340));

  // Handler for direct paste
  const handleTempel = async (mode: 'langsung_pindah' | 'tukar' | 'timpa') => {
    closeContextMenuKG();
    await eksekusiTempelKG(
      mode,
      hari,
      jam,
      kelasKey,
      k,
      guru,
      fan,
      asatidzList
    );
  };

  // Handler for delete slot
  const handleHapusSlot = async () => {
    closeContextMenuKG();
    if (!guru) return;

    const okConfirm = window.confirm(
      `Hapus jadwal mengajar ${guru} di ${k.kls} ${k.bag} ${k.tingkat} pada ${hari} Jam ${jam}?`
    );

    if (okConfirm) {
      const guruUpper = guru.trim().toUpperCase();
      const existing = jadwalMap[guruUpper];
      if (!existing) {
        alert('Data jadwal guru tidak ditemukan.');
        return;
      }

      const updated = { ...existing };
      const formatKelas = `${k.kls} ${k.bag} ${k.tingkat} (${k.papi})`;
      removeSlotFromGuruObj(updated, hari, jam, formatKelas);
      syncGuruMengajarAndTotalObj(updated);

      await simpanBatchJadwalAsatidz(
        { [guruUpper]: updated },
        `Hapus slot ${guru} ${hari} Jam ${jam}`
      );
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
    const srcFanShort = ambilNamaFanSingkat(stateClipboardKG.fan, srcK?.tingkat || '', srcK?.kls || '');
    const tgtFanShort = guru ? ambilNamaFanSingkat(fan, k.tingkat, k.kls) : '-';

    return (
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
          <div className="font-bold text-slate-800 truncate mt-0.5" title={`${stateClipboardKG.guru} (${srcFanShort})`}>
            Dari: <span className="text-amber-900">{stateClipboardKG.guru}</span> ({srcFanShort})
          </div>
          <div className="text-[11px] text-slate-600 mt-1 leading-tight">
            Ke: <b>{k.kls} {k.bag} {k.tingkat} ({k.papi}) • {hari} Jam {jam}</b>
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
            onClick={() => handleTempel('langsung_pindah')}
            className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 font-medium flex items-center gap-2.5 transition-colors"
          >
            <ArrowRightCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <div className="font-semibold">Langsung Pindah</div>
              <div className="text-[10px] text-slate-500 font-normal">Pindahkan Asatidz &amp; Fan ke slot kosong ini</div>
            </div>
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => handleTempel('tukar')}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 font-medium flex items-center gap-2.5 transition-colors"
            >
              <ArrowLeftRight className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <div className="font-semibold">1. Tukar Jadwal</div>
                <div className="text-[10px] text-slate-500 font-normal">Tukar posisi guru &amp; fan antar kedua slot</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleTempel('timpa')}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-50 text-slate-800 hover:text-rose-800 font-medium flex items-center gap-2.5 transition-colors"
            >
              <Replace className="w-4 h-4 text-rose-600 shrink-0" />
              <div>
                <div className="font-semibold">2. Timpa Jadwal</div>
                <div className="text-[10px] text-slate-500 font-normal">Hapus guru tujuan dan isi dengan guru ini</div>
              </div>
            </button>
          </>
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
          <span>Batalkan Mode Pindah</span>
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------
  // SKENARIO 2: MENU KLIK KANAN STANDAR
  // -------------------------------------------------------------
  const headerTitle = guru ? `${guru} (${kg || '-'})` : `[Slot Kosong] ${k.kls} ${k.bag}`;
  const subTitle = `${k.kls} ${k.bag} ${k.tingkat} • ${hari} Jam ${jam}`;

  return (
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
          <div className="text-[10px] text-emerald-700 font-semibold truncate mt-0.5">Fan: {fan}</div>
        )}
      </div>

      {guru && (
        <button
          type="button"
          onClick={() => {
            mulaiModePindahKG();
            closeContextMenuKG();
          }}
          className="w-full text-left px-3 py-2 rounded-lg hover:bg-amber-50 text-amber-900 font-medium flex items-center gap-2.5 transition-colors"
        >
          <Scissors className="w-4 h-4 text-amber-600" />
          <span>Pindah Ke (Cut)</span>
        </button>
      )}

      <button
        type="button"
        onClick={() => {
          closeContextMenuKG();
          openModalInputJadwal(kelasKey, jam as 1 | 2);
        }}
        className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 font-medium flex items-center gap-2.5 transition-colors"
      >
        <CalendarDays className="w-4 h-4 text-emerald-600" />
        <span>{guru ? 'Isi / Ganti Jadwal Kelas' : 'Isi Slot Ini'}</span>
      </button>

      {guru && (
        <>
          <button
            type="button"
            onClick={handleLihatProfil}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 text-slate-800 hover:text-blue-800 font-medium flex items-center gap-2.5 transition-colors"
          >
            <UserCheck className="w-4 h-4 text-blue-600" />
            <span>Lihat Profil Asatidz</span>
          </button>

          <button
            type="button"
            onClick={handleHapusSlot}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-50 text-rose-600 font-medium flex items-center gap-2.5 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span>Hapus Slot Ini</span>
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
  );
}
