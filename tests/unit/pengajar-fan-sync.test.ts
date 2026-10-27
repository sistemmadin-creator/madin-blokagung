import { describe, it, expect } from 'vitest';
import { getMustahiqByScope, getDaftarBagUnggulanTingkatKls } from '@/lib/utils/fanHelper';
import {
  buildUnifiedTeacherMap,
  buildSyncJadwalToFanPayload,
} from '@/lib/utils/pengajarFanHelper';
import { Formasi } from '@/types/formasi';
import { Asatidz } from '@/types/asatidz';
import { FanConfigMap, FanPelajaranDetail } from '@/types/fan';
import { TeacherJadwalRow } from '@/types/jadwal';

describe('Pemisahan Fan MS & Sinkronisasi Pengajar Fan', () => {
  const mockFormasi: Formasi[] = [
    {
      id: 'f1',
      tingkat: 'WUSTHO',
      din_kls: '1',
      din_bag: 'A',
      pa_pi: 'PA',
      is_unggulan: true,
      tahun_ajaran: '2026-2027',
    },
    {
      id: 'f2',
      tingkat: 'WUSTHO',
      din_kls: '1',
      din_bag: 'B',
      pa_pi: 'PI',
      is_unggulan: true,
      tahun_ajaran: '2026-2027',
    },
    {
      id: 'f3',
      tingkat: 'WUSTHO',
      din_kls: '1',
      din_bag: 'C',
      pa_pi: 'PA',
      is_unggulan: false,
      tahun_ajaran: '2026-2027',
    },
    {
      id: 'f4',
      tingkat: 'WUSTHO',
      din_kls: '1',
      din_bag: 'D',
      pa_pi: 'PI',
      is_unggulan: false,
      tahun_ajaran: '2026-2027',
    },
  ];

  const mockAsatidz: Asatidz[] = [
    {
      id: 'a1',
      nia: 'B50',
      nama_asatidz: 'RIZQI MAULANA ACHMAD',
      jah_asatidz: 'Mustahiq',
      tingkat_asatidz: 'WUSTHO',
      din_kls_asatidz: '1',
      din_bag_asatidz: 'A',
      pa_pi: 'PA',
    },
    {
      id: 'a2',
      nia: 'C57',
      nama_asatidz: 'ARMIA ZULIA PUTRI',
      jah_asatidz: 'Mustahiqoh',
      tingkat_asatidz: 'WUSTHO',
      din_kls_asatidz: '1',
      din_bag_asatidz: 'A',
      pa_pi: 'PI',
    },
    {
      id: 'a3',
      nia: 'B52',
      nama_asatidz: 'ARIF MUHTADI',
      jah_asatidz: 'Mustahiq',
      tingkat_asatidz: 'WUSTHO',
      din_kls_asatidz: '1',
      din_bag_asatidz: 'C',
      pa_pi: 'PA',
    },
    {
      id: 'a4',
      nia: 'C60',
      nama_asatidz: 'LILIK HIDAYATI',
      jah_asatidz: 'Mustahiqoh',
      tingkat_asatidz: 'WUSTHO',
      din_kls_asatidz: '1',
      din_bag_asatidz: 'D',
      pa_pi: 'PI',
    },
  ];

  it('1. getDaftarBagUnggulanTingkatKls mendeteksi bagian A dan B sebagai unggulan', () => {
    const bags = getDaftarBagUnggulanTingkatKls('WUSTHO', '1', mockFormasi);
    expect(bags).toEqual(['A', 'B']);
  });

  it('2. getMustahiqByScope reguler mengecualikan Mustahiq kelas Unggulan', () => {
    const mustahiqReg = getMustahiqByScope(
      { tingkat: 'WUSTHO', dinKls: '1', scope: 'reguler' },
      mockAsatidz,
      mockFormasi
    );
    expect(mustahiqReg).toContain('ARIF MUHTADI');
    expect(mustahiqReg).toContain('LILIK HIDAYATI');
    expect(mustahiqReg).not.toContain('RIZQI MAULANA ACHMAD');
    expect(mustahiqReg).not.toContain('ARMIA ZULIA PUTRI');
  });

  it('3. getMustahiqByScope unggulan hanya menyertakan Mustahiq kelas Unggulan', () => {
    const mustahiqUg = getMustahiqByScope(
      { tingkat: 'WUSTHO', dinKls: '1', scope: 'unggulan', selectedBag: 'A' },
      mockAsatidz,
      mockFormasi
    );
    expect(mustahiqUg).toEqual(['RIZQI MAULANA ACHMAD', 'ARMIA ZULIA PUTRI']);
  });

  it('4. buildUnifiedTeacherMap mengekstrak seluruh mata pelajaran mengajar dari Jadwal KBM dan mencegah bocornya fan reguler ke Mustahiq Unggulan', () => {
    const fanConfig: FanConfigMap = {
      '1 WUSTHO': [
        '(Nahwu) Al-Fiyyah Ibnu Malik Juz 1',
        '(Fiqih) Fathul Qorib 1',
        '(Sorogan)  Fathul Qorib 1',
        '(Takror) Takror',
      ],
      '1 A WUSTHO (Ug)': [
        '(Fiqih) Fathul Qorib 1',
        '(Nahwu) Al-Fiyyah Ibnu Malik Juz 1',
      ],
    };

    // Data lama: Rizqi mistakenly in 1 WUSTHO||Fiqih, but only in 1 A WUSTHO (Ug)||Fiqih
    const fanDetail: FanPelajaranDetail = {
      kelas: {},
      item: {
        '1 WUSTHO||(Fiqih) Fathul Qorib 1': {
          pengajar: 'MS',
          asatidz: ['ARIF MUHTADI', 'RIZQI MAULANA ACHMAD'],
        },
        '1 A WUSTHO (Ug)||(Fiqih) Fathul Qorib 1': {
          pengajar: 'MS',
          asatidz: ['RIZQI MAULANA ACHMAD'],
        },
      },
    };

    const mockJadwalMap: Record<string, TeacherJadwalRow> = {
      'RIZQI MAULANA ACHMAD': {
        nama_asatidz: 'RIZQI MAULANA ACHMAD',
        sabtu: 'Jam 1 | Fiqih | 1 A WUSTHO (PA) (Madrasah lt.3 A3.01)\nJam 2 | Fiqih | 1 A WUSTHO (PA) (Madrasah lt.3 A3.01)\nJam 3 | (Sorogan)  Fathul Qorib 1 | 1 A WUSTHO (PA) (Madrasah lt.3 A3.01)\nJam 4 | (Takror) Takror | 1 A WUSTHO (PA) (Madrasah lt.3 A3.01)',
        ahad: 'Jam 1 | Nahwu | 1 A WUSTHO (PA) (Madrasah lt.3 A3.01)\nJam 2 | Nahwu | 1 A WUSTHO (PA) (Madrasah lt.3 A3.01)',
      },
    };

    const unifiedMap = buildUnifiedTeacherMap(
      mockAsatidz,
      fanDetail,
      fanConfig,
      mockJadwalMap,
      mockFormasi
    );

    const rizqiEntries = unifiedMap['RIZQI MAULANA ACHMAD'];
    expect(rizqiEntries).toBeDefined();

    // Pastikan tidak ada entri reguler '1 WUSTHO' untuk Rizqi
    const regularEntry = rizqiEntries.find((e) => e.kelas === '1 WUSTHO');
    expect(regularEntry).toBeUndefined();

    // Pastikan seluruh 4 mata pelajaran muncul dengan label unggulan '1 A WUSTHO Ug'
    const fanNames = rizqiEntries.map((e) => e.fan);
    expect(fanNames).toContain('Fiqih');
    expect(fanNames).toContain('Nahwu');
    expect(fanNames).toContain('Sorogan');
    expect(fanNames).toContain('Takror');

    rizqiEntries.forEach((e) => {
      expect(e.isUg).toBe(true);
      expect(e.kelas).toBe('1 A WUSTHO Ug');
    });
  });

  it('5. buildSyncJadwalToFanPayload menambahkan fan yang belum terkonfigurasi ke kelas unggulan', () => {
    const fanConfig: FanConfigMap = {
      '1 A WUSTHO (Ug)': ['(Fiqih) Fathul Qorib 1'],
    };
    const fanDetail: FanPelajaranDetail = {
      item: {
        '1 A WUSTHO (Ug)||(Fiqih) Fathul Qorib 1': {
          pengajar: 'MS',
          asatidz: ['RIZQI MAULANA ACHMAD'],
        },
      },
    };
    const mockJadwalMap: Record<string, TeacherJadwalRow> = {
      'RIZQI MAULANA ACHMAD': {
        nama_asatidz: 'RIZQI MAULANA ACHMAD',
        ahad: 'Jam 1 | Nahwu | 1 A WUSTHO (PA) (Madrasah lt.3 A3.01)',
      },
    };

    const payload = buildSyncJadwalToFanPayload(
      mockJadwalMap,
      fanConfig,
      fanDetail,
      mockFormasi
    );

    expect(payload.changesCount).toBeGreaterThan(0);
    expect(payload.updatedConfig['1 A WUSTHO (Ug)']).toContain('(Nahwu) Nahwu');
    expect(
      payload.updatedDetail.item?.['1 A WUSTHO (Ug)||(Nahwu) Nahwu']?.asatidz
    ).toContain('RIZQI MAULANA ACHMAD');
  });

  it('6. Smart Subsumption: entri spesifik rombel (misal 3 C ULA) menyerap entri generik (3 ULA)', () => {
    const fanConfig: FanConfigMap = {
      '3 ULA': ['(Shorof) Tasrif Istilah', '(Nahwu) Jurumiyyah'],
    };
    const fanDetail: FanPelajaranDetail = {
      item: {
        '3 ULA||(Shorof) Tasrif Istilah': {
          pengajar: 'MS',
          asatidz: ['HAUL BAHRUN NAIM'],
        },
        '3 ULA||(Nahwu) Jurumiyyah': {
          pengajar: 'MS',
          asatidz: ['HAUL BAHRUN NAIM'],
        },
      },
    };
    const mockJadwalMap: Record<string, TeacherJadwalRow> = {
      'HAUL BAHRUN NAIM': {
        nama_asatidz: 'HAUL BAHRUN NAIM',
        senin: 'Jam 1 | Shorof | 3 C ULA (PA) (Masjid Lt.3 R.8)\nJam 2 | Nahwu | 3 C ULA (PA) (Masjid Lt.3 R.8)',
      },
    };
    const mockAsatidzLocal: Asatidz[] = [
      {
        id: 'hbn',
        nia: 'B29',
        nama_asatidz: 'HAUL BAHRUN NAIM',
        jah_asatidz: 'Mustahiq',
        tingkat_asatidz: 'ULA',
        din_kls_asatidz: '3',
        din_bag_asatidz: 'C',
        pa_pi: 'PA',
      },
    ];

    const unifiedMap = buildUnifiedTeacherMap(
      mockAsatidzLocal,
      fanDetail,
      fanConfig,
      mockJadwalMap,
      mockFormasi
    );

    const hbnEntries = unifiedMap['HAUL BAHRUN NAIM'];
    expect(hbnEntries).toBeDefined();

    // Pastikan HANYA ada 2 lencana (Shorof dan Nahwu) pada kelas spesifik '3 C ULA'
    expect(hbnEntries.length).toBe(2);

    const kelasList = hbnEntries.map((e) => e.kelas);
    expect(kelasList).toContain('3 C ULA');
    expect(kelasList).not.toContain('3 ULA');

    // Pastikan nama kitab 'Tasrif Istilah' terserap ke entri spesifik
    const shorofEntry = hbnEntries.find((e) => e.fan === 'Shorof');
    expect(shorofEntry?.kelas).toBe('3 C ULA');
    expect(shorofEntry?.kitab).toContain('Tasrif Istilah');
  });

  it('7. Toleran spasi ganda: asatidz dengan spasi ganda tetap terpetakan ke jadwalMap', () => {
    const fanConfig: FanConfigMap = {
      '1 ULA': ['(Fiqih) Safinatun Najah'],
    };
    const fanDetail: FanPelajaranDetail = { item: {}, kelas: {} };
    const mockJadwalMap: Record<string, TeacherJadwalRow> = {
      'AHMAD  ZAINI': {
        nama_asatidz: 'AHMAD  ZAINI',
        senin: 'Jam 1 | Fiqih | 1 A ULA (PA) (R.1)',
      },
    };
    const mockAsatidzLocal: Asatidz[] = [
      {
        id: 'az',
        nia: 'A01',
        nama_asatidz: 'AHMAD ZAINI', // Single space di master asatidz
        jah_asatidz: 'Mustahiq',
        tingkat_asatidz: 'ULA',
        din_kls_asatidz: '1',
        din_bag_asatidz: 'A',
        pa_pi: 'PA',
      },
    ];

    const unifiedMap = buildUnifiedTeacherMap(
      mockAsatidzLocal,
      fanDetail,
      fanConfig,
      mockJadwalMap,
      mockFormasi
    );

    // Lookup baik dengan single space maupun raw double space harus berhasil
    expect(unifiedMap['AHMAD ZAINI']).toBeDefined();
    expect(unifiedMap['AHMAD ZAINI'].length).toBe(1);
    expect(unifiedMap['AHMAD ZAINI'][0].fan).toBe('Fiqih');
    expect(unifiedMap['AHMAD  ZAINI']).toBeDefined();
  });

  it('8. Normalisasi tingkat IST vs ISTI\'DAD menyetarakan penamaan jenjang', () => {
    const fanConfig: FanConfigMap = {
      '1 IST': ['(Pegon) Pegon Dasar'],
    };
    const fanDetail: FanPelajaranDetail = { item: {}, kelas: {} };
    const mockJadwalMap: Record<string, TeacherJadwalRow> = {
      'GURU IST': {
        nama_asatidz: 'GURU IST',
        ahad: 'Jam 1 | Pegon | 1 A IST (PA) (R.2)',
      },
    };
    const mockAsatidzLocal: Asatidz[] = [
      {
        id: 'gi',
        nia: 'A02',
        nama_asatidz: 'GURU IST',
        jah_asatidz: 'Mustahiq',
        tingkat_asatidz: 'ISTI\'DAD',
        din_kls_asatidz: '1',
        din_bag_asatidz: 'A',
        pa_pi: 'PA',
      },
    ];

    const unifiedMap = buildUnifiedTeacherMap(
      mockAsatidzLocal,
      fanDetail,
      fanConfig,
      mockJadwalMap,
      mockFormasi
    );

    expect(unifiedMap['GURU IST']).toBeDefined();
    expect(unifiedMap['GURU IST'][0].tingkat).toBe("ISTI'DAD");
  });
});
