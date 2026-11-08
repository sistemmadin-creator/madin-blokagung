import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';
import { useUndoRedoStore } from '@/stores/useUndoRedoStore';
import {
  SetorMustahiqLog,
  SantriActiveHafalanState,
  MateriOptionWithStatus,
  SantriSetorMustahiqRow,
} from '@/types/setor-mustahiq';
import { HafalanConfig, ItemHafalanDetail } from '@/types/setoran';
import {
  DEFAULT_HAFALAN_WAJIB,
  cariMustahiqSantri,
  norm,
  normalizeToItemDetail,
} from '@/lib/utils/setoranHelper';

export const KEY_DB_SETOR_MUSTAHIQ_LOGS = 'SETOR_MUSTAHIQ_LOGS_DATA';
export const KEY_DB_SETOR_MUSTAHIQ_STATES = 'SETOR_MUSTAHIQ_ACTIVE_STATES';
export const LS_SETOR_MUSTAHIQ_LOGS = 'MADIN_SETOR_MUSTAHIQ_LOGS';
export const LS_SETOR_MUSTAHIQ_STATES = 'MADIN_SETOR_MUSTAHIQ_STATES';

export function getUnitLabel(item: ItemHafalanDetail): string {
  if (item.targetType === 'sentence') {
    return item.sentenceUnitLabel || 'Kalimat';
  }
  switch (item.numericUnit) {
    case 'halaman':
      return 'Halaman';
    case 'bait':
      return 'Bait';
    case 'skor':
      return 'Skor';
    case 'custom':
      return item.customUnit || 'Item';
    case 'baris':
    default:
      return 'Baris';
  }
}

export function getShortUnitLabel(item: ItemHafalanDetail): string {
  if (item.targetType === 'sentence') {
    return item.sentenceUnitLabel || 'Klm';
  }
  switch (item.numericUnit) {
    case 'halaman':
      return 'Hlm';
    case 'bait':
      return 'Bait';
    case 'skor':
      return 'Skor';
    case 'custom':
      return item.customUnit || 'Itm';
    case 'baris':
    default:
      return 'Brs';
  }
}

export function getMateriListForTingkat(
  config: HafalanConfig,
  configKey: string
): Array<{
  item: ItemHafalanDetail;
  kategori: 'Wajib' | 'Sunnah' | 'Kitab';
  orderIndex: number;
}> {
  const result: Array<{
    item: ItemHafalanDetail;
    kategori: 'Wajib' | 'Sunnah' | 'Kitab';
    orderIndex: number;
  }> = [];

  let orderIdx = 0;

  // 1. Hafalan Wajib (Prioritas Utama)
  let rawWajib = config?.hafWajib?.[configKey];
  if (!rawWajib || (Array.isArray(rawWajib) && rawWajib.length === 0)) {
    rawWajib = DEFAULT_HAFALAN_WAJIB[configKey] || DEFAULT_HAFALAN_WAJIB.ULA_1 || [];
  } else if (
    configKey === 'ULA_1' &&
    Array.isArray(rawWajib) &&
    rawWajib.length === 1 &&
    typeof rawWajib[0] === 'string' &&
    rawWajib[0].includes('Al-Fajr')
  ) {
    // Upgrade legacy default ULA_1 agar sesuai dengan kurikulum terbaru (Juz Amma' + Aqidatul Awam)
    rawWajib = DEFAULT_HAFALAN_WAJIB.ULA_1;
  }

  const wajibArr = Array.isArray(rawWajib) ? rawWajib : [];
  wajibArr.forEach((rawIt, idx) => {
    const detail = normalizeToItemDetail(rawIt, idx);
    if (detail.nama.trim()) {
      result.push({
        item: detail,
        kategori: 'Wajib',
        orderIndex: orderIdx++,
      });
    }
  });

  // 2. Hafalan Sunnah (Prioritas Kedua setelah Wajib tuntas)
  const rawSunnah = config?.hafSunnah?.[configKey];
  const sunnahArr = Array.isArray(rawSunnah) ? rawSunnah : [];
  sunnahArr.forEach((rawIt, idx) => {
    const detail = normalizeToItemDetail(rawIt, idx + 100);
    if (detail.nama.trim()) {
      result.push({
        item: detail,
        kategori: 'Sunnah',
        orderIndex: orderIdx++,
      });
    }
  });

  // 3. Hafalan Kitab (Prioritas Ketiga)
  const rawKitab = config?.hafKitab?.[configKey];
  const kitabArr = Array.isArray(rawKitab) ? rawKitab : [];
  kitabArr.forEach((rawIt, idx) => {
    const detail = normalizeToItemDetail(rawIt, idx + 200);
    if (detail.nama.trim()) {
      result.push({
        item: detail,
        kategori: 'Kitab',
        orderIndex: orderIdx++,
      });
    }
  });

  // Fallback jika kosong sama sekali
  if (result.length === 0) {
    const fallbackItems = DEFAULT_HAFALAN_WAJIB[configKey] || DEFAULT_HAFALAN_WAJIB.ULA_1;
    fallbackItems.forEach((rawIt, idx) => {
      result.push({
        item: normalizeToItemDetail(rawIt, idx),
        kategori: 'Wajib',
        orderIndex: orderIdx++,
      });
    });
  }

  return result;
}

