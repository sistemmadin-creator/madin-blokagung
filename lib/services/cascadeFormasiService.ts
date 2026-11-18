/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase/client';
import { FormasiKelas } from '@/types/formasi';
import { TeacherJadwalRow } from '@/types/jadwal';
import { useJadwalStore } from '@/stores/useJadwalStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { DeleteHistoryMode, DeleteImpactAnalysis } from '@/lib/services/relationDeleteTypes';

export interface CascadeFormasiSnapshot {
  historyMode: DeleteHistoryMode;
  deletedSlotsRows: any[];
  jadwalMapBefore: Record<string, TeacherJadwalRow> | null;
}

function buildClassIdentityKey(tingkat?: string, dinKls?: string, dinBag?: string, paPi?: string) {
  return [
    String(tingkat || '').trim().toUpperCase(),
    String(dinKls || '').trim().toUpperCase(),
    String(dinBag || '').trim().toUpperCase(),
    String(paPi || '').trim().toUpperCase(),
  ].join('|');
}

function parseJadwalSlotClass(rawSlot: string, defaultPaPi?: string): string {
  const clean = String(rawSlot || '').trim().toUpperCase();
  if (!clean) return '';
  return clean.replace(/\s+/g, ' ') + (defaultPaPi ? `|${defaultPaPi.toUpperCase()}` : '');
}

