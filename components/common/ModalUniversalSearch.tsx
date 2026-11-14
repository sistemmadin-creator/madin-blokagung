'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  Sparkles,
  GraduationCap,
  UserCheck,
  School,
  LayoutGrid,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { useSantriStore } from '@/stores/useSantriStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useSidebarConfigStore, DEFAULT_SIDEBAR_GROUPS } from '@/stores/useSidebarConfigStore';
import { cariMustahiqSantri, norm } from '@/lib/utils/setoranHelper';

interface ModalUniversalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModalUniversalSearch({
  isOpen,
  onClose,
}: ModalUniversalSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');

  const { santriList, fetchSantri } = useSantriStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();
  const { formasiList, fetchFormasi } = useFormasiStore();
  const { groups } = useSidebarConfigStore();

  useEffect(() => {
    if (isOpen) {
      if (!santriList || santriList.length === 0) fetchSantri();
      if (!asatidzList || asatidzList.length === 0) fetchAsatidz();
      if (!formasiList || formasiList.length === 0) fetchFormasi();
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setQuery('');
    }
  }, [isOpen, santriList, asatidzList, formasiList, fetchSantri, fetchAsatidz, fetchFormasi]);

  // Handle ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Daftar Kelas Universal
  const daftarKelasUniversal = useMemo(() => {
    const map = new Map<string, {
      label: string;
      tingkat: string;
      din_kls: string;
      din_bag: string;
      pa_pi: string;
      mustahiq: string;
      totalSantri: number;
    }>();

    (formasiList || []).forEach((f) => {
      const kls = String(f.din_kls || '1').trim();
      const bag = String(f.din_bag || 'A').trim().toUpperCase();
      const tk = String(f.tingkat || 'ULA').trim().toUpperCase();
      const papi = String(f.pa_pi || 'PA').trim().toUpperCase();
      const key = `${kls}_${bag}_${tk}_${papi}`;
      const label = `${kls} ${bag} ${tk}`;
      const mustahiqName = cariMustahiqSantri(tk, bag, kls, papi, asatidzList, formasiList);

      map.set(key, {
        label,
        tingkat: tk,
        din_kls: kls,
        din_bag: bag,
        pa_pi: papi,
        mustahiq: mustahiqName,
        totalSantri: (f as { jumlah_santri?: number }).jumlah_santri || 0,
      });
    });

    return Array.from(map.values());
  }, [formasiList, asatidzList]);

  // Daftar Modul & Sub-Menu dari Sidebar
  const activeGroups = groups && groups.length > 0 ? groups : DEFAULT_SIDEBAR_GROUPS;
  const searchableMenus = useMemo(() => {
    const items: Array<{
      title: string;
      href: string;
      groupTitle: string;
    }> = [];

    activeGroups.forEach((grp) => {
      if (grp.hidden) return;
      grp.items.forEach((item) => {
        if (item.hidden) return;
        if (item.href) {
          items.push({
            title: item.title,
            href: item.href,
            groupTitle: grp.group,
          });
        }
        if (item.children) {
          item.children.forEach((sub) => {
            if (sub.hidden) return;
            items.push({
              title: `${item.title} › ${sub.title}`,
              href: sub.href,
              groupTitle: grp.group,
            });
          });
        }
      });
    });

    return items;
  }, [activeGroups]);

  // Hasil Pencarian
  const searchResults = useMemo(() => {
    const q = norm(query);
    if (q.length < 2) {
      return { santri: [], asatidz: [], kelas: [], menus: [] };
    }

    const matchedSantri = (santriList || [])
      .filter((s) => {
        const nama = norm(s.nama || '');
        const noInduk = norm(s.no_induk || '');
        const kamar = norm(s.kamar || '');
        const kelas = norm(`${s.din_kls || ''} ${s.din_bag || ''} ${s.tingkat || ''}`);
        return nama.includes(q) || noInduk.includes(q) || kamar.includes(q) || kelas.includes(q);
      })
      .slice(0, 5);

    const matchedAsatidz = (asatidzList || [])
      .filter((a) => {
        const nama = norm(a.nama_asatidz || '');
        const nia = norm(a.kode_guru || '');
        const jabatan = norm(a.jah_asatidz || '');
        return nama.includes(q) || nia.includes(q) || jabatan.includes(q);
      })
      .slice(0, 5);

    const matchedKelas = daftarKelasUniversal
      .filter((c) => {
        const labelWithPapi = norm(`${c.label} ${c.pa_pi}`);
        const label = norm(c.label);
        const mustahiq = norm(c.mustahiq);
        const tingkat = norm(c.tingkat);
        return labelWithPapi.includes(q) || label.includes(q) || mustahiq.includes(q) || tingkat.includes(q);
      })
      .slice(0, 5);

    const matchedMenus = searchableMenus
      .filter((m) => {
        const title = norm(m.title);
        const grp = norm(m.groupTitle);
        return title.includes(q) || grp.includes(q);
      })
      .slice(0, 5);

    return {
      santri: matchedSantri,
      asatidz: matchedAsatidz,
      kelas: matchedKelas,
      menus: matchedMenus,
    };
  }, [query, santriList, asatidzList, daftarKelasUniversal, searchableMenus]);

  if (!isOpen) return null;

  const totalResults =
    searchResults.santri.length +
    searchResults.asatidz.length +
    searchResults.kelas.length +
    searchResults.menus.length;

  const navigateTo = (path: string) => {
    onClose();
    router.push(path);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pencarian Universal Madin Blokagung"
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 pt-12 sm:pt-20 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Search Header Bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center gap-3 bg-white">
          <Search className="w-5 h-5 text-emerald-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari santri, asatidz, kelas, atau modul..."
            data-testid="input-universal-omnisearch"
            className="flex-1 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition text-xs font-semibold"
          >
            Tutup (Esc)
          </button>
        </div>

        {/* Search Body */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-4 flex-1">
          {query.trim().length < 2 ? (
            <div className="py-8 text-center text-slate-400 space-y-2">
              <Sparkles className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
              <p className="text-xs font-medium">
                Ketik minimal 2 karakter untuk mencari Santri, Asatidz, Kelas, atau Modul.
              </p>
            </div>
          ) : totalResults === 0 ? (
            <div className="py-8 text-center text-slate-400 space-y-1">
              <p className="text-xs font-bold text-slate-700">Tidak ada hasil ditemukan</p>
              <p className="text-[11px]">
                Tidak ada entitas yang cocok dengan kata kunci &quot;{query}&quot;.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Hasil Santri */}
              {searchResults.santri.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wide">
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Santri ({searchResults.santri.length})</span>
                  </div>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden bg-slate-50/50">
                    {searchResults.santri.map((s) => (
                      <button
                        key={s.no_induk}
                        type="button"
                        onClick={() => navigateTo(`/santri?cari=${encodeURIComponent(s.nama)}`)}
                        className="w-full text-left p-2.5 hover:bg-emerald-50/60 transition flex items-center justify-between gap-2 cursor-pointer group"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-800 truncate">
                            {s.nama}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            NIS: {s.no_induk} • Kelas: {s.din_kls} {s.din_bag} {s.tingkat} ({s.pa_pi}) • Kamar: {s.kamar || '-'}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-700 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Hasil Asatidz */}
              {searchResults.asatidz.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800 uppercase tracking-wide">
                    <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                    <span>Asatidz ({searchResults.asatidz.length})</span>
                  </div>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden bg-slate-50/50">
                    {searchResults.asatidz.map((a) => (
                      <button
                        key={a.kode_guru || a.nama_asatidz}
                        type="button"
                        onClick={() => navigateTo(`/asatidz?cari=${encodeURIComponent(a.nama_asatidz)}`)}
                        className="w-full text-left p-2.5 hover:bg-teal-50/60 transition flex items-center justify-between gap-2 cursor-pointer group"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-teal-800 truncate">
                            {a.nama_asatidz}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            KG: {a.kode_guru || '-'} • Jabatan: {a.jah_asatidz || 'Dewan Pengajar'} • Kode: {a.kode || '-'}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-700 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Hasil Kelas */}
              {searchResults.kelas.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800 uppercase tracking-wide">
                    <School className="w-3.5 h-3.5 text-blue-600" />
                    <span>Kelas &amp; Rombel ({searchResults.kelas.length})</span>
                  </div>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden bg-slate-50/50">
                    {searchResults.kelas.map((k, idx) => (
                      <button
                        key={`${k.label}_${idx}`}
                        type="button"
                        onClick={() => navigateTo(`/jadwal-kbm`)}
                        className="w-full text-left p-2.5 hover:bg-blue-50/60 transition flex items-center justify-between gap-2 cursor-pointer group"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-blue-800 truncate">
                            Kelas {k.label} ({k.pa_pi})
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Wali Kelas: {k.mustahiq} • Total: {k.totalSantri} Santri
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-700 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Hasil Modul & Menu */}
              {searchResults.menus.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wide">
                    <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
                    <span>Modul &amp; Sub-Menu ({searchResults.menus.length})</span>
                  </div>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden bg-slate-50/50">
                    {searchResults.menus.map((m, idx) => (
                      <button
                        key={`${m.href}_${idx}`}
                        type="button"
                        onClick={() => navigateTo(m.href)}
                        className="w-full text-left p-2.5 hover:bg-slate-100 transition flex items-center justify-between gap-2 cursor-pointer group"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-800 truncate">
                            {m.title}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            Grup: {m.groupTitle}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-700 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