export function computeMateriProgressForSantri(
  noInduk: string,
  item: ItemHafalanDetail,
  logs: SetorMustahiqLog[],
  tahun: number
) {
  const cleanId = norm(noInduk);
  const cleanMateri = norm(item.nama);

  const matchingLogs = logs
    .filter(
      (l) =>
        norm(l.no_induk) === cleanId &&
        norm(l.materi_nama) === cleanMateri &&
        Number(l.tahun) === Number(tahun)
    )
    .sort((a, b) => {
      const tA = new Date(a.tanggal || a.created_at).getTime();
      const tB = new Date(b.tanggal || b.created_at).getTime();
      if (tA !== tB) return tA - tB;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

  const unitLabel = getUnitLabel(item);
  const shortUnit = getShortUnitLabel(item);

  if (item.targetType === 'sentence') {
    const targetSentences = item.sentences && item.sentences.length > 0
      ? item.sentences
      : ['Muqodimah', 'Mubtada', 'Khobar', 'Rofa', 'Jer'];
    const completedSet = new Set<string>();
    let latestSentence = '';

    matchingLogs.forEach((l) => {
      if (l.kalimat_dipilih) {
        completedSet.add(l.kalimat_dipilih);
        latestSentence = l.kalimat_dipilih;
      }
    });

    const completedSentences = targetSentences.filter((s) =>
      Array.from(completedSet).some((cs) => norm(cs) === norm(s))
    );
    // Tambahkan kalimat di log yang mungkin custom
    Array.from(completedSet).forEach((cs) => {
      if (!completedSentences.some((s) => norm(s) === norm(cs))) {
        completedSentences.push(cs);
      }
    });

    const totalCount = Math.max(1, targetSentences.length);
    const doneCount = Math.min(totalCount, completedSentences.length);
    const pct = Math.min(100, Math.round((doneCount / totalCount) * 100));
    const isCompleted = doneCount >= totalCount;

    const statusBadgeText = latestSentence
      ? `${unitLabel}: ${latestSentence}`
      : `0 / ${totalCount} ${unitLabel}`;

    return {
      matchingLogs,
      totalCapaianAngka: doneCount,
      targetAkhirAngka: totalCount,
      satuanLabel: unitLabel,
      shortUnitLabel: shortUnit,
      latestSentence,
      completedSentences,
      completedSentencesCount: doneCount,
      totalSentencesCount: totalCount,
      progressPct: pct,
      isCompleted,
      statusBadgeText,
      prosesRatioText: `${doneCount}/${totalCount}`,
      prosesFullText: `${doneCount} / ${totalCount} ${shortUnit}`,
    };
  }

  // Target Numeric (Baris, Halaman, Bait, Skor)
  const targetAkhir = Math.max(1, Number(item.numericEnd) || 100);
  const totalCapaian = matchingLogs.reduce(
    (sum, l) => sum + (Number(l.tambah_angka) || 0),
    0
  );
  const pct = Math.min(100, Math.round((totalCapaian / targetAkhir) * 100));
  const isCompleted = totalCapaian >= targetAkhir;

  const statusBadgeText = `${unitLabel} ${totalCapaian} / ${targetAkhir}`;

  return {
    matchingLogs,
    totalCapaianAngka: totalCapaian,
    targetAkhirAngka: targetAkhir,
    satuanLabel: unitLabel,
    shortUnitLabel: shortUnit,
    latestSentence: '',
    completedSentences: [] as string[],
    completedSentencesCount: 0,
    totalSentencesCount: 0,
    progressPct: pct,
    isCompleted,
    statusBadgeText,
    prosesRatioText: `${totalCapaian}/${targetAkhir}`,
    prosesFullText: `${totalCapaian} / ${targetAkhir} ${shortUnit}`,
  };
}

export function getMateriOptionsWithStatusForSantri(
  noInduk: string,
  configKey: string,
  config: HafalanConfig,
  logs: SetorMustahiqLog[],
  activeState: SantriActiveHafalanState | undefined,
  tahun: number
): MateriOptionWithStatus[] {
  const allMateri = getMateriListForTingkat(config, configKey);
  const manualCompletedSet = new Set(
    (activeState?.completed_materi || []).map((m) => norm(m))
  );

  // Hitung status masing-masing materi
  const prelim = allMateri.map((entry) => {
    const prog = computeMateriProgressForSantri(noInduk, entry.item, logs, tahun);
    const isCompleted =
      prog.isCompleted || manualCompletedSet.has(norm(entry.item.nama));
    return {
      ...entry,
      prog,
      isCompleted,
    };
  });

  // Tentukan materi aktif saat ini
  let activeMateriName = activeState?.active_materi_nama || '';
  if (
    !activeMateriName ||
    !prelim.some((p) => norm(p.item.nama) === norm(activeMateriName))
  ) {
    // Default ke urutan pertama Hafalan Wajib yang belum selesai, atau urutan ke-0 jika semua belum/sudah
    const firstUnfinishedWajib = prelim.find(
      (p) => p.kategori === 'Wajib' && !p.isCompleted
    );
    const firstUnfinishedAny = prelim.find((p) => !p.isCompleted);
    activeMateriName =
      firstUnfinishedWajib?.item.nama ||
      firstUnfinishedAny?.item.nama ||
      prelim[0]?.item.nama ||
      '';
  }

  // Tentukan rekomendasi hafalan selanjutnya (Prioritas: Hafalan Wajib yang belum selesai selain yang sedang aktif, baru Sunnah, baru Kitab)
  const nextRecommended =
    prelim.find(
      (p) =>
        p.kategori === 'Wajib' &&
        !p.isCompleted &&
        norm(p.item.nama) !== norm(activeMateriName)
    ) ||
    prelim.find(
      (p) =>
        p.kategori !== 'Wajib' &&
        !p.isCompleted &&
        norm(p.item.nama) !== norm(activeMateriName)
    ) ||
    prelim.find((p) => norm(p.item.nama) !== norm(activeMateriName));

  return prelim.map((p) => ({
    item: p.item,
    kategori: p.kategori,
    orderIndex: p.orderIndex,
    isCompleted: p.isCompleted,
    isCurrentActive: norm(p.item.nama) === norm(activeMateriName),
    isRecommendedNext:
      Boolean(nextRecommended) &&
      norm(p.item.nama) === norm(nextRecommended!.item.nama),
    currentProgressPct: p.prog.progressPct,
    currentStatusLabel: p.prog.statusBadgeText,
  }));
}

export function buildSantriSetorRow(
  santri: any,
  config: HafalanConfig,
  logs: SetorMustahiqLog[],
  activeStates: Record<string, SantriActiveHafalanState>,
  asatidzList: any[],
  formasiList: any[],
  tahun: number
): SantriSetorMustahiqRow {
  const noInduk = String(santri.no_induk || '').trim();
  const rawTk = norm(santri.tingkat);
  const tingkat =
    rawTk.includes('WUSTHO') || rawTk.includes('WUSTHA')
      ? 'WUSTHO'
      : rawTk.includes('ULYA')
      ? 'ULYA'
      : 'ULA';
  const rawKls = norm(santri.din_kls);
  const dinKls = !rawKls || rawKls === '-' ? '1' : rawKls;
  const rawBag = norm(santri.din_bag);
  const dinBag = !rawBag || rawBag === '-' ? 'A' : rawBag;
  const rawPaPi = norm(santri.pa_pi);
  const paPi = rawPaPi === 'PI' ? 'PI' : 'PA';
  const configKey = `${tingkat}_${dinKls}`;
  const shortKelasBadge = `${dinKls}${dinBag}`;
  const kelasLabel = `${dinKls} ${tingkat} ${dinBag}`;

  const activeState = activeStates[noInduk];
  const options = getMateriOptionsWithStatusForSantri(
    noInduk,
    configKey,
    config,
    logs,
    activeState,
    tahun
  );

  const currentOpt =
    options.find((o) => o.isCurrentActive) ||
    options[0] || {
      item: normalizeToItemDetail("Juz Amma' (An-Naas - Adh-Dhuha)", 0),
      kategori: 'Wajib' as const,
    };

  const prog = computeMateriProgressForSantri(
    noInduk,
    currentOpt.item,
    logs,
    tahun
  );

  const mustahiq = cariMustahiqSantri(
    tingkat,
    dinBag,
    dinKls,
    paPi,
    asatidzList,
    formasiList
  );

  const kamarStr = [santri.asr_kode, santri.no_kmr]
    .filter((v) => v && v !== '-')
    .join('') || santri.kamar || '-';

  return {
    no_induk: noInduk,
    nama: String(santri.nama || '').trim(),
    tingkat,
    din_kls: dinKls,
    din_bag: dinBag,
    pa_pi: paPi,
    kamar: kamarStr,
    asrama: String(santri.asrama || '-').trim(),
    blok: String(santri.blok || '-').trim(),
    kelas_label: kelasLabel,
    short_kelas_badge: shortKelasBadge,
    config_key: configKey,
    mustahiq,
    active_item: currentOpt.item,
    active_kategori: currentOpt.kategori,
    completed_materi: options.filter((o) => o.isCompleted).map((o) => o.item.nama),
    total_capaian_angka: prog.totalCapaianAngka,
    target_akhir_angka: prog.targetAkhirAngka,
    satuan_label: prog.satuanLabel,
    latest_sentence: prog.latestSentence,
    completed_sentences: prog.completedSentences,
    completed_sentences_count: prog.completedSentencesCount,
    total_sentences_count: prog.totalSentencesCount,
    progress_pct: prog.progressPct,
    is_target_met: prog.isCompleted,
    status_badge_text: prog.statusBadgeText,
    status_sub_text: `${currentOpt.item.nama} (${currentOpt.kategori})`,
    proses_ratio_text: prog.prosesRatioText,
    proses_full_text: prog.prosesFullText,
  };
}

interface SetorMustahiqStoreState {
  logs: SetorMustahiqLog[];
  activeStates: Record<string, SantriActiveHafalanState>;
  isLoading: boolean;

  fetchMustahiqData: () => Promise<void>;
  handleRealtimeMustahiqLogs: (newLogs: any) => void;
  handleRealtimeMustahiqStates: (newStates: any) => void;
  addLogSetoran: (
    payload: Omit<SetorMustahiqLog, 'id' | 'created_at' | 'status_ringkas' | 'kumulatif_angka'>,
    itemDetail: ItemHafalanDetail,
    skipHistory?: boolean
  ) => Promise<boolean>;
  addLogSetoranBatch: (
    basePayload: Omit<
      SetorMustahiqLog,
      'id' | 'created_at' | 'status_ringkas' | 'kumulatif_angka' | 'kalimat_dipilih' | 'kalimat_index' | 'target_type'
    > & { target_type?: 'sentence' },
    kalimatList: string[],
    itemDetail: ItemHafalanDetail,
    skipHistory?: boolean
  ) => Promise<boolean>;
  deleteLogSetoran: (logId: string, skipHistory?: boolean) => Promise<boolean>;
  deleteSantriLogsBatch: (
    noIndukList: string[],
    tahun?: number,
    skipHistory?: boolean
  ) => Promise<boolean>;
  switchActiveHafalan: (
    noInduk: string,
    namaSantri: string,
    nextMateriNama: string,
    nextKategori: 'Wajib' | 'Sunnah' | 'Kitab',
    markCurrentCompleted?: string,
    skipHistory?: boolean
  ) => Promise<boolean>;
}

async function persistMustahiqLogs(logs: SetorMustahiqLog[]) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LS_SETOR_MUSTAHIQ_LOGS, JSON.stringify(logs));
    } catch {}
  }
  await supabase
    .from('app_settings')
    .upsert([{ key: KEY_DB_SETOR_MUSTAHIQ_LOGS, value: logs }], {
      onConflict: 'key',
    });
}

