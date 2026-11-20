import {
  HafalanConfig,
  ItemHafalanDetail,
  SilabusConfigMap,
  SilabusHolidayEntry,
  SilabusItemRule,
} from '@/types/setoran';
import { SetorMustahiqLog } from '@/types/setor-mustahiq';
import {
  AcademicMonthInfo,
  SundayOption,
  getAcademicYearMonths,
  getLocalTodayYMD,
} from '@/lib/utils/sundayHelper';
import {
  DEFAULT_HAFALAN_WAJIB,
  formatTargetPreview,
  norm,
  normalizeTingkatKey,
  normalizeToItemDetail,
} from '@/lib/utils/setoranHelper';
import {
  computeMateriProgressForSantri,
  getMateriListForTingkat,
  getUnitLabel,
} from '@/stores/useSetorMustahiqStore';

export const ACADEMIC_MONTHS_LIST = [
  { index: 0, name: 'Juli', semester: 'Ganjil' as const },
  { index: 1, name: 'Agustus', semester: 'Ganjil' as const },
  { index: 2, name: 'September', semester: 'Ganjil' as const },
  { index: 3, name: 'Oktober', semester: 'Ganjil' as const },
  { index: 4, name: 'November', semester: 'Ganjil' as const },
  { index: 5, name: 'Desember', semester: 'Ganjil' as const },
  { index: 6, name: 'Januari', semester: 'Genap' as const },
  { index: 7, name: 'Februari', semester: 'Genap' as const },
  { index: 8, name: 'Maret', semester: 'Genap' as const },
  { index: 9, name: 'April', semester: 'Genap' as const },
  { index: 10, name: 'Mei', semester: 'Genap' as const },
  { index: 11, name: 'Juni', semester: 'Genap' as const },
];

export interface ResolvedSilabusMateri {
  item: ItemHafalanDetail;
  kategori: 'Wajib' | 'Sunnah';
}

/**
 * Mengambil daftar materi Wajib & Sunnah per kelas dari Pengaturan Target Muhafadzoh (Gambar 2),
 * dengan fallback ke DEFAULT_HAFALAN_WAJIB bila kelas belum dikonfigurasi di database.
 */
