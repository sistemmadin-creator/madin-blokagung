'use client';

import React from 'react';
import { useMediaKategoriStore } from '@/stores/useMediaKategoriStore';

interface SubKategoriBadgeListProps {
  subTopicIds?: string[];
  badgeClassName?: string;
}

export default function SubKategoriBadgeList({
  subTopicIds,
  badgeClassName = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600',
}: SubKategoriBadgeListProps) {
  const subKategoriList = useMediaKategoriStore((s) => s.subKategoriList);

  if (!Array.isArray(subTopicIds) || subTopicIds.length === 0) return null;

  const subMap = new Map(subKategoriList.map((s) => [s.id, s]));
  const resolved = subTopicIds
    .map((id) => subMap.get(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (resolved.length === 0) return null;

  return (
    <>
      {resolved.map((sub) => (
        <span key={sub.id} className={badgeClassName}>
          {sub.nama}
        </span>
      ))}
    </>
  );
}