async function persistMustahiqActiveStates(
  states: Record<string, SantriActiveHafalanState>
) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LS_SETOR_MUSTAHIQ_STATES, JSON.stringify(states));
    } catch {}
  }
  await supabase
    .from('app_settings')
    .upsert([{ key: KEY_DB_SETOR_MUSTAHIQ_STATES, value: states }], {
      onConflict: 'key',
    });
}

export const useSetorMustahiqStore = create<SetorMustahiqStoreState>((set, get) => ({
  logs: [],
  activeStates: {},
  isLoading: false,

  fetchMustahiqData: async () => {
    set({ isLoading: true });

    // 1. Muat dari localStorage terlebih dahulu
    try {
      if (typeof window !== 'undefined') {
        const rawLogs = localStorage.getItem(LS_SETOR_MUSTAHIQ_LOGS);
        if (rawLogs) {
          const parsedLogs = JSON.parse(rawLogs);
          if (Array.isArray(parsedLogs)) {
            set({ logs: parsedLogs });
          }
        }
        const rawStates = localStorage.getItem(LS_SETOR_MUSTAHIQ_STATES);
        if (rawStates) {
          const parsedStates = JSON.parse(rawStates);
          if (parsedStates && typeof parsedStates === 'object') {
            set({ activeStates: parsedStates });
          }
        }
      }
    } catch (e) {
      console.warn('Gagal memuat cache lokal Setor Mustahiq:', e);
    }

    // 2. Tarik dari Supabase app_settings
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', [KEY_DB_SETOR_MUSTAHIQ_LOGS, KEY_DB_SETOR_MUSTAHIQ_STATES]);

      if (!error && data && data.length > 0) {
        data.forEach((row) => {
          let val = row.value;
          if (typeof val === 'string') {
            try {
              val = JSON.parse(val);
            } catch {}
          }
          if (row.key === KEY_DB_SETOR_MUSTAHIQ_LOGS && Array.isArray(val)) {
            set({ logs: val });
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem(LS_SETOR_MUSTAHIQ_LOGS, JSON.stringify(val));
              } catch {}
            }
          } else if (
            row.key === KEY_DB_SETOR_MUSTAHIQ_STATES &&
            val &&
            typeof val === 'object'
          ) {
            set({ activeStates: val });
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem(LS_SETOR_MUSTAHIQ_STATES, JSON.stringify(val));
              } catch {}
            }
          }
        });
      }
    } catch (err: any) {
      console.error('Fetch Setor Mustahiq error:', err.message);
    } finally {
      set({ isLoading: false });
    }
  },

  handleRealtimeMustahiqLogs: (newLogs: any) => {
    let parsed = newLogs;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {}
    }
    if (Array.isArray(parsed)) {
      set({ logs: parsed });
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(LS_SETOR_MUSTAHIQ_LOGS, JSON.stringify(parsed));
        } catch {}
      }
    }
  },

  handleRealtimeMustahiqStates: (newStates: any) => {
    let parsed = newStates;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {}
    }
    if (parsed && typeof parsed === 'object') {
      set({ activeStates: parsed });
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(LS_SETOR_MUSTAHIQ_STATES, JSON.stringify(parsed));
        } catch {}
      }
    }
  },

  addLogSetoran: async (payload, itemDetail, skipHistory = false) => {
    try {
      const prevLogs = [...get().logs];
      const unitLabel = getUnitLabel(itemDetail);

      // Hitung capaian kumulatif setelah penambahan ini
      const existingProg = computeMateriProgressForSantri(
        payload.no_induk,
        itemDetail,
        prevLogs,
        payload.tahun
      );

      let kumulatifAngka = existingProg.totalCapaianAngka;
      let statusRingkas = '';

      if (payload.target_type === 'sentence') {
        const chosen = payload.kalimat_dipilih || '';
        const newCount = existingProg.completedSentences.some(
          (s) => norm(s) === norm(chosen)
        )
          ? existingProg.completedSentencesCount
          : existingProg.completedSentencesCount + 1;
        kumulatifAngka = newCount;
        statusRingkas = `${unitLabel}: ${chosen} (${newCount}/${existingProg.totalSentencesCount})`;
      } else {
        const added = Number(payload.tambah_angka) || 0;
        kumulatifAngka = existingProg.totalCapaianAngka + added;
        const targetEnd = Number(itemDetail.numericEnd) || 100;
        statusRingkas = `${unitLabel} ${kumulatifAngka} / ${targetEnd}`;
      }

      const newLog: SetorMustahiqLog = {
        ...payload,
        id: `sm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        kumulatif_angka: kumulatifAngka,
        target_akhir_angka:
          payload.target_type === 'sentence'
            ? existingProg.totalSentencesCount
            : Number(itemDetail.numericEnd) || 100,
        satuan_angka: unitLabel,
        status_ringkas: statusRingkas,
        created_at: new Date().toISOString(),
      };

      const nextLogs = [...prevLogs, newLog];
      set({ logs: nextLogs });
      await persistMustahiqLogs(nextLogs);

      await logActivity(
        'INPUT SETOR MUSTAHIQ',
        `Mencatat progres [${payload.materi_nama}] santri ${payload.nama_santri}: ${statusRingkas}`
      );

      if (!skipHistory) {
        useUndoRedoStore.getState().recordAction({
          module: 'muhafadzoh',
          title: `Setor Mustahiq: ${payload.nama_santri} (${payload.materi_nama})`,
          undo: async () => {
            return await get().deleteLogSetoran(newLog.id, true);
          },
          redo: async () => {
            const cur = get().logs;
            const restored = [...cur, newLog];
            set({ logs: restored });
            await persistMustahiqLogs(restored);
            return true;
          },
        });
      }

      return true;
    } catch (err: any) {
      console.error('Gagal menyimpan log Setor Mustahiq:', err);
      alert('Gagal menyimpan setoran: ' + err.message);
      return false;
    }
  },

  addLogSetoranBatch: async (basePayload, kalimatList, itemDetail, skipHistory = false) => {
    try {
      if (!kalimatList || kalimatList.length === 0) return false;
      const prevLogs = [...get().logs];
      let currentLogs = [...prevLogs];
      const unitLabel = getUnitLabel(itemDetail);
      const sentences = itemDetail.sentences || [];
      const newLogs: SetorMustahiqLog[] = [];

      for (let i = 0; i < kalimatList.length; i++) {
        const chosen = kalimatList[i].trim();
        if (!chosen) continue;

        const prog = computeMateriProgressForSantri(
          basePayload.no_induk,
          itemDetail,
          currentLogs,
          basePayload.tahun
        );

        const alreadyDone = prog.completedSentences.some((s) => norm(s) === norm(chosen));
        const newCount = alreadyDone
          ? prog.completedSentencesCount
          : prog.completedSentencesCount + 1;
        const kumulatifAngka = newCount;
        const statusRingkas = `${unitLabel}: ${chosen} (${newCount}/${prog.totalSentencesCount})`;
        const idx = sentences.findIndex((s) => norm(s) === norm(chosen));

        const logItem: SetorMustahiqLog = {
          ...basePayload,
          id: `sm_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
          target_type: 'sentence',
          kalimat_dipilih: chosen,
          kalimat_index: idx !== -1 ? idx + 1 : undefined,
          kumulatif_angka: kumulatifAngka,
          target_akhir_angka: prog.totalSentencesCount,
          satuan_angka: unitLabel,
          status_ringkas: statusRingkas,
          created_at: new Date(Date.now() + i * 50).toISOString(),
        };

        newLogs.push(logItem);
        currentLogs.push(logItem);
      }

      if (newLogs.length === 0) return false;

      const nextLogs = currentLogs;
      set({ logs: nextLogs });
      await persistMustahiqLogs(nextLogs);

      const kalimatStr = kalimatList.join(', ');
      await logActivity(
        'INPUT SETOR CEPAT BATCH',
        `Mencatat ${newLogs.length} setoran [${basePayload.materi_nama}] santri ${basePayload.nama_santri}: ${kalimatStr}`
      );

      if (!skipHistory) {
        const newLogIds = newLogs.map((l) => l.id);
        useUndoRedoStore.getState().recordAction({
          module: 'muhafadzoh',
          title: `Setor Cepat (${newLogs.length} Kalimat): ${basePayload.nama_santri}`,
          undo: async () => {
            const cur = get().logs;
            const filtered = cur.filter((l) => !newLogIds.includes(l.id));
            set({ logs: filtered });
            await persistMustahiqLogs(filtered);
            return true;
          },
          redo: async () => {
            const cur = get().logs;
            const restored = [...cur, ...newLogs];
            set({ logs: restored });
            await persistMustahiqLogs(restored);
            return true;
          },
        });
      }

      return true;
    } catch (err: any) {
      console.error('Gagal menyimpan log Setor Cepat batch:', err);
      alert('Gagal menyimpan setoran: ' + err.message);
      return false;
    }
  },

  deleteLogSetoran: async (logId, skipHistory = false) => {
    try {
      const prevLogs = [...get().logs];
      const target = prevLogs.find((l) => l.id === logId);
      const nextLogs = prevLogs.filter((l) => l.id !== logId);

      set({ logs: nextLogs });
      await persistMustahiqLogs(nextLogs);

      if (target) {
        await logActivity(
          'HAPUS LOG SETOR MUSTAHIQ',
          `Menghapus riwayat setor [${target.materi_nama}] santri ${target.nama_santri}`
        );

        if (!skipHistory) {
          useUndoRedoStore.getState().recordAction({
            module: 'muhafadzoh',
            title: `Hapus Log Setor: ${target.nama_santri}`,
            undo: async () => {
              const restored = [...get().logs, target];
              set({ logs: restored });
              await persistMustahiqLogs(restored);
              return true;
            },
            redo: async () => {
              return await get().deleteLogSetoran(logId, true);
            },
          });
        }
      }

      return true;
    } catch (err: any) {
      console.error('Gagal menghapus log Setor Mustahiq:', err);
      return false;
    }
  },

  deleteSantriLogsBatch: async (noIndukList, tahun, skipHistory = false) => {
    try {
      const idSet = new Set(noIndukList.map((id) => norm(id)));
      const prevLogs = [...get().logs];
      const nextLogs = prevLogs.filter((l) => {
        const matchSantri = idSet.has(norm(l.no_induk));
        const matchYear = tahun ? Number(l.tahun) === Number(tahun) : true;
        return !(matchSantri && matchYear);
      });

      set({ logs: nextLogs });
      await persistMustahiqLogs(nextLogs);

      await logActivity(
        'HAPUS RIWAYAT SETOR MUSTAHIQ',
        `Menghapus riwayat setor untuk ${noIndukList.length} santri terpilih`
      );

      if (!skipHistory) {
        useUndoRedoStore.getState().recordAction({
          module: 'muhafadzoh',
          title: `Reset Setor Mustahiq (${noIndukList.length} Santri)`,
          undo: async () => {
            set({ logs: prevLogs });
            await persistMustahiqLogs(prevLogs);
            return true;
          },
          redo: async () => {
            set({ logs: nextLogs });
            await persistMustahiqLogs(nextLogs);
            return true;
          },
        });
      }

      return true;
    } catch (err: any) {
      console.error('Gagal menghapus batch Setor Mustahiq:', err);
      return false;
    }
  },

  switchActiveHafalan: async (
    noInduk,
    namaSantri,
    nextMateriNama,
    nextKategori,
    markCurrentCompleted,
    skipHistory = false
  ) => {
    try {
      const cleanId = String(noInduk).trim();
      const prevStates = { ...get().activeStates };
      const existing = prevStates[cleanId];

      const completedSet = new Set(existing?.completed_materi || []);
      if (markCurrentCompleted && markCurrentCompleted.trim()) {
        completedSet.add(markCurrentCompleted.trim());
      }

      const nextState: SantriActiveHafalanState = {
        no_induk: cleanId,
        active_materi_nama: nextMateriNama,
        active_kategori: nextKategori,
        completed_materi: Array.from(completedSet),
        updated_at: new Date().toISOString(),
      };

      const updatedStates = {
        ...prevStates,
        [cleanId]: nextState,
      };

      set({ activeStates: updatedStates });
      await persistMustahiqActiveStates(updatedStates);

      await logActivity(
        'GANTI HAFALAN AKTIF',
        `Mengganti target hafalan aktif santri ${namaSantri} (${cleanId}) ke [${nextMateriNama}] (${nextKategori})`
      );

      if (!skipHistory) {
        useUndoRedoStore.getState().recordAction({
          module: 'muhafadzoh',
          title: `Ganti Hafalan: ${namaSantri} -> ${nextMateriNama}`,
          undo: async () => {
            const rollback = { ...get().activeStates };
            if (existing) {
              rollback[cleanId] = existing;
            } else {
              delete rollback[cleanId];
            }
            set({ activeStates: rollback });
            await persistMustahiqActiveStates(rollback);
            return true;
          },
          redo: async () => {
            return await get().switchActiveHafalan(
              noInduk,
              namaSantri,
              nextMateriNama,
              nextKategori,
              markCurrentCompleted,
              true
            );
          },
        });
      }

      return true;
    } catch (err: any) {
      console.error('Gagal mengganti hafalan selanjutnya:', err);
      alert('Gagal mengganti hafalan: ' + err.message);
      return false;
    }
  },
}));

if (typeof window !== 'undefined') {
  (window as any).useSetorMustahiqStore = useSetorMustahiqStore;
}
