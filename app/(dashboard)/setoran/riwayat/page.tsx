'use client';

import React, { useEffect } from 'react';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import { useSantriStore } from '@/stores/useSantriStore';
import { usePagePermission } from '@/stores/useRbacStore';
import TabelRiwayatHafalanView from '@/components/modules/setoran/TabelRiwayatHafalanView';

export default function SetoranRiwayatPage() {
  const { setoranList, fetchSetoranData, deleteSetoran, bulkDeleteSetoran } =
    useMuhafadzohStore();
  const { santriList, fetchSantri } = useSantriStore();
  const { canDelete, isPersonAllowed } = usePagePermission('setoran');

  useEffect(() => {
    if (setoranList.length === 0) fetchSetoranData();
    if (santriList.length === 0) fetchSantri();
  }, [fetchSetoranData, fetchSantri, setoranList.length, santriList.length]);

  return (
    <TabelRiwayatHafalanView
      setoranList={setoranList}
      santriList={santriList}
      canDelete={canDelete}
      isPersonAllowed={isPersonAllowed}
      onDeleteSetoran={(key) => deleteSetoran(key)}
      onBulkDeleteSetoran={(noIndukList) => bulkDeleteSetoran(noIndukList)}
    />
  );
}
