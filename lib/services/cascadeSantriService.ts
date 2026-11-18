/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase/client';
import { Santri } from '@/types/santri';
import {
  useMuhafadzohStore,
  KEY_DB_RIWAYAT_MUHAFADZOH,
  LS_RIWAYAT_MUHAFADZOH,
} from '@/stores/useMuhafadzohStore';
import {
  useSetorMustahiqStore,
  KEY_DB_SETOR_MUSTAHIQ_LOGS,
  KEY_DB_SETOR_MUSTAHIQ_STATES,
  LS_SETOR_MUSTAHIQ_LOGS,
  LS_SETOR_MUSTAHIQ_STATES,
} from '@/stores/useSetorMustahiqStore';
import {
  DeleteHistoryMode,
  DeleteImpactAnalysis,
  appendDeletedTag,
} from '@/lib/services/relationDeleteTypes';

export interface CascadeSantriSnapshot {
  historyMode: DeleteHistoryMode;
  setoranRowsBefore: any[];
  piagamRowsBefore: any[];
  rawRiwayatBefore: any[] | null;
  rawMustahiqLogsBefore: any[] | null;
  rawMustahiqStatesBefore: Record<string, any> | null;
}

function parseJsonSafe<T>(raw: any, fallback: T): T {
  if (!raw) return fallback;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
  return raw as T;
}

