'use client';

import React, { useEffect, useMemo } from 'react';
import { Check, Settings2 } from 'lucide-react';
import {
  PARENT_TOPICS_WITH_SUB,
  ParentTopicWithSub,
  TOPIK_BERITA_MAP,
  TOPIK_BERITA_ORDER,
  TopikBerita,
} from '@/types/berita';
import { useMediaKategoriStore } from '@/stores/useMediaKategoriStore';

interface MediaKategoriMultiSelectorProps {
  labelText: string;
  helperText?: string;
  selectedTopics: TopikBerita[];
  selectedSubTopics: string[];
  onChangeTopics: (nextTopics: TopikBerita[]) => void;
  onChangeSubTopics: (nextSubTopics: string[]) => void;
  showDescriptions?: boolean;
}

export default function MediaKategoriMultiSelector({
  labelText,
  helperText,
  selectedTopics,
  selectedSubTopics,
  onChangeTopics,
  onChangeSubTopics,
  showDescriptions = false,
}: MediaKategoriMultiSelectorProps) {
  const { subKategoriList, fetchSubKategori, openManagerModal } = useMediaKategoriStore();

  useEffect(() => {
    fetchSubKategori();
  }, [fetchSubKategori]);

  const activeSubsByParent = useMemo(() => {
    const grouped: Record<ParentTopicWithSub, typeof subKategoriList> = {
      kegiatan: [],
      event: [],
      acara: [],
    };
    subKategoriList
      .filter((s) => s.is_active !== false)
      .sort((a, b) => a.sort_order - b.sort_order)
      .forEach((s) => {
        grouped[s.parent_topic]?.push(s);
      });
    return grouped;
  }, [subKategoriList]);

  const handleToggleParent = (topic: TopikBerita) => {
    const isCurrentlySelected = selectedTopics.includes(topic);
    if (isCurrentlySelected) {
      if (selectedTopics.length === 1) return; // Minimal 1 kategori induk terpilih
      onChangeTopics(selectedTopics.filter((t) => t !== topic));

      // Jika kategori induk bertipe parent (Kegiatan/Event/Acara) dilepas, bersihkan sub-nya
      if (topic === 'kegiatan' || topic === 'event' || topic === 'acara') {
        const childIds = new Set(activeSubsByParent[topic].map((s) => s.id));
        onChangeSubTopics(selectedSubTopics.filter((id) => !childIds.has(id)));
      }
    } else {
      onChangeTopics([...selectedTopics, topic]);
    }
  };

  const handleToggleSubTopic = (subId: string, parentTopic: ParentTopicWithSub) => {
    const exists = selectedSubTopics.includes(subId);
    if (exists) {
      onChangeSubTopics(selectedSubTopics.filter((id) => id !== subId));
    } else {
      onChangeSubTopics([...selectedSubTopics, subId]);
      // Sinkronisasi otomatis: memilih sub-kategori (mis. UUB) otomatis mencentang induk (Kegiatan)
      if (!selectedTopics.includes(parentTopic)) {
        onChangeTopics([...selectedTopics, parentTopic]);
      }
    }
  };

  const summaryText = useMemo(() => {
    const subMap = new Map(subKategoriList.map((s) => [s.id, s]));
    const parts = selectedTopics.map((topic) => {
      const base = TOPIK_BERITA_MAP[topic]?.shortTitle || topic;
      if (topic === 'kegiatan' || topic === 'event' || topic === 'acara') {
        const childNames = selectedSubTopics
          .map((id) => subMap.get(id))
          .filter((s): s is NonNullable<typeof s> => Boolean(s && s.parent_topic === topic))
          .map((s) => s.nama);
        if (childNames.length > 0) {
          return `${base} (${childNames.join(', ')})`;
        }
      }
      return base;
    });
    return parts.join(', ') || 'Belum ada';
  }, [selectedTopics, selectedSubTopics, subKategoriList]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          {labelText} <span className="text-rose-500">*</span>
        </label>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            Terpilih: {summaryText}
          </span>
          <button
            type="button"
            onClick={openManagerModal}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Atur Sub-Kategori</span>
          </button>
        </div>
      </div>

      {helperText && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">{helperText}</p>
      )}

      {/* 8 Kartu Kategori Utama */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {TOPIK_BERITA_ORDER.map((key) => {
          const item = TOPIK_BERITA_MAP[key];
          const isSelected = selectedTopics.includes(key);
          const subCount =
            key === 'kegiatan' || key === 'event' || key === 'acara'
              ? activeSubsByParent[key].length
              : 0;

          return (
            <button
              key={key}
              type="button"
              aria-pressed={isSelected}
              onClick={() => handleToggleParent(key)}
              className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? `${item.lightBg} ${item.borderColor} ring-2 ring-emerald-600 shadow-2xs`
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${item.badgeBg} ${item.badgeText}`}
                  >
                    {item.shortTitle}
                  </span>
                  <span
                    className={`w-4 h-4 rounded flex items-center justify-center border ${
                      isSelected
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {item.title}
                </p>
                {showDescriptions && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {item.description}
                  </p>
                )}
                {subCount > 0 && (
                  <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
                    {subCount} Sub-kategori
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Panel Sub-Kategori Terkelompok (Kegiatan, Event, Acara) dengan Sinkronisasi Otomatis */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/40 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Sub-Kategori Kegiatan, Event &amp; Acara (Multi-Pilih)
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            Memilih sub-kategori otomatis mencentang kategori induknya
          </span>
        </div>

        <div className="space-y-2.5">
          {PARENT_TOPICS_WITH_SUB.map((parentKey) => {
            const pMeta = TOPIK_BERITA_MAP[parentKey];
            const subs = activeSubsByParent[parentKey];
            return (
              <div key={parentKey} className="flex flex-col sm:flex-row sm:items-start gap-2">
                <span
                  className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider w-24 shrink-0 ${pMeta.badgeBg} ${pMeta.badgeText}`}
                >
                  {pMeta.title}
                </span>

                <div className="flex flex-wrap items-center gap-1.5 flex-1">
                  {subs.length === 0 ? (
                    <span className="text-[11px] text-slate-400 italic">
                      Belum ada sub-kategori
                    </span>
                  ) : (
                    subs.map((sub) => {
                      const active = selectedSubTopics.includes(sub.id);
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => handleToggleSubTopic(sub.id, parentKey)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                            active
                              ? 'bg-[#0b5751] text-white border-[#0b5751] shadow-2xs'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                          }`}
                        >
                          {active && <Check className="w-3 h-3 stroke-[3]" />}
                          <span>{sub.nama}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
