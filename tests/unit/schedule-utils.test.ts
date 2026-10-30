import { describe, it, expect } from 'vitest';
import { JadwalAsatidzRow } from '@/types/jadwal';
import {
  bandingkanUrutanKelasKBM,
  dapatkanBlokDariSesiMengajar,
  addSlotToGuruObj,
  syncGuruMengajarAndTotalObj,
  parseJadwalCell_Client,
} from '@/lib/utils/jadwalHelper';
import { Formasi, HierarkiBlokKBMConfig } from '@/types/formasi';
import { Asatidz } from '@/types/asatidz';

describe('Jadwal Conflict Detection Logic', () => {
  function checkScheduleConflicts(jadwalList: JadwalAsatidzRow[]) {
    const teacherSlots = new Map<string, string[]>(); // key: `${teacher}_${day}_${jam}`, val: [kelas]
    const classSlots = new Map<string, string[]>();   // key: `${kelas}_${day}_${jam}`, val: [teacher]

    const conflicts: string[] = [];
    const days: string[] = ['sabtu', 'ahad', 'senin', 'selasa', 'rabu', 'kamis'];

    jadwalList.forEach((row) => {
      const teacher = row.nama_asatidz;

      days.forEach((day) => {
        const cell = row[day];
        if (!cell || typeof cell !== 'string') return;

        const entries = cell.split(';;').map((s) => s.trim()).filter(Boolean);
        entries.forEach((entry) => {
          const parts = entry.split('|').map((s) => s.trim());
          const jamStr = parts[0] || '';
          const kelas = parts[1] || '';

          const teacherKey = `${teacher}_${day}_${jamStr}`;
          if (!teacherSlots.has(teacherKey)) {
            teacherSlots.set(teacherKey, [kelas]);
          } else {
            teacherSlots.get(teacherKey)!.push(kelas);
            conflicts.push(`Guru ${teacher} bentrok di hari ${day} ${jamStr}`);
          }

          const classKey = `${kelas}_${day}_${jamStr}`;
          if (!classSlots.has(classKey)) {
            classSlots.set(classKey, [teacher]);
          } else {
            classSlots.get(classKey)!.push(teacher);
            conflicts.push(`Kelas ${kelas} memiliki 2 guru di hari ${day} ${jamStr}`);
          }
        });
      });
    });

    return conflicts;
  }

  it('should detect no conflict in clean schedule', () => {
    const sampleRows: JadwalAsatidzRow[] = [
      {
        nama_asatidz: 'USTADZ AHMAD',
        sabtu: 'Jam 1 | 1A | Jurumiyyah',
        ahad: '',
        senin: '',
        selasa: '',
        rabu: '',
        kamis: '',
      },
      {
        nama_asatidz: 'USTADZ MAHMUD',
        sabtu: 'Jam 1 | 1B | Shorof',
        ahad: '',
        senin: '',
        selasa: '',
        rabu: '',
        kamis: '',
      },
    ];

    const conflicts = checkScheduleConflicts(sampleRows);
    expect(conflicts).toHaveLength(0);
  });

  it('should detect teacher double-booking conflict', () => {
    const sampleRows: JadwalAsatidzRow[] = [
      {
        nama_asatidz: 'USTADZ AHMAD',
        sabtu: 'Jam 1 | 1A | Jurumiyyah ;; Jam 1 | 1B | Nahwu',
        ahad: '',
        senin: '',
        selasa: '',
        rabu: '',
        kamis: '',
      },
    ];

    const conflicts = checkScheduleConflicts(sampleRows);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0]).toContain('Guru USTADZ AHMAD bentrok');
  });

  it('should detect class double-teacher conflict', () => {
    const sampleRows: JadwalAsatidzRow[] = [
      {
        nama_asatidz: 'USTADZ AHMAD',
        sabtu: 'Jam 1 | 1A | Jurumiyyah',
        ahad: '',
        senin: '',
        selasa: '',
        rabu: '',
        kamis: '',
      },
      {
        nama_asatidz: 'USTADZ ZAID',
        sabtu: 'Jam 1 | 1A | Fiqih',
        ahad: '',
        senin: '',
        selasa: '',
        rabu: '',
        kamis: '',
      },
    ];

    const conflicts = checkScheduleConflicts(sampleRows);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0]).toContain('Kelas 1A memiliki 2 guru');
  });
});