export const CascadeFormasiService = {
  async analyzeDeleteImpact(formasiToDelete: FormasiKelas[]): Promise<DeleteImpactAnalysis> {
    const items = formasiToDelete.map((f) => ({
      code: `${f.din_kls || ''}${f.din_bag || ''} ${f.pa_pi || ''}`.trim() || '-',
      name: `${f.tingkat || ''} ${f.din_kls || ''}${f.din_bag || ''}`.trim() || 'Formasi Kelas',
      meta: [f.lokasi_diniyyah || f.lokasi_takror, f.id_mustahiq ? `Mustahiq: ${f.id_mustahiq}` : '']
        .filter(Boolean)
        .join(' • '),
    }));

    const keySet = new Set(
      formasiToDelete.map((f) => buildClassIdentityKey(f.tingkat, f.din_kls, f.din_bag, f.pa_pi))
    );

    const [santriRes, slotsRes] = await Promise.allSettled([
      supabase.from('santri').select('no_induk, tingkat, din_kls, din_bag, pa_pi'),
      supabase.from('jadwal_kbm_slots' as any).select('id, tingkat, din_kls, din_bag, pa_pi'),
    ]);

    const santriRows = santriRes.status === 'fulfilled' ? santriRes.value.data || [] : [];
    const enrolledSantriCount = santriRows.filter((s: any) =>
      keySet.has(buildClassIdentityKey(s.tingkat, s.din_kls, s.din_bag, s.pa_pi))
    ).length;

    const slotRows = slotsRes.status === 'fulfilled' ? slotsRes.value.data || [] : [];
    const matchedSlotCount = slotRows.filter((sl: any) =>
      keySet.has(buildClassIdentityKey(sl.tingkat, sl.din_kls, sl.din_bag, sl.pa_pi))
    ).length;

    const mustahiqAssignedCount = formasiToDelete.filter(
      (f) => Boolean(String(f.id_mustahiq || '').trim())
    ).length;

    const impacts: string[] = [];
    const activeWarnings: string[] = [];

    if (enrolledSantriCount > 0) {
      impacts.push(
        `${enrolledSantriCount} santri tercatat menempati kelas ini (data biodata santri tetap aman).`
      );
      activeWarnings.push(`Masih terdapat ${enrolledSantriCount} santri terdaftar di kelas ini.`);
    }

    if (mustahiqAssignedCount > 0) {
      impacts.push(`Penugasan Mustahiq/Wali pada ${mustahiqAssignedCount} kelas akan terlepas.`);
    }

    if (matchedSlotCount > 0) {
      impacts.push(`Terhubung ke ${matchedSlotCount} slot Jadwal Mengajar KBM Asatidz.`);
      activeWarnings.push(`Memiliki ${matchedSlotCount} slot Jadwal KBM Asatidz aktif.`);
    }

    return {
      items,
      impacts,
      activeWarnings,
      activeWarningTitle: 'Terdeteksi Rombel Berpenghuni & Jadwal KBM Aktif',
      activeRiskCheckboxLabel:
        'Saya mengerti risikonya dan tetap ingin menghapus formasi kelas terpilih di atas.',
      safeArchiveNote:
        'Menghapus formasi kelas tidak akan menghapus data master santri ataupun data master asatidz.',
      hasHistoricalRecords: matchedSlotCount > 0,
    };
  },

  async cascadeDeleteFormasi(
    formasiToDelete: FormasiKelas[],
    options?: { historyMode?: DeleteHistoryMode }
  ): Promise<CascadeFormasiSnapshot | null> {
    const historyMode: DeleteHistoryMode = options?.historyMode || 'keep_history';
    if (!formasiToDelete || formasiToDelete.length === 0 || historyMode === 'keep_history') {
      return {
        historyMode,
        deletedSlotsRows: [],
        jadwalMapBefore: null,
      };
    }

    const keySet = new Set(
      formasiToDelete.map((f) => buildClassIdentityKey(f.tingkat, f.din_kls, f.din_bag, f.pa_pi))
    );
    const shortLabels = new Set(
      formasiToDelete.map(
        (f) => `${String(f.din_kls || '').trim().toUpperCase()}${String(f.din_bag || '').trim().toUpperCase()} ${String(f.tingkat || '').trim().toUpperCase()}|${String(f.pa_pi || '').trim().toUpperCase()}`
      )
    );

    try {
      const [slotsRes, settingsRes] = await Promise.all([
        supabase.from('jadwal_kbm_slots' as any).select('*'),
        supabase.from('app_settings').select('value').eq('key', 'JADWAL_MENGAJAR_ASATIDZ').maybeSingle(),
      ]);

      const deletedSlotsRows = (slotsRes.data || []).filter((sl: any) =>
        keySet.has(buildClassIdentityKey(sl.tingkat, sl.din_kls, sl.din_bag, sl.pa_pi))
      );

      if (deletedSlotsRows.length > 0) {
        const ids = deletedSlotsRows.map((s: any) => s.id).filter(Boolean);
        for (let i = 0; i < ids.length; i += 100) {
          await supabase
            .from('jadwal_kbm_slots' as any)
            .delete()
            .in('id', ids.slice(i, i + 100));
        }
      }

      let jadwalMapBefore: Record<string, TeacherJadwalRow> | null = null;
      const rawJadwal = settingsRes.data?.value;
      if (rawJadwal) {
        const parsed: Record<string, TeacherJadwalRow> =
          typeof rawJadwal === 'string'
            ? (JSON.parse(rawJadwal) as Record<string, TeacherJadwalRow>)
            : (rawJadwal as Record<string, TeacherJadwalRow>);
        jadwalMapBefore = { ...parsed };
        let mapChanged = false;
        const nextMap: Record<string, TeacherJadwalRow> = {};
        const days: Array<keyof TeacherJadwalRow> = ['sabtu', 'ahad', 'senin', 'selasa', 'rabu', 'kamis'];

        Object.entries(parsed).forEach(([k, row]) => {
          const nextRow: any = { ...(row as TeacherJadwalRow) };
          days.forEach((d) => {
            const arr = nextRow[d];
            if (Array.isArray(arr)) {
              nextRow[d] = arr.map((slotVal: string) => {
                const token = parseJadwalSlotClass(slotVal, nextRow.pa_pi);
                if (token && shortLabels.has(token)) {
                  mapChanged = true;
                  return '';
                }
                return slotVal;
              });
            }
          });
          nextMap[k] = nextRow;
        });

        if (mapChanged) {
          await supabase
            .from('app_settings')
            .upsert({ key: 'JADWAL_MENGAJAR_ASATIDZ', value: JSON.stringify(nextMap) });
          useJadwalStore.setState({ jadwalMap: nextMap });
        } else {
          jadwalMapBefore = null;
        }
      }

      if (deletedSlotsRows.length > 0 || jadwalMapBefore) {
        await useJadwalStore.getState().fetchJadwal();
        useJadwalStore
          .getState()
          .rebuildMasterStrukturKelas(
            useFormasiStore.getState().formasiList,
            useAsatidzStore.getState().asatidzList
          );
      }

      return {
        historyMode,
        deletedSlotsRows,
        jadwalMapBefore,
      };
    } catch (err: any) {
      console.error('[CascadeFormasiService] Error cascading delete:', err.message);
      return null;
    }
  },

  async restoreSnapshot(snapshot: CascadeFormasiSnapshot): Promise<boolean> {
    try {
      if (snapshot.deletedSlotsRows.length > 0) {
        await supabase
          .from('jadwal_kbm_slots' as any)
          .upsert(snapshot.deletedSlotsRows, { onConflict: 'id' });
      }
      if (snapshot.jadwalMapBefore) {
        await supabase
          .from('app_settings')
          .upsert({
            key: 'JADWAL_MENGAJAR_ASATIDZ',
            value: JSON.stringify(snapshot.jadwalMapBefore),
          });
        useJadwalStore.setState({ jadwalMap: snapshot.jadwalMapBefore });
      }
      if (snapshot.deletedSlotsRows.length > 0 || snapshot.jadwalMapBefore) {
        await useJadwalStore.getState().fetchJadwal();
      }
      return true;
    } catch (err: any) {
      console.error('[CascadeFormasiService] Restore snapshot error:', err.message);
      return false;
    }
  },
};