export const CascadeSantriService = {
  async analyzeDeleteImpact(santriToDelete: Santri[]): Promise<DeleteImpactAnalysis> {
    const items = santriToDelete.map((s) => {
      const kelas = [s.din_kls, s.din_bag, s.tingkat].filter(Boolean).join(' ').trim();
      return {
        code: s.no_induk || '-',
        name: s.nama || '-',
        meta: [kelas, s.pa_pi === 'PI' ? 'Putri (PI)' : 'Putra (PA)'].filter(Boolean).join(' • '),
      };
    });

    const nisSet = new Set(santriToDelete.map((s) => String(s.no_induk || '').trim()).filter(Boolean));
    const nisArr = Array.from(nisSet);

    const [setoranRes, piagamRes, settingsRes] = await Promise.allSettled([
      nisArr.length > 0
        ? supabase.from('setoran_hafalan_records' as any).select('id, no_induk').in('no_induk', nisArr)
        : Promise.resolve({ data: [] }),
      nisArr.length > 0
        ? supabase.from('serah_piagam').select('id, no_induk, is_menerima, tahun').in('no_induk', nisArr)
        : Promise.resolve({ data: [] }),
      supabase
        .from('app_settings')
        .select('key, value')
        .in('key', [
          KEY_DB_RIWAYAT_MUHAFADZOH,
          KEY_DB_SETOR_MUSTAHIQ_LOGS,
          KEY_DB_SETOR_MUSTAHIQ_STATES,
        ]),
    ]);

    const settingsData = settingsRes.status === 'fulfilled' ? settingsRes.value.data || [] : [];
    const rawRiwayat = parseJsonSafe<any[]>(
      settingsData.find((r: any) => r.key === KEY_DB_RIWAYAT_MUHAFADZOH)?.value,
      []
    );
    const rawMustahiqLogs = parseJsonSafe<any[]>(
      settingsData.find((r: any) => r.key === KEY_DB_SETOR_MUSTAHIQ_LOGS)?.value,
      []
    );
    const rawMustahiqStates = parseJsonSafe<Record<string, any>>(
      settingsData.find((r: any) => r.key === KEY_DB_SETOR_MUSTAHIQ_STATES)?.value,
      {}
    );

    const relSetoranCount =
      setoranRes.status === 'fulfilled' ? (setoranRes.value.data || []).length : 0;
    const legacySetoranCount = Array.isArray(rawRiwayat)
      ? rawRiwayat.filter((r) => nisSet.has(String(r?.no_induk || '').trim())).length
      : 0;
    const totalSetoranCount = Math.max(relSetoranCount, legacySetoranCount);

    const piagamRows = piagamRes.status === 'fulfilled' ? piagamRes.value.data || [] : [];
    const piagamCount = piagamRows.length;
    const piagamReceivedCount = piagamRows.filter((p: any) => p.is_menerima).length;

    const mustahiqLogsCount = Array.isArray(rawMustahiqLogs)
      ? rawMustahiqLogs.filter((l) => nisSet.has(String(l?.no_induk || '').trim())).length
      : 0;
    const activeMustahiqStateCount = nisArr.filter((nis) => Boolean(rawMustahiqStates?.[nis])).length;

    const enrolledSantriCount = santriToDelete.filter(
      (s) => Boolean(String(s.tingkat || '').trim() && String(s.din_kls || '').trim())
    ).length;

    const impacts: string[] = [];
    const activeWarnings: string[] = [];

    if (enrolledSantriCount > 0) {
      impacts.push(`${enrolledSantriCount} santri tercatat menempati kelas aktif pada Formasi Kelas.`);
    }
    if (totalSetoranCount > 0) {
      impacts.push(`Terhubung ke ${totalSetoranCount} riwayat setoran hafalan (Muhafadzoh).`);
    }
    if (mustahiqLogsCount > 0 || activeMustahiqStateCount > 0) {
      impacts.push(
        `Terhubung ke ${mustahiqLogsCount} log Setor Mustahiq (${activeMustahiqStateCount} progres aktif akan dilepas).`
      );
      if (activeMustahiqStateCount > 0) {
        activeWarnings.push(
          `Memiliki ${activeMustahiqStateCount} progres hafalan aktif pada modul Setor Mustahiq.`
        );
      }
    }
    if (piagamCount > 0) {
      impacts.push(
        `Tercatat pada ${piagamCount} data Serah Piagam (${piagamReceivedCount} status sudah menerima).`
      );
      if (piagamReceivedCount > 0) {
        activeWarnings.push(
          `Sudah tercatat menerima ${piagamReceivedCount} piagam penghargaan resmi (Serah Piagam).`
        );
      }
    }
    if (enrolledSantriCount > 0 && activeWarnings.length === 0) {
      activeWarnings.push(
        `${enrolledSantriCount} santri berstatus aktif berada di dalam rombongan belajar kelas saat ini.`
      );
    }

    return {
      items,
      impacts,
      activeWarnings,
      activeWarningTitle: 'Terdeteksi Data Akademik & Hafalan Terkait',
      activeRiskCheckboxLabel:
        'Saya mengerti risikonya dan tetap ingin memaksa penghapusan data santri ini.',
      safeArchiveNote:
        'Arsip ujian Ebtadin (ebtadin_santri) tahun ajaran sebelumnya tetap dipertahankan aman.',
      hasHistoricalRecords:
        totalSetoranCount > 0 || piagamCount > 0 || mustahiqLogsCount > 0,
    };
  },

  async cascadeDeleteSantri(
    santriToDelete: Santri[],
    options?: { historyMode?: DeleteHistoryMode }
  ): Promise<CascadeSantriSnapshot | null> {
    if (!santriToDelete || santriToDelete.length === 0) return null;

    const historyMode: DeleteHistoryMode = options?.historyMode || 'keep_history';
    const nisSet = new Set(santriToDelete.map((s) => String(s.no_induk || '').trim()).filter(Boolean));
    const nisArr = Array.from(nisSet);
    if (nisArr.length === 0) return null;

    try {
      const [setoranRes, piagamRes, settingsRes] = await Promise.all([
        supabase.from('setoran_hafalan_records' as any).select('*').in('no_induk', nisArr),
        supabase.from('serah_piagam').select('*').in('no_induk', nisArr),
        supabase
          .from('app_settings')
          .select('key, value')
          .in('key', [
            KEY_DB_RIWAYAT_MUHAFADZOH,
            KEY_DB_SETOR_MUSTAHIQ_LOGS,
            KEY_DB_SETOR_MUSTAHIQ_STATES,
          ]),
      ]);

      const setoranRowsBefore = setoranRes.data || [];
      const piagamRowsBefore = piagamRes.data || [];
      const settingsData = settingsRes.data || [];

      const rawRiwayatVal = settingsData.find((r) => r.key === KEY_DB_RIWAYAT_MUHAFADZOH)?.value;
      const rawLogsVal = settingsData.find((r) => r.key === KEY_DB_SETOR_MUSTAHIQ_LOGS)?.value;
      const rawStatesVal = settingsData.find((r) => r.key === KEY_DB_SETOR_MUSTAHIQ_STATES)?.value;

      const rawRiwayatBefore = rawRiwayatVal ? parseJsonSafe<any[]>(rawRiwayatVal, []) : null;
      const rawMustahiqLogsBefore = rawLogsVal ? parseJsonSafe<any[]>(rawLogsVal, []) : null;
      const rawMustahiqStatesBefore = rawStatesVal
        ? parseJsonSafe<Record<string, any>>(rawStatesVal, {})
        : null;

      // 1. Selalu bersihkan active state setor mustahiq santri yang dihapus
      let statesChanged = false;
      if (rawMustahiqStatesBefore) {
        const nextStates = { ...rawMustahiqStatesBefore };
        nisArr.forEach((nis) => {
          if (nextStates[nis]) {
            delete nextStates[nis];
            statesChanged = true;
          }
        });
        if (statesChanged) {
          await supabase
            .from('app_settings')
            .upsert({ key: KEY_DB_SETOR_MUSTAHIQ_STATES, value: nextStates }, { onConflict: 'key' });
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem(LS_SETOR_MUSTAHIQ_STATES, JSON.stringify(nextStates));
            }
          } catch {}
        }
      }

      // 2. Tangani setoran_hafalan_records
      if (setoranRowsBefore.length > 0) {
        if (historyMode === 'purge_all') {
          const ids = setoranRowsBefore.map((r: any) => r.id).filter(Boolean);
          for (let i = 0; i < ids.length; i += 100) {
            await supabase
              .from('setoran_hafalan_records' as any)
              .delete()
              .in('id', ids.slice(i, i + 100));
          }
        } else {
          for (const rec of setoranRowsBefore) {
            const tagged = appendDeletedTag(rec.nama);
            if (tagged !== rec.nama) {
              await supabase
                .from('setoran_hafalan_records' as any)
                .update({ nama: tagged })
                .eq('id', rec.id);
            }
          }
        }
      }

      // 3. Tangani RIWAYAT_MUHAFADZOH_DATA (app_settings)
      let riwayatChanged = false;
      if (rawRiwayatBefore && Array.isArray(rawRiwayatBefore)) {
        const nextRiwayat =
          historyMode === 'purge_all'
            ? rawRiwayatBefore.filter((r) => {
                const hit = nisSet.has(String(r?.no_induk || '').trim());
                if (hit) riwayatChanged = true;
                return !hit;
              })
            : rawRiwayatBefore.map((r) => {
                if (nisSet.has(String(r?.no_induk || '').trim())) {
                  const tagged = appendDeletedTag(r.nama);
                  if (tagged !== r.nama) riwayatChanged = true;
                  return { ...r, nama: tagged };
                }
                return r;
              });

        if (riwayatChanged) {
          await supabase
            .from('app_settings')
            .upsert({ key: KEY_DB_RIWAYAT_MUHAFADZOH, value: nextRiwayat }, { onConflict: 'key' });
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem(LS_RIWAYAT_MUHAFADZOH, JSON.stringify(nextRiwayat));
            }
          } catch {}
        }
      }

      if (setoranRowsBefore.length > 0 || riwayatChanged) {
        await useMuhafadzohStore.getState().fetchSetoranData();
      }

      // 4. Tangani serah_piagam
      if (piagamRowsBefore.length > 0) {
        if (historyMode === 'purge_all') {
          const ids = piagamRowsBefore.map((p: any) => p.id).filter(Boolean);
          await supabase.from('serah_piagam').delete().in('id', ids);
        } else {
          for (const p of piagamRowsBefore) {
            const tagged = appendDeletedTag(p.nama_santri);
            if (tagged !== p.nama_santri) {
              await supabase
                .from('serah_piagam')
                .update({ nama_santri: tagged })
                .eq('id', p.id);
            }
          }
        }
      }

      // 5. Tangani SETOR_MUSTAHIQ_LOGS_DATA
      let logsChanged = false;
      if (rawMustahiqLogsBefore && Array.isArray(rawMustahiqLogsBefore)) {
        const nextLogs =
          historyMode === 'purge_all'
            ? rawMustahiqLogsBefore.filter((l) => {
                const hit = nisSet.has(String(l?.no_induk || '').trim());
                if (hit) logsChanged = true;
                return !hit;
              })
            : rawMustahiqLogsBefore.map((l) => {
                if (nisSet.has(String(l?.no_induk || '').trim())) {
                  const tagged = appendDeletedTag(l.nama_santri);
                  if (tagged !== l.nama_santri) logsChanged = true;
                  return { ...l, nama_santri: tagged };
                }
                return l;
              });

        if (logsChanged) {
          await supabase
            .from('app_settings')
            .upsert({ key: KEY_DB_SETOR_MUSTAHIQ_LOGS, value: nextLogs }, { onConflict: 'key' });
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem(LS_SETOR_MUSTAHIQ_LOGS, JSON.stringify(nextLogs));
            }
          } catch {}
        }
      }

      if (statesChanged || logsChanged) {
        await useSetorMustahiqStore.getState().fetchMustahiqData();
      }

      return {
        historyMode,
        setoranRowsBefore,
        piagamRowsBefore,
        rawRiwayatBefore: riwayatChanged ? rawRiwayatBefore : null,
        rawMustahiqLogsBefore: logsChanged ? rawMustahiqLogsBefore : null,
        rawMustahiqStatesBefore: statesChanged ? rawMustahiqStatesBefore : null,
      };
    } catch (err: any) {
      console.error('[CascadeSantriService] Error cascading delete:', err.message);
      return null;
    }
  },

  async restoreSnapshot(snapshot: CascadeSantriSnapshot): Promise<boolean> {
    try {
      if (snapshot.setoranRowsBefore.length > 0) {
        await supabase
          .from('setoran_hafalan_records' as any)
          .upsert(snapshot.setoranRowsBefore, { onConflict: 'id' });
      }
      if (snapshot.piagamRowsBefore.length > 0) {
        await supabase
          .from('serah_piagam')
          .upsert(snapshot.piagamRowsBefore, { onConflict: 'id' });
      }
      if (snapshot.rawRiwayatBefore) {
        await supabase
          .from('app_settings')
          .upsert({ key: KEY_DB_RIWAYAT_MUHAFADZOH, value: snapshot.rawRiwayatBefore }, { onConflict: 'key' });
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem(LS_RIWAYAT_MUHAFADZOH, JSON.stringify(snapshot.rawRiwayatBefore));
          }
        } catch {}
      }
      if (snapshot.rawMustahiqLogsBefore) {
        await supabase
          .from('app_settings')
          .upsert({ key: KEY_DB_SETOR_MUSTAHIQ_LOGS, value: snapshot.rawMustahiqLogsBefore }, { onConflict: 'key' });
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem(LS_SETOR_MUSTAHIQ_LOGS, JSON.stringify(snapshot.rawMustahiqLogsBefore));
          }
        } catch {}
      }
      if (snapshot.rawMustahiqStatesBefore) {
        await supabase
          .from('app_settings')
          .upsert({ key: KEY_DB_SETOR_MUSTAHIQ_STATES, value: snapshot.rawMustahiqStatesBefore }, { onConflict: 'key' });
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem(LS_SETOR_MUSTAHIQ_STATES, JSON.stringify(snapshot.rawMustahiqStatesBefore));
          }
        } catch {}
      }

      if (snapshot.setoranRowsBefore.length > 0 || snapshot.rawRiwayatBefore) {
        await useMuhafadzohStore.getState().fetchSetoranData();
      }
      if (snapshot.rawMustahiqLogsBefore || snapshot.rawMustahiqStatesBefore) {
        await useSetorMustahiqStore.getState().fetchMustahiqData();
      }
      return true;
    } catch (err: any) {
      console.error('[CascadeSantriService] Restore snapshot error:', err.message);
      return false;
    }
  },
};
