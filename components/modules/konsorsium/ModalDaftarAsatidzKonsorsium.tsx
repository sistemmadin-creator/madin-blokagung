'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useKonsorsiumStore } from '@/stores/useKonsorsiumStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { KelasKonsorsium } from '@/types/konsorsium';
import { Asatidz } from '@/types/asatidz';
import {
  UserPlus,
  Search,
  CheckCircle2,
  X,
} from 'lucide-react';

interface ModalDaftarAsatidzKonsorsiumProps {
  isOpen: boolean;
  onClose: () => void;
  kelas: KelasKonsorsium | null;
}

function getAsatidzUniqueKey(a: Asatidz): string {
  return a.kode_guru || (a.id ? String(a.id) : a.nama_asatidz);
}

export default function ModalDaftarAsatidzKonsorsium({
  isOpen,
  onClose,
  kelas,
}: ModalDaftarAsatidzKonsorsiumProps) {
  const { asatidzList, fetchAsatidz } = useAsatidzStore();
  const { anggotaList, daftarkanAsatidzKeKelas } = useKonsorsiumStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterGender, setFilterGender] = useState<'ALL' | 'L' | 'P'>('ALL');

  useEffect(() => {
    if (isOpen) {
      if (asatidzList.length === 0) void fetchAsatidz();
    }
  }, [isOpen, asatidzList.length, fetchAsatidz]);

  useEffect(() => {
    if (isOpen) {
      setSelectedKeys([]);
      setSearchQuery('');
      setFilterGender('ALL');
    }
  }, [isOpen, kelas?.id]);

  // Set identifier asatidz yang sudah terdaftar di kelas konsorsium ini
  const enrolledKeySet = useMemo(() => {
    if (!kelas) return new Set<string>();
    const set = new Set<string>();
    anggotaList
      .filter((a) => a.kelasId === kelas.id)
      .forEach((a) => {
        if (a.nia && a.nia !== '-') set.add(a.nia);
        if (a.asatidzId) set.add(String(a.asatidzId));
        if (a.nama) set.add(a.nama);
      });
    return set;
  }, [anggotaList, kelas]);

  const enrolledCount = useMemo(() => {
    if (!kelas) return 0;
    return anggotaList.filter((a) => a.kelasId === kelas.id).length;
  }, [anggotaList, kelas]);

  const isAsatidzEnrolled = (a: Asatidz) => {
    if (a.kode_guru && enrolledKeySet.has(a.kode_guru)) return true;
    if (a.id && enrolledKeySet.has(String(a.id))) return true;
    return false;
  };

  // Filter daftar asatidz
  const filteredAsatidz = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return asatidzList.filter((a) => {
      const matchSearch =
        !q ||
        a.nama_asatidz?.toLowerCase().includes(q) ||
        a.kode_guru?.toLowerCase().includes(q);

      const matchGender =
        filterGender === 'ALL' ||
        (filterGender === 'L' && a.pa_pi === 'PA') ||
        (filterGender === 'P' && a.pa_pi === 'PI');

      return matchSearch && matchGender;
    });
  }, [asatidzList, searchQuery, filterGender]);

  // Asatidz yang belum terdaftar di kelas ini
  const eligibleAsatidz = useMemo(() => {
    return filteredAsatidz.filter((a) => !isAsatidzEnrolled(a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredAsatidz, enrolledKeySet]);

  const toggleSelectKey = (a: Asatidz) => {
    if (isAsatidzEnrolled(a)) return;
    const key = getAsatidzUniqueKey(a);
    if (!key) return;
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSelectAllEligible = () => {
    const keys = eligibleAsatidz.map((a) => getAsatidzUniqueKey(a)).filter(Boolean);
    setSelectedKeys(keys);
  };

  const handleDeselectAll = () => {
    setSelectedKeys([]);
  };

  const handleSubmit = async () => {
    if (!kelas || selectedKeys.length === 0) return;

    setIsSubmitting(true);
    try {
      const selectedAsatidzData = asatidzList
        .filter((a) => selectedKeys.includes(getAsatidzUniqueKey(a)))
        .map((a) => ({
          nia: a.kode_guru || '-',
          nama: a.nama_asatidz,
          gender: a.pa_pi,
          asatidzId: a.id ? String(a.id) : undefined,
        }));

      await daftarkanAsatidzKeKelas(kelas.id, selectedAsatidzData);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!kelas) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Daftarkan Asatidz ke Kelas: ${kelas.namaKelas}`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Banner Info Kelas Target */}
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-semibold text-emerald-900 text-sm">
              {kelas.namaKelas}
            </span>
            <span className="mx-2 text-emerald-300">|</span>
            <span className="text-emerald-700">Tingkat {kelas.tingkat}</span>
            <span className="mx-2 text-emerald-300">|</span>
            <span className="text-emerald-700">Pembimbing: {kelas.pembimbingNama}</span>
          </div>
          <div className="text-emerald-800 font-medium bg-emerald-100/70 px-2.5 py-1 rounded-md">
            Saat ini terdaftar: <strong className="font-bold">{enrolledCount}</strong> Asatidz
          </div>
        </div>

        {/* Toolbar Pencarian & Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama asatidz atau kode NIA..."
              className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Bersihkan pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Gender */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setFilterGender('ALL')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterGender === 'ALL'
                  ? 'bg-white font-semibold text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setFilterGender('L')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterGender === 'L'
                  ? 'bg-white font-semibold text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Putra
            </button>
            <button
              type="button"
              onClick={() => setFilterGender('P')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterGender === 'P'
                  ? 'bg-white font-semibold text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Putri
            </button>
          </div>
        </div>

        {/* Quick Select Actions */}
        <div className="flex items-center justify-between text-xs text-slate-600 px-1">
          <div>
            Terpilih:{' '}
            <strong className="text-emerald-700 font-bold">
              {selectedKeys.length}
            </strong>{' '}
            asatidz
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAllEligible}
              className="text-emerald-700 hover:text-emerald-800 hover:underline font-medium"
            >
              Pilih Semua Yang Belum ({eligibleAsatidz.length})
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="text-slate-500 hover:text-slate-700 hover:underline"
            >
              Batal Pilih
            </button>
          </div>
        </div>

        {/* Daftar Asatidz dengan Checkbox */}
        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto divide-y divide-slate-100 bg-white">
          {filteredAsatidz.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Tidak ada data asatidz yang sesuai pencarian.
            </div>
          ) : (
            filteredAsatidz.map((a, idx) => {
              const uniqueKey = getAsatidzUniqueKey(a);
              const isEnrolled = isAsatidzEnrolled(a);
              const isSelected = selectedKeys.includes(uniqueKey);

              return (
                <div
                  key={a.id || a.kode_guru || idx}
                  onClick={() => toggleSelectKey(a)}
                  className={`px-4 py-2.5 flex items-center justify-between transition-colors ${
                    isEnrolled
                      ? 'bg-slate-50 opacity-60 cursor-not-allowed'
                      : isSelected
                      ? 'bg-emerald-50/80 cursor-pointer'
                      : 'hover:bg-slate-50/80 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isEnrolled || isSelected}
                      disabled={isEnrolled}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleSelectKey(a)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 disabled:opacity-50 cursor-pointer"
                    />
                    <div>
                      <div className="text-sm font-medium text-slate-800 flex items-center gap-2">
                        <span>{a.nama_asatidz}</span>
                        {a.pa_pi && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">
                            {a.pa_pi}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        KG: {a.kode_guru || '-'}
                      </div>
                    </div>
                  </div>

                  <div>
                    {isEnrolled ? (
                      <span className="text-[11px] font-medium text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
                        Sudah Terdaftar
                      </span>
                    ) : isSelected ? (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Akan Didaftarkan
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">Klik untuk memilih</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || selectedKeys.length === 0}
            className="px-5 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>
              {isSubmitting
                ? 'Mendaftarkan...'
                : `Daftarkan ${selectedKeys.length} Asatidz`}
            </span>
          </button>
        </div>
      </div>
    </Dialog>
  );
}