import {
  parseInfoKelasNorm,
  isInfoKelasCocok,
  isSlotMilikKelas,
  removeSlotFromGuruObj,
  buildMasterStrukturKelasKBM,
  ekstrakKelasMurniDariLokasi,
} from '@/lib/utils/jadwalHelper';
import { TeacherJadwalRow } from '@/types/jadwal';

describe('Gender-Aware Class Matching & Schedule Isolation (PA vs PI)', () => {
  it('ekstrakKelasMurniDariLokasi strips trailing room name but retains gender tag', () => {
    expect(ekstrakKelasMurniDariLokasi('1 A ULA (PI) (Asrama Al-Barokah)')).toBe('1 A ULA (PI)');
    expect(ekstrakKelasMurniDariLokasi('1 A ULA (PA) (Gedung Utama)')).toBe('1 A ULA (PA)');
    expect(ekstrakKelasMurniDariLokasi('1 A ULA (Ug) (Ruang 3)')).toBe('1 A ULA (Ug)');
    expect(ekstrakKelasMurniDariLokasi('1 A ULA')).toBe('1 A ULA');
  });

  it('parseInfoKelasNorm separates base name and gender token', () => {
    const pi = parseInfoKelasNorm('1 A ULA (PI)');
    expect(pi.norm).toBe('1 A ULA PI');
    expect(pi.gender).toBe('PI');
    expect(pi.base).toBe('1 A ULA');

    const pa = parseInfoKelasNorm('1 A ULA (PA)');
    expect(pa.norm).toBe('1 A ULA PA');
    expect(pa.gender).toBe('PA');
    expect(pa.base).toBe('1 A ULA');

    const noGender = parseInfoKelasNorm('1 A ULA');
    expect(noGender.norm).toBe('1 A ULA');
    expect(noGender.gender).toBe('');
    expect(noGender.base).toBe('1 A ULA');
  });

  it('isInfoKelasCocok strictly isolates PA from PI slots', () => {
    const slotPI = parseInfoKelasNorm('1 A ULA (PI) (Asrama Al-Barokah)');
    const targetPA = parseInfoKelasNorm('1 A ULA (PA)');
    const targetPI = parseInfoKelasNorm('1 A ULA (PI)');

    // Slot PI must NEVER match class PA
    expect(isInfoKelasCocok(slotPI, targetPA)).toBe(false);
    expect(isSlotMilikKelas('1 A ULA (PI)', '1 A ULA (PA)')).toBe(false);

    // Slot PI matches class PI
    expect(isInfoKelasCocok(slotPI, targetPI)).toBe(true);
    expect(isSlotMilikKelas('1 A ULA (PI) (Asrama Al-Barokah)', '1 A ULA (PI)')).toBe(true);

    // Slot PA must NEVER match class PI
    expect(isSlotMilikKelas('1 A ULA (PA)', '1 A ULA (PI)')).toBe(false);
  });

  it('isInfoKelasCocok resolves legacy untagged slots using teacher gender', () => {
    const slotLegacy = parseInfoKelasNorm('1 A ULA');
    const targetPI = parseInfoKelasNorm('1 A ULA (PI)');
    const targetPA = parseInfoKelasNorm('1 A ULA (PA)');

    // Untagged slot matches PI only if teacher is PI
    expect(isInfoKelasCocok(slotLegacy, targetPI, 'PI')).toBe(true);
    expect(isInfoKelasCocok(slotLegacy, targetPI, 'PA')).toBe(false);

    // Untagged slot matches PA only if teacher is PA
    expect(isInfoKelasCocok(slotLegacy, targetPA, 'PA')).toBe(true);
    expect(isInfoKelasCocok(slotLegacy, targetPA, 'PI')).toBe(false);
  });

  it('removeSlotFromGuruObj deletes only the targeted gender slot', () => {
    const guruRow: TeacherJadwalRow = {
      nama_asatidz: 'USTADZAH KUNI',
      sabtu: 'Jam 1 | Fiqih | 1 A ULA (PI) (Al-Barokah)\nJam 2 | Fiqih | 1 A ULA (PA)',
    };

    // Remove only PI slot
    removeSlotFromGuruObj(guruRow, 'sabtu', 1, '1 A ULA (PI)', 'PI');

    expect(guruRow.sabtu).not.toContain('1 A ULA (PI)');
    expect(guruRow.sabtu).toContain('Jam 2 | Fiqih | 1 A ULA (PA)');

    // Attempting to remove PA with target PI should not affect PA slot
    removeSlotFromGuruObj(guruRow, 'sabtu', 2, '1 A ULA (PI)', 'PI');
    expect(guruRow.sabtu).toContain('Jam 2 | Fiqih | 1 A ULA (PA)');
  });

  it('buildMasterStrukturKelasKBM assigns slot to Putri class without Putra collision', () => {
    const formasiList: Formasi[] = [
      {
        id: '1',
        tingkat: 'ULA',
        din_kls: '1',
        din_bag: 'A',
        pa_pi: 'PA',
        lokasi_diniyyah: 'Ruang PA 01',
        kapasitas_maksimal: 40,
      },
      {
        id: '2',
        tingkat: 'ULA',
        din_kls: '1',
        din_bag: 'A',
        pa_pi: 'PI',
        lokasi_diniyyah: 'Ruang PI 01',
        kapasitas_maksimal: 40,
      },
    ];

    const asatidzList: Asatidz[] = [
      {
        id: '10',
        nia: '10',
        nama_asatidz: "KUNI NAFI'AH",
        pa_pi: 'PI',
      },
      {
        id: '20',
        nia: '20',
        nama_asatidz: 'AHMAD ZAINI',
        pa_pi: 'PA',
      },
    ];

    const jadwalMap: Record<string, TeacherJadwalRow> = {
      "KUNI NAFI'AH": {
        nama_asatidz: "KUNI NAFI'AH",
        sabtu: "Jam 1 | Mabadi' Fiqih Juz 1 | 1 A ULA (PI) (Ruang PI 01)",
        totalJam: 1,
      },
    };

    const struktur = buildMasterStrukturKelasKBM(formasiList, asatidzList, jadwalMap);

    expect(struktur).toHaveLength(2);

    const kelasPA = struktur.find((k) => k.papi === 'PA');
    const kelasPI = struktur.find((k) => k.papi === 'PI');

    expect(kelasPA).toBeDefined();
    expect(kelasPI).toBeDefined();

    // PA class must have NO schedule on Sabtu Jam 1
    const sesiSabtuJam1PA = kelasPA!.jadwal['Sabtu']?.[1] || [];
    expect(sesiSabtuJam1PA).toHaveLength(0);

    // PI class must receive Kuni Nafi'ah schedule
    const sesiSabtuJam1PI = kelasPI!.jadwal['Sabtu']?.[1] || [];
    expect(sesiSabtuJam1PI).toHaveLength(1);
    expect(sesiSabtuJam1PI[0].guru).toBe("KUNI NAFI'AH");
    expect(sesiSabtuJam1PI[0].fanAsli).toBe("Mabadi' Fiqih Juz 1");
  });

  describe('Urutan Default Baris Tabel Jadwal KBM (4-Tier Sort)', () => {
    it('mengurutkan kelas sesuai hierarki: Tingkat -> Angka Kelas -> Putra(PA) -> Putri(PI) -> Bagian', () => {
      const rawClasses = [
        { tingkat: 'ULA', kls: '2', bag: 'B', papi: 'PI', key: '2 B ULA PI' },
        { tingkat: 'ULA', kls: '1', bag: 'B', papi: 'PA', key: '1 B ULA PA' },
        { tingkat: 'ULA', kls: '2', bag: 'A', papi: 'PA', key: '2 A ULA PA' },
        { tingkat: 'ULA', kls: '1', bag: 'A', papi: 'PI', key: '1 A ULA PI' },
        { tingkat: 'ULA', kls: '1', bag: 'C', papi: 'PA', key: '1 C ULA PA' },
        { tingkat: 'ULA', kls: '1', bag: 'A', papi: 'PA', key: '1 A ULA PA' },
        { tingkat: 'ULA', kls: '2', bag: 'B', papi: 'PA', key: '2 B ULA PA' },
        { tingkat: 'ULA', kls: '3', bag: 'A', papi: 'PI', key: '3 A ULA PI' },
        { tingkat: 'ULA', kls: '1', bag: 'B', papi: 'PI', key: '1 B ULA PI' },
        { tingkat: 'ULA', kls: '4', bag: 'A', papi: 'PA', key: '4 A ULA PA' },
        { tingkat: 'ULA', kls: '2', bag: 'A', papi: 'PI', key: '2 A ULA PI' },
        { tingkat: 'ULA', kls: '3', bag: 'A', papi: 'PA', key: '3 A ULA PA' },
        { tingkat: 'ULA', kls: '4', bag: 'A', papi: 'PI', key: '4 A ULA PI' },
      ];

      rawClasses.sort(bandingkanUrutanKelasKBM);

      const sortedKeys = rawClasses.map((c) => c.key);
      expect(sortedKeys).toEqual([
        '1 A ULA PA',
        '1 B ULA PA',
        '1 C ULA PA',
        '1 A ULA PI',
        '1 B ULA PI',
        '2 A ULA PA',
        '2 B ULA PA',
        '2 A ULA PI',
        '2 B ULA PI',
        '3 A ULA PA',
        '3 A ULA PI',
        '4 A ULA PA',
        '4 A ULA PI',
      ]);
    });
  });

  describe('dapatkanBlokDariSesiMengajar - Pemetaan Hierarki Diniyyah Tanpa Kamar Guru', () => {
    const mockHierarki: HierarkiBlokKBMConfig = {
      diniyyah: [
        {
          namaBlok: 'Blok 1',
          lokasiList: ['Ruang A-01', 'Ruang A-02'],
        },
        {
          namaBlok: 'Blok Induk',
          lokasiList: ['Aula Utama', 'Musholla Pusat'],
        },
      ],
      takror: [
        {
          namaBlok: 'Blok Takror Asrama',
          lokasiList: ['Serambi Asrama'],
        },
      ],
    };

    const mockFormasiList: Formasi[] = [
      {
        id: 'f1',
        tingkat: 'ULA',
        din_kls: '1',
        din_bag: 'A',
        pa_pi: 'PA',
        lokasi_diniyyah: 'Ruang A-01',
        blok_diniyyah: 'Blok 1',
      },
      {
        id: 'f2',
        tingkat: 'ULA',
        din_kls: '1',
        din_bag: 'B',
        pa_pi: 'PA',
        lokasi_diniyyah: 'Aula Utama',
        // blok_diniyyah sengaja kosong untuk uji pemetaan hierarki dari lokasi
      },
    ];

    const mockAsatidzKamarPribadi: Asatidz = {
      nia: 'A001',
      nama_asatidz: 'Ustadz Ahmad',
      pa_pi: 'PA',
      blok: 'Kamar Asrama 10', // Kamar asrama pribadi guru (BUKAN blok KBM santri)
    };

    it('1. mengutamakan blok_diniyyah langsung dari Formasi Kelas', () => {
      const blok = dapatkanBlokDariSesiMengajar(
        [{ kelas: '1 A ULA (PA)', lokasi: 'Ruang A-01' }],
        mockAsatidzKamarPribadi,
        mockFormasiList,
        [],
        mockHierarki
      );
      expect(blok).toBe('Blok 1');
    });

    it('2. memetakan blok dari Hierarki Lokasi Diniyyah saat blok di formasi kosong', () => {
      const blok = dapatkanBlokDariSesiMengajar(
        [{ kelas: '1 B ULA (PA)', lokasi: 'Aula Utama' }],
        mockAsatidzKamarPribadi,
        mockFormasiList,
        [],
        mockHierarki
      );
      expect(blok).toBe('Blok Induk');
    });

    it('3. TIDAK melakukan fallback ke kamar domisili asrama asatidz (hilangkan kerancuan)', () => {
      // Kelas yang tidak terdaftar di formasi dan tidak ada di hierarki
      const blok = dapatkanBlokDariSesiMengajar(
        [{ kelas: 'Kelas Tidak Terdaftar', lokasi: 'Lokasi Asing' }],
        mockAsatidzKamarPribadi,
        mockFormasiList,
        [],
        mockHierarki
      );
      // Harus Belum Diatur, BUKAN 'Kamar Asrama 10'
      expect(blok).toBe('Belum Diatur');
    });
  });

  describe('Fitur Gabung Kelas (Multi-Class Teaching at Same Slot)', () => {
    it('1. addSlotToGuruObj mendukung multi-kelas gabung di jam yang sama tanpa menimpa kelas lain', () => {
      const guruRow: JadwalAsatidzRow = {
        nama_asatidz: 'UST. AHMAD DIMYATI',
        selasa: 'Jam 1 | Hadits | 2 A WUSTHO (PI)',
      };

      // Tambahkan kelas 2 B WUSTHO (PI) di Selasa Jam 1 (Gabung Kelas)
      addSlotToGuruObj(guruRow, 'Selasa', 1, 'Hadits', '2 B WUSTHO (PI)');

      const slots = parseJadwalCell_Client(guruRow.selasa);
      expect(slots).toHaveLength(2);
      expect(slots[0]).toMatchObject({ jam: 1, fan: 'Hadits', lokasi: '2 A WUSTHO (PI)' });
      expect(slots[1]).toMatchObject({ jam: 1, fan: 'Hadits', lokasi: '2 B WUSTHO (PI)' });
    });

    it('2. addSlotToGuruObj menimpa slot jika kelasnya sama persis pada jam tersebut', () => {
      const guruRow: JadwalAsatidzRow = {
        nama_asatidz: 'UST. AHMAD DIMYATI',
        selasa: 'Jam 1 | Hadits | 2 A WUSTHO (PI)\nJam 1 | Hadits | 2 B WUSTHO (PI)',
      };

      // Update fan untuk 2 B WUSTHO (PI) di jam 1
      addSlotToGuruObj(guruRow, 'Selasa', 1, 'Fiqih', '2 B WUSTHO (PI)');

      const slots = parseJadwalCell_Client(guruRow.selasa);
      expect(slots).toHaveLength(2);
      expect(slots[0]).toMatchObject({ jam: 1, fan: 'Hadits', lokasi: '2 A WUSTHO (PI)' });
      expect(slots[1]).toMatchObject({ jam: 1, fan: 'Fiqih', lokasi: '2 B WUSTHO (PI)' });
    });

    it('3. removeSlotFromGuruObj hanya menghapus kelas yang ditargetkan, menjaga kelas gabungan lainnya', () => {
      const guruRow: JadwalAsatidzRow = {
        nama_asatidz: 'UST. AHMAD DIMYATI',
        selasa: 'Jam 1 | Hadits | 2 A WUSTHO (PI)\nJam 1 | Hadits | 2 B WUSTHO (PI)',
      };

      // Hapus slot kelas 2 B WUSTHO (PI)
      removeSlotFromGuruObj(guruRow, 'Selasa', 1, '2 B WUSTHO (PI)');

      const slots = parseJadwalCell_Client(guruRow.selasa);
      expect(slots).toHaveLength(1);
      expect(slots[0]).toMatchObject({ jam: 1, fan: 'Hadits', lokasi: '2 A WUSTHO (PI)' });
    });

    it('4. syncGuruMengajarAndTotalObj menghitung jam kehadiran unik dan mencatat semua kelas gabungan', () => {
      const guruRow: JadwalAsatidzRow = {
        nama_asatidz: 'UST. AHMAD DIMYATI',
        selasa: 'Jam 1 | Hadits | 2 A WUSTHO (PI)\nJam 1 | Hadits | 2 B WUSTHO (PI)\nJam 2 | Hadits | 2 A WUSTHO (PI)\nJam 2 | Hadits | 2 B WUSTHO (PI)',
      };

      syncGuruMengajarAndTotalObj(guruRow);

      // Jam 1 dan Jam 2 masing-masing digabung, jadi kehadiran fisik adalah 2 Jam
      expect(guruRow.totalJam).toBe('2');
      // Kolom mengajar harus memuat kedua kelas
      expect(guruRow.mengajar).toContain('2 A WUSTHO');
      expect(guruRow.mengajar).toContain('2 B WUSTHO');
    });
  });
});