export function resolveKelasMaterialsForSilabus(
  config: HafalanConfig,
  pairKey: string
): ResolvedSilabusMateri[] {
  const result: ResolvedSilabusMateri[] = [];

  const rawWajib = config?.hafWajib?.[pairKey];
  let wajibList: any[] = [];
  if (Array.isArray(rawWajib) && rawWajib.length > 0) {
    wajibList = rawWajib;
  } else if (typeof rawWajib === 'string' && (rawWajib as string).trim()) {
    wajibList = (rawWajib as string)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (DEFAULT_HAFALAN_WAJIB[pairKey]) {
    wajibList = DEFAULT_HAFALAN_WAJIB[pairKey];
  }

  wajibList.forEach((it, idx) => {
    const detail = normalizeToItemDetail(it, idx);
    if (detail.nama.trim()) {
      result.push({ item: detail, kategori: 'Wajib' });
    }
  });

  const rawSunnah = config?.hafSunnah?.[pairKey];
  const sunnahList = Array.isArray(rawSunnah)
    ? rawSunnah
    : typeof rawSunnah === 'string' && (rawSunnah as string).trim()
    ? (rawSunnah as string)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  sunnahList.forEach((it, idx) => {
    const detail = normalizeToItemDetail(it, wajibList.length + idx);
    if (detail.nama.trim()) {
      result.push({ item: detail, kategori: 'Sunnah' });
    }
  });

  return result;
}

/**
 * Menyelaraskan rule silabus tersimpan dengan materi terbaru dari ModalSettingsHafalan (Gambar 2).
 */
export function syncSilabusRulesWithConfig(
  existingRules: SilabusItemRule[] = [],
  config: HafalanConfig,
  pairKey: string
): SilabusItemRule[] {
  const materiList = resolveKelasMaterialsForSilabus(config, pairKey);
  const totalM = Math.max(1, materiList.length);

  return materiList.map((m, mIdx) => {
    const mNorm = norm(m.item.nama);
    const found = existingRules.find((r) => norm(r.materi_nama) === mNorm);
    const itemStart = typeof m.item.numericStart === 'number' ? m.item.numericStart : 1;
    const itemEnd = typeof m.item.numericEnd === 'number' ? m.item.numericEnd : 100;

    if (found) {
      const targetMulai =
        typeof found.target_mulai === 'number' ? found.target_mulai : itemStart;
      const targetAkhir =
        typeof found.target_akhir === 'number' ? found.target_akhir : itemEnd;

      return {
        ...found,
        materi_id: m.item.id,
        materi_nama: m.item.nama,
        kategori: m.kategori,
        target_type: m.item.targetType,
        target_preview: formatTargetPreview(m.item),
        numeric_mode:
          m.item.targetType === 'numeric'
            ? found.numeric_mode || 'auto_even'
            : undefined,
        target_mulai: m.item.targetType === 'numeric' ? targetMulai : undefined,
        target_akhir: m.item.targetType === 'numeric' ? targetAkhir : undefined,
      };
    }

    const monthsPerItem = Math.max(1, Math.floor(12 / totalM));
    const dariIdx = Math.min(11, mIdx * monthsPerItem);
    const sampaiIdx =
      mIdx === totalM - 1 ? 11 : Math.min(11, dariIdx + monthsPerItem - 1);

    return {
      materi_id: m.item.id,
      materi_nama: m.item.nama,
      kategori: m.kategori,
      target_type: m.item.targetType,
      target_preview: formatTargetPreview(m.item),
      dari_bulan_index: dariIdx,
      sampai_bulan_index: sampaiIdx,
      dari_bulan_nama: ACADEMIC_MONTHS_LIST[dariIdx]?.name || 'Juli',
      sampai_bulan_nama: ACADEMIC_MONTHS_LIST[sampaiIdx]?.name || 'Juni',
      ...(m.item.targetType === 'numeric'
        ? {
            numeric_mode: 'auto_even' as const,
            target_mulai: itemStart,
            target_akhir: itemEnd,
            increment_per_minggu: 20,
            lanjutkan_kumulatif: false,
          }
        : {}),
    };
  });
}

export interface WeeklyTargetPoint {
  tanggal: string; // 'YYYY-MM-DD'
  academicMonthIndex: number; // 0..11
  mingguKe: number;
  isHoliday: boolean;
  holidayLabel?: string;
  relCumulative: number; // 0..totalSpan (dipakai untuk evaluasi progres santri)
  displayValue: number; // displayOffset + relCumulative (ditampilkan di tabel silabus)
}

export interface ComputedNumericRuleSchedule {
  totalSpan: number;
  displayOffset: number;
  activeSundaysCount: number;
  holidaySundaysCount: number;
  plannedEndRel: number;
  plannedEndDisplay: number;
  isSufficient: boolean;
  shortfall: number;
  weeklyMap: Map<string, WeeklyTargetPoint>;
  orderedPoints: WeeklyTargetPoint[];
}

export function getRuleSpan(rule: SilabusItemRule): number {
  const start = Math.max(1, Number(rule.target_mulai) || 1);
  const end = Math.max(start, Number(rule.target_akhir) || 100);
  return end - start + 1;
}

/**
 * Menghitung offset kumulatif tampilan untuk seluruh daftar rule pada satu kelas.
 * Jika `rule.lanjutkan_kumulatif` aktif, offset mengikuti angka akhir tampilan materi numeric sebelumnya
 * (atau `offset_tampilan_awal` bila diisi manual).
 */
export function computeDisplayOffsetsForRules(
  rules: SilabusItemRule[],
  academicMonths: AcademicMonthInfo[],
  holidaysMap: Record<string, SilabusHolidayEntry> = {}
): number[] {
  const offsets: number[] = [];
  let lastNumericEndDisplay = 0;

  rules.forEach((rule) => {
    if (rule.target_type !== 'numeric') {
      offsets.push(0);
      return;
    }

    let offset = 0;
    if (rule.lanjutkan_kumulatif) {
      offset =
        typeof rule.offset_tampilan_awal === 'number' && Number.isFinite(rule.offset_tampilan_awal)
          ? Math.max(0, rule.offset_tampilan_awal)
          : lastNumericEndDisplay;
    } else if (
      typeof rule.offset_tampilan_awal === 'number' &&
      Number.isFinite(rule.offset_tampilan_awal) &&
      rule.offset_tampilan_awal > 0
    ) {
      offset = rule.offset_tampilan_awal;
    }

    offsets.push(offset);

    const schedule = computeNumericRuleSchedule(rule, academicMonths, holidaysMap, offset);
    lastNumericEndDisplay = schedule.plannedEndDisplay;
  });

  return offsets;
}

/**
 * Menghitung jadwal target kumulatif mingguan untuk satu materi bertipe numeric,
 * otomatis menyesuaikan jumlah minggu per bulan (4/5 minggu) dan melewati minggu LIBURAN.
 */
export function computeNumericRuleSchedule(
  rule: SilabusItemRule,
  academicMonths: AcademicMonthInfo[],
  holidaysMap: Record<string, SilabusHolidayEntry> = {},
  displayOffset = 0
): ComputedNumericRuleSchedule {
  const totalSpan = getRuleSpan(rule);
  const startM = Math.max(0, Math.min(11, rule.dari_bulan_index ?? 0));
  const endM = Math.max(startM, Math.min(11, rule.sampai_bulan_index ?? 11));
  const mode = rule.numeric_mode || 'auto_even';
  const increment = Math.max(1, Number(rule.increment_per_minggu) || 20);

  const sundaysInRange: Array<{
    academicMonthIndex: number;
    sunday: SundayOption;
    isHoliday: boolean;
    holidayLabel?: string;
  }> = [];

  for (let mIdx = startM; mIdx <= endM; mIdx++) {
    const monthInfo = academicMonths[mIdx];
    if (!monthInfo) continue;
    monthInfo.sundays.forEach((sun) => {
      const hol = holidaysMap[sun.tanggal];
      sundaysInRange.push({
        academicMonthIndex: mIdx,
        sunday: sun,
        isHoliday: Boolean(hol),
        holidayLabel: hol?.label || undefined,
      });
    });
  }

  const activeItems = sundaysInRange.filter((item) => !item.isHoliday);
  const activeCount = activeItems.length;
  const holidayCount = sundaysInRange.length - activeCount;

  const weeklyMap = new Map<string, WeeklyTargetPoint>();
  const orderedPoints: WeeklyTargetPoint[] = [];

  let activeIdx = 0;
  let lastRel = 0;

  sundaysInRange.forEach((entry) => {
    if (entry.isHoliday) {
      const point: WeeklyTargetPoint = {
        tanggal: entry.sunday.tanggal,
        academicMonthIndex: entry.academicMonthIndex,
        mingguKe: entry.sunday.mingguKe,
        isHoliday: true,
        holidayLabel: entry.holidayLabel || 'LIBURAN',
        relCumulative: lastRel,
        displayValue: displayOffset + lastRel,
      };
      weeklyMap.set(entry.sunday.tanggal, point);
      orderedPoints.push(point);
      return;
    }

    activeIdx++;
    let nextRel = lastRel;

    if (mode === 'fixed_increment') {
      nextRel = Math.min(totalSpan, activeIdx * increment);
    } else if (mode === 'manual') {
      const manualVal = rule.minggu_targets?.[entry.sunday.tanggal];
      if (typeof manualVal === 'number' && Number.isFinite(manualVal)) {
        nextRel = Math.max(0, Math.min(totalSpan, Math.round(manualVal)));
      } else if (activeCount > 0) {
        nextRel = Math.min(totalSpan, Math.round((activeIdx / activeCount) * totalSpan));
      }
    } else {
      // 'auto_even'
      if (activeCount > 0) {
        nextRel =
          activeIdx === activeCount
            ? totalSpan
            : Math.min(totalSpan, Math.round((activeIdx / activeCount) * totalSpan));
      }
    }

    lastRel = nextRel;
    const point: WeeklyTargetPoint = {
      tanggal: entry.sunday.tanggal,
      academicMonthIndex: entry.academicMonthIndex,
      mingguKe: entry.sunday.mingguKe,
      isHoliday: false,
      relCumulative: nextRel,
      displayValue: displayOffset + nextRel,
    };
    weeklyMap.set(entry.sunday.tanggal, point);
    orderedPoints.push(point);
  });

  const plannedEndRel = lastRel;
  const plannedEndDisplay = displayOffset + plannedEndRel;
  const shortfall = Math.max(0, totalSpan - plannedEndRel);

  return {
    totalSpan,
    displayOffset,
    activeSundaysCount: activeCount,
    holidaySundaysCount: holidayCount,
    plannedEndRel,
    plannedEndDisplay,
    isSufficient: shortfall === 0,
    shortfall,
    weeklyMap,
    orderedPoints,
  };
}

export interface SilabusTableWeekRow {
  academicMonthIndex: number;
  monthName: string;
  year: number;
  semester: 'Ganjil' | 'Genap';
  isCurrentMonth: boolean;
  sunday: SundayOption;
  isFirstWeekOfMonth: boolean;
  monthWeekCount: number;
  isHoliday: boolean;
  holidayLabel?: string;
  activeEntries: Array<{
    materiNama: string;
    kategori: 'Wajib' | 'Sunnah';
    targetType: 'numeric' | 'sentence';
    targetText: string;
    numericDisplayValue?: number;
    targetPreview: string;
  }>;
  primaryMateriKey: string; // gabungan nama materi aktif pada minggu ini untuk rowspan kolom Materi
  primaryMateriLabel: string;
}

/**
 * Membangun baris tabel mingguan untuk komponen tampilan Switch 'Silabus' dan Export Excel.
 */
export function buildClassSilabusRows(
  startYear: number,
  rules: SilabusItemRule[],
  holidaysMap: Record<string, SilabusHolidayEntry> = {},
  visibleMonthKeys?: Set<string>
): SilabusTableWeekRow[] {
  const academicMonths = getAcademicYearMonths(startYear);
  const offsets = computeDisplayOffsetsForRules(rules, academicMonths, holidaysMap);
  const today = new Date();
  const todayY = today.getFullYear();
  const todayM = today.getMonth();

  const ruleSchedules = rules.map((r, idx) =>
    r.target_type === 'numeric'
      ? computeNumericRuleSchedule(r, academicMonths, holidaysMap, offsets[idx])
      : null
  );

  const rows: SilabusTableWeekRow[] = [];

  academicMonths.forEach((m, mIdx) => {
    if (visibleMonthKeys && !visibleMonthKeys.has(m.key)) return;
    const isCurrentMonth = m.year === todayY && m.monthIndex === todayM;

    m.sundays.forEach((sun, sIdx) => {
      const hol = holidaysMap[sun.tanggal];
      const isHoliday = Boolean(hol);
      const holidayLabel = hol?.label || 'LIBURAN';

      const activeEntries: SilabusTableWeekRow['activeEntries'] = [];

      rules.forEach((rule, rIdx) => {
        if (mIdx < rule.dari_bulan_index || mIdx > rule.sampai_bulan_index) return;

        if (rule.target_type === 'numeric') {
          const sched = ruleSchedules[rIdx];
          const pt = sched?.weeklyMap.get(sun.tanggal);
          const dispVal = pt ? pt.displayValue : undefined;
          activeEntries.push({
            materiNama: rule.materi_nama,
            kategori: rule.kategori,
            targetType: 'numeric',
            targetText: isHoliday
              ? holidayLabel
              : dispVal !== undefined
              ? String(dispVal)
              : '-',
            numericDisplayValue: isHoliday ? undefined : dispVal,
            targetPreview: rule.target_preview || '',
          });
        } else {
          activeEntries.push({
            materiNama: rule.materi_nama,
            kategori: rule.kategori,
            targetType: 'sentence',
            targetText: isHoliday ? holidayLabel : rule.target_preview || 'Target Bertahap',
            targetPreview: rule.target_preview || '',
          });
        }
      });

      const primaryMateriKey = isHoliday
        ? `HOLIDAY_${holidayLabel}_${activeEntries.map((e) => e.materiNama).join('|')}`
        : activeEntries.map((e) => `${e.kategori}:${e.materiNama}`).join(' + ') || 'EMPTY';

      const primaryMateriLabel =
        activeEntries.map((e) => e.materiNama).join(' + ') || (isHoliday ? holidayLabel : '-');

      rows.push({
        academicMonthIndex: mIdx,
        monthName: m.monthName,
        year: m.year,
        semester: m.semester,
        isCurrentMonth,
        sunday: sun,
        isFirstWeekOfMonth: sIdx === 0,
        monthWeekCount: m.sundays.length,
        isHoliday,
        holidayLabel: isHoliday ? holidayLabel : undefined,
        activeEntries,
        primaryMateriKey,
        primaryMateriLabel,
      });
    });
  });

  return rows;
}

export interface SantriSilabusEvalResult {
  status: 'merah' | 'kuning' | 'putih';
  reason: string;
  item: string;
}

/**
 * Menentukan tanggal hari Minggu acuan evaluasi untuk bulan akademik tertentu.
 * - Jika `isAutoCurrentMonth` = true: ambil hari Minggu terakhir di bulan tsb yang <= hari ini
 *   (bila hari ini sebelum Minggu ke-1 bulan berjalan, ambil Minggu terakhir bulan sebelumnya atau null).
 * - Jika dipilih manual oleh user: ambil hari Minggu terakhir pada bulan tsb.
 * - Jika hari Minggu acuan jatuh di hari LIBURAN, mundur ke hari Minggu aktif terakhir sebelumnya.
 */
export function resolveEvaluationCutoffSunday(
  academicMonths: AcademicMonthInfo[],
  targetMonthIndex: number,
  isAutoCurrentMonth: boolean,
  holidaysMap: Record<string, SilabusHolidayEntry> = {},
  todayYMD: string = getLocalTodayYMD()
): { tanggal: string; labelSingkat: string; monthIndex: number } | null {
  const clampedIdx = Math.max(0, Math.min(11, targetMonthIndex));
  const candidateSundays: Array<{ tanggal: string; labelSingkat: string; monthIndex: number }> = [];

  for (let i = 0; i <= clampedIdx; i++) {
    const m = academicMonths[i];
    if (!m) continue;
    m.sundays.forEach((s) => {
      const include = isAutoCurrentMonth && i === clampedIdx ? s.tanggal <= todayYMD : true;
      if (include && !holidaysMap[s.tanggal]) {
        candidateSundays.push({
          tanggal: s.tanggal,
          labelSingkat: `${m.monthNameShort} M${s.mingguKe}`,
          monthIndex: i,
        });
      }
    });
  }

  if (candidateSundays.length === 0) return null;
  return candidateSundays[candidateSundays.length - 1];
}

export function evaluateSantriSilabusStatus(params: {
  noInduk: string;
  tingkat: string;
  dinKls: string;
  displayKelas: string;
  config: HafalanConfig;
  silabusConfig: SilabusConfigMap;
  holidaysMap: Record<string, SilabusHolidayEntry>;
  activeStates: Record<string, any>;
  logs: SetorMustahiqLog[];
  setoranList: any[];
  startYear: number;
  targetMonth: number;
  isAutoEvalMonth: boolean;
  todayYMD?: string;
}): SantriSilabusEvalResult {
  const {
    noInduk,
    tingkat,
    dinKls,
    displayKelas,
    config,
    silabusConfig,
    holidaysMap,
    activeStates,
    logs,
    setoranList,
    startYear,
    targetMonth,
    isAutoEvalMonth,
    todayYMD = getLocalTodayYMD(),
  } = params;

  const cleanNoInduk = norm(noInduk);
  const normTk = normalizeTingkatKey(tingkat);
  const configKey = `${normTk}_${norm(dinKls)}`;

  const rules = silabusConfig[configKey] || silabusConfig[displayKelas] || [];
  if (!rules || rules.length === 0) {
    return {
      status: 'putih',
      reason: 'Belum ada silabus target',
      item: '',
    };
  }

  const academicMonths = getAcademicYearMonths(startYear);
  const cutoff = resolveEvaluationCutoffSunday(
    academicMonths,
    targetMonth,
    isAutoEvalMonth,
    holidaysMap,
    todayYMD
  );
  const offsets = computeDisplayOffsetsForRules(rules, academicMonths, holidaysMap);

  const manualDoneSet = new Set(
    (activeStates[noInduk]?.completed_materi || []).map((m: string) => norm(m))
  );
  const santriLogs = logs.filter((l) => norm(l.no_induk) === cleanNoInduk);

  let worstStatus: 'merah' | 'kuning' | 'putih' = 'putih';
  let worstReason = '';
  let worstItem = '';

  for (let rIdx = 0; rIdx < rules.length; rIdx++) {
    const rule = rules[rIdx];
    const itemNorm = norm(rule.materi_nama);
    let isCompleted = manualDoneSet.has(itemNorm);

    const matchingConfigItem =
      getMateriListForTingkat(config, configKey).find(
        (m) => norm(m.item.nama) === itemNorm
      )?.item || {
        id: `item_${itemNorm}`,
        nama: rule.materi_nama,
        targetType: rule.target_type || 'sentence',
        numericStart: rule.target_mulai || 1,
        numericEnd: rule.target_akhir || 100,
        sentences: ['Muqodimah', 'Mubtada', 'Khobar', 'Rofa', 'Jer'],
      };

    const prog = computeMateriProgressForSantri(
      noInduk,
      matchingConfigItem as ItemHafalanDetail,
      santriLogs,
      startYear
    );

    if (!isCompleted) {
      if (prog.isCompleted) {
        isCompleted = true;
      } else if (matchingConfigItem.targetType !== 'numeric') {
        // Fallback legacy hanya untuk materi non-numeric (kalimat/tuntas langsung)
        const hasLegacy = setoranList.some(
          (r) => norm(r.no_induk) === cleanNoInduk && norm(r.item_hafalan) === itemNorm
        );
        if (hasLegacy) {
          isCompleted = true;
        }
      }
    }

    if (isCompleted) continue;

    const dariIdx = rule.dari_bulan_index;
    const sampaiIdx = rule.sampai_bulan_index;

    if (targetMonth > sampaiIdx) {
      worstStatus = 'merah';
      worstReason = `Melewati target bulan ${rule.sampai_bulan_nama || 'akhir'} untuk hafalan ${rule.materi_nama}`;
      worstItem = rule.materi_nama;
      break;
    }

    if (targetMonth >= dariIdx && targetMonth <= sampaiIdx) {
      if (rule.target_type === 'numeric' && cutoff && cutoff.monthIndex >= dariIdx) {
        const sched = computeNumericRuleSchedule(
          rule,
          academicMonths,
          holidaysMap,
          offsets[rIdx]
        );
        const targetPoint = sched.weeklyMap.get(cutoff.tanggal);
        // Jika cutoff berasal dari minggu setelah akhir materi (tidak mungkin krn <= sampaiIdx) atau di dalam range
        const expectedRel = targetPoint ? targetPoint.relCumulative : 0;

        if (expectedRel > 0 && prog.totalCapaianAngka < expectedRel) {
          const unitLbl = getUnitLabel(matchingConfigItem as ItemHafalanDetail);
          worstStatus = 'merah';
          worstReason = `Tertinggal target ${rule.materi_nama}: capaian ${prog.totalCapaianAngka} / ${expectedRel} ${unitLbl} (acuan ${cutoff.labelSingkat})`;
          worstItem = rule.materi_nama;
          break;
        }
      }

      worstStatus = 'kuning';
      worstReason = `Sedang dalam periode capaian target hafalan ${rule.materi_nama} (s.d. ${rule.sampai_bulan_nama})`;
      worstItem = rule.materi_nama;
    }
  }

  return {
    status: worstStatus,
    reason: worstReason,
    item: worstItem,
  };
}

/**
 * Versi batch teroptimasi untuk mengevaluasi ratusan santri sekaligus tanpa
 * menghitung ulang jadwal kalender & filter log secara berulang (O(N + M)).
 */
export function evaluateAllSantriSilabusStatus(params: {
  santriList: Array<{
    no_induk: string;
    tingkat: string;
    din_kls: string;
    displayKelas: string;
  }>;
  config: HafalanConfig;
  silabusConfig: SilabusConfigMap;
  holidaysMap: Record<string, SilabusHolidayEntry>;
  activeStates: Record<string, any>;
  logs: SetorMustahiqLog[];
  setoranList: any[];
  startYear: number;
  targetMonth: number;
  isAutoEvalMonth: boolean;
  todayYMD?: string;
}): Map<string, SantriSilabusEvalResult> {
  const {
    santriList,
    config,
    silabusConfig,
    holidaysMap,
    activeStates,
    logs,
    setoranList,
    startYear,
    targetMonth,
    isAutoEvalMonth,
    todayYMD = getLocalTodayYMD(),
  } = params;

  const result = new Map<string, SantriSilabusEvalResult>();
  const academicMonths = getAcademicYearMonths(startYear);
  const cutoff = resolveEvaluationCutoffSunday(
    academicMonths,
    targetMonth,
    isAutoEvalMonth,
    holidaysMap,
    todayYMD
  );

  // Pre-group logs & legacy setoran by normalized no_induk
  const logsByNoInduk = new Map<string, SetorMustahiqLog[]>();
  logs.forEach((l) => {
    const key = norm(l.no_induk);
    if (!key) return;
    const arr = logsByNoInduk.get(key);
    if (arr) arr.push(l);
    else logsByNoInduk.set(key, [l]);
  });

  const legacyItemsByNoInduk = new Map<string, Set<string>>();
  setoranList.forEach((r) => {
    const key = norm(r.no_induk);
    const item = norm(r.item_hafalan);
    if (!key || !item) return;
    const set = legacyItemsByNoInduk.get(key);
    if (set) set.add(item);
    else legacyItemsByNoInduk.set(key, new Set([item]));
  });

  // Cache materi list & computed numeric schedules per rule key
  const materiCache = new Map<string, Map<string, ItemHafalanDetail>>();
  const scheduleCache = new Map<
    string,
    Array<ReturnType<typeof computeNumericRuleSchedule> | null>
  >();

  const getCachedMateriItem = (
    configKey: string,
    rule: SilabusItemRule
  ): ItemHafalanDetail => {
    let mMap = materiCache.get(configKey);
    if (!mMap) {
      mMap = new Map();
      getMateriListForTingkat(config, configKey).forEach((m) => {
        mMap!.set(norm(m.item.nama), m.item);
      });
      materiCache.set(configKey, mMap);
    }
    const itemNorm = norm(rule.materi_nama);
    return (
      mMap.get(itemNorm) || {
        id: `item_${itemNorm}`,
        nama: rule.materi_nama,
        targetType: rule.target_type || 'sentence',
        numericStart: rule.target_mulai || 1,
        numericEnd: rule.target_akhir || 100,
        sentences: ['Muqodimah', 'Mubtada', 'Khobar', 'Rofa', 'Jer'],
      }
    );
  };

  const getCachedSchedules = (ruleKey: string, rules: SilabusItemRule[]) => {
    let cached = scheduleCache.get(ruleKey);
    if (cached) return cached;
    const offsets = computeDisplayOffsetsForRules(rules, academicMonths, holidaysMap);
    cached = rules.map((r, idx) =>
      r.target_type === 'numeric'
        ? computeNumericRuleSchedule(r, academicMonths, holidaysMap, offsets[idx])
        : null
    );
    scheduleCache.set(ruleKey, cached);
    return cached;
  };

  santriList.forEach((santri) => {
    const noInduk = santri.no_induk;
    const cleanNoInduk = norm(noInduk);
    const normTk = normalizeTingkatKey(santri.tingkat);
    const configKey = `${normTk}_${norm(santri.din_kls)}`;
    const ruleKey = silabusConfig[configKey]
      ? configKey
      : silabusConfig[santri.displayKelas]
      ? santri.displayKelas
      : '';
    const rules = ruleKey ? silabusConfig[ruleKey] || [] : [];

    if (!rules || rules.length === 0) {
      result.set(noInduk, {
        status: 'putih',
        reason: 'Belum ada silabus target',
        item: '',
      });
      return;
    }

    const schedules = getCachedSchedules(ruleKey, rules);
    const manualDoneSet = new Set(
      (activeStates[noInduk]?.completed_materi || []).map((m: string) => norm(m))
    );
    const santriLogs = logsByNoInduk.get(cleanNoInduk) || [];
    const legacySet = legacyItemsByNoInduk.get(cleanNoInduk);

    let worstStatus: 'merah' | 'kuning' | 'putih' = 'putih';
    let worstReason = '';
    let worstItem = '';

    for (let rIdx = 0; rIdx < rules.length; rIdx++) {
      const rule = rules[rIdx];
      const itemNorm = norm(rule.materi_nama);
      let isCompleted = manualDoneSet.has(itemNorm);
      const matchingConfigItem = getCachedMateriItem(configKey, rule);

      const prog = computeMateriProgressForSantri(
        noInduk,
        matchingConfigItem,
        santriLogs,
        startYear
      );

      if (!isCompleted) {
        if (prog.isCompleted) {
          isCompleted = true;
        } else if (matchingConfigItem.targetType !== 'numeric') {
          if (legacySet?.has(itemNorm)) {
            isCompleted = true;
          }
        }
      }

      if (isCompleted) continue;

      const dariIdx = rule.dari_bulan_index;
      const sampaiIdx = rule.sampai_bulan_index;

      if (targetMonth > sampaiIdx) {
        worstStatus = 'merah';
        worstReason = `Melewati target bulan ${rule.sampai_bulan_nama || 'akhir'} untuk hafalan ${rule.materi_nama}`;
        worstItem = rule.materi_nama;
        break;
      }

      if (targetMonth >= dariIdx && targetMonth <= sampaiIdx) {
        if (rule.target_type === 'numeric' && cutoff && cutoff.monthIndex >= dariIdx) {
          const sched = schedules[rIdx];
          const targetPoint = sched?.weeklyMap.get(cutoff.tanggal);
          const expectedRel = targetPoint ? targetPoint.relCumulative : 0;

          if (expectedRel > 0 && prog.totalCapaianAngka < expectedRel) {
            const unitLbl = getUnitLabel(matchingConfigItem);
            worstStatus = 'merah';
            worstReason = `Tertinggal target ${rule.materi_nama}: capaian ${prog.totalCapaianAngka} / ${expectedRel} ${unitLbl} (acuan ${cutoff.labelSingkat})`;
            worstItem = rule.materi_nama;
            break;
          }
        }

        worstStatus = 'kuning';
        worstReason = `Sedang dalam periode capaian target hafalan ${rule.materi_nama} (s.d. ${rule.sampai_bulan_nama})`;
        worstItem = rule.materi_nama;
      }
    }

    result.set(noInduk, {
      status: worstStatus,
      reason: worstReason,
      item: worstItem,
    });
  });

  return result;
}
