'use client';

import React, { useEffect, useMemo } from 'react';
import {
  TopikBerita,
  TOPIK_BERITA_MAP,
  isParentTopicWithSub,
} from '@/types/berita';
import { useMediaKategoriStore } from '@/stores/useMediaKategoriStore';

interface SubKategoriFilterBarProps {
  activeTopic: TopikBerita | 'all';
  selectedSubTopic: string | 'all';
  onSelectSubTopic: (subId: string | 'all') => void;
  getCount?: (subId: string) => number;
  variant?: 'pill' | 'rounded';
}

export default function SubKategoriFilterBar({
  activeTopic,
  selectedSubTopic,
  onSelectSubTopic,
  getCount,
  variant = 'rounded',
}: SubKategoriFilterBarProps) {
  const { subKategoriList, fetchSubKategori } = useMediaKategoriStore();

  useEffect(() => {
    fetchSubKategori();
  }, [fetchSubKategori]);

  const subs = useMemo(() => {
    if (!isParentTopicWithSub(activeTopic)) return [];
    return subKategoriList
      .filter((s) => s.is_active !== false && s.parent_topic === activeTopic)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [subKategoriList, activeTopic]);

  if (!isParentTopicWithSub(activeTopic) || subs.length === 0) {
    return null;
  }

  const parentMeta = TOPIK_BERITA_MAP[activeTopic];
  const radiusClass = variant === 'pill' ? 'rounded-full' : 'rounded-xl';

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pt-1.5 pb-0.5 border-t border-slate-100 dark:border-slate-800/80">
      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap mr-1">
        Sub-{parentMeta.title}:
      </span>

      <button
        type="button"
        onClick={() => onSelectSubTopic('all')}
        className={`px-3 py-1 ${radiusClass} text-xs font-bold transition whitespace-nowrap cursor-pointer ${
          selectedSubTopic === 'all'
            ? `${parentMeta.badgeBg} ${parentMeta.badgeText}`
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
        }`}
      >
        Semua {parentMeta.title}
      </button>

      {subs.map((sub) => {
        const isSelected = selectedSubTopic === sub.id;
        const count = getCount ? getCount(sub.id) : undefined;
        return (
          <button
            key={sub.id}
            type="button"
            onClick={() => onSelectSubTopic(sub.id)}
            className={`px-3 py-1 ${radiusClass} text-xs font-semibold transition whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer border ${
              isSelected
                ? 'bg-[#0b5751] text-white border-[#0b5751] shadow-2xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-emerald-500'
            }`}
          >
            <span>{sub.nama}</span>
            {typeof count === 'number' && (
              <span className="text-[10px] opacity-80 px-1.5 py-0.2 rounded-full bg-black/10">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
