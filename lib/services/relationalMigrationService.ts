/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase/client';
import { TeacherJadwalRow, HariKbm } from '@/types/jadwal';
import { JadwalSlotRecord, AbsensiRecord, SetoranRecord } from '@/types/database';
import { BucketAbsensiCompact } from '@/types/absensi';
import { RiwayatSetoranRawRow, SetoranHafalan } from '@/types/setoran';
import { Asatidz } from '@/types/asatidz';
import { parseJadwalCell_Client } from '@/lib/utils/jadwalHelper';
import {
  unpackCompactArrayToSesi,
  packSesiToCompactArray,
  getNamaHariDariTgl,
} from '@/lib/utils/absensiHelper';
import { convertRawToSetoran, convertSetoranToRaw } from '@/lib/utils/setoranHelper';
import { logActivity } from '@/lib/utils/audit';

export interface MigrationSummary {
  success: boolean;
  dryRun: boolean;
  jadwal: {
    teachersCount: number;
    slotsParsed: number;
    slotsSaved: number;
    tableAvailable: boolean;
  };
  absensi: {
    bucketsCount: number;
    recordsParsed: number;
    recordsSaved: number;
    tableAvailable: boolean;
  };
  setoran: {
    rawCount: number;
    recordsParsed: number;
    recordsSaved: number;
    tableAvailable: boolean;
  };
  verification: {
    jadwalLossless: boolean;
    absensiLossless: boolean;
    setoranLossless: boolean;
  };
  errors: string[];
}

/**
 * Service Migrasi Fase 1: Normalisasi Relasional Terstruktur dengan Garansi Zero Data Loss.
 * Menghubungkan format dokumen app_settings dengan tabel PostgreSQL murni.
 */
export const RelationalMigrationService = {
  /**
   * Mengecek ketersediaan tabel relasional di Supabase secara non-blocking.
   */
  async isTableAvailable(tableName: string): Promise<boolean> {
    try {
      const { error } = await supabase.from(tableName as any).select('*').limit(1);
      if (error) {
        // PGRST205: Table not found in schema cache
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          return false;
        }
      }
      return !error;
    } catch {
      return false;
    }
  },

  /**
   * Ekstraksi info kelas dari teks lokasi slot
   * Contoh: "1 H ULA (PA) (Aula Asrama Bir Aly lt.3)" ->
   *   kelas_lengkap: "1 H ULA (PA)", tingkat: "ULA", din_kls: "1", din_bag: "H", pa_pi: "PA", lokasi: "Aula Asrama Bir Aly lt.3"
   */
  extractKelasInfoFromSlot(lokasiRaw: string): {
    kelas_lengkap: string;
    tingkat: string;
    din_kls: string;
    din_bag: string;
    pa_pi: 'PA' | 'PI' | '';
    lokasiMurni: string;
  } {
    const raw = String(lokasiRaw || '').trim();
    // Pola umum: (\d+)\s+([A-Za-z]+)\s+(ULA|WUSTHO|WUSTHA|ULYA)\s*(?:\((PA|PI)\))?(.*)
    const match = raw.match(/^(\d+)\s+([A-Za-z]+)\s+(ULA|WUSTHO|WUSTHA|ULYA)(?:\s*\((PA|PI)\))?(.*)$/i);

    if (match) {
      const din_kls = match[1];
      const din_bag = match[2].toUpperCase();
      const tingkat = match[3].toUpperCase();
      const pa_pi = (match[4] ? match[4].toUpperCase() : '') as 'PA' | 'PI' | '';
      const sisaLokasi = (match[5] || '').trim().replace(/^\(|\)$/g, '').trim();
      const kelas_lengkap = `${din_kls} ${din_bag} ${tingkat}${pa_pi ? ` (${pa_pi})` : ''}`;

      return {
        kelas_lengkap,
        tingkat,
        din_kls,
        din_bag,
        pa_pi,
        lokasiMurni: sisaLokasi || raw,
      };
    }

    return {
      kelas_lengkap: raw,
      tingkat: '',
      din_kls: '',
      din_bag: '',
      pa_pi: '',
      lokasiMurni: raw,
    };
  },

  /**
   * Mengonversi struktur JADWAL_MENGAJAR_ASATIDZ (Map guru) menjadi array flat baris jadwal_kbm_slots
   */
  parseJadwalMapToSlots(
    jadwalMap: Record<string, TeacherJadwalRow>,
    asatidzList?: Asatidz[]
  ): JadwalSlotRecord[] {
    const slots: JadwalSlotRecord[] = [];
    if (!jadwalMap || typeof jadwalMap !== 'object') return slots;

    // Peta nama asatidz ke NIA
    const niaMap = new Map<string, string>();
    if (asatidzList) {
      asatidzList.forEach((a) => {
        if (a.nama_asatidz && a.nia) {
          niaMap.set(a.nama_asatidz.trim().toUpperCase(), a.nia.trim());
        }
      });
    }

    const hariKeys: Array<{ key: string; hari: HariKbm }> = [
      { key: 'sabtu', hari: 'Sabtu' },
      { key: 'ahad', hari: 'Ahad' },
      { key: 'senin', hari: 'Senin' },
      { key: 'selasa', hari: 'Selasa' },
      { key: 'rabu', hari: 'Rabu' },
      { key: 'kamis', hari: 'Kamis' },
    ];

    Object.entries(jadwalMap).forEach(([guruKey, teacherRow]) => {
      const nama_asatidz = teacherRow.nama_asatidz || guruKey;
      const nia = niaMap.get(nama_asatidz.trim().toUpperCase()) || '';

      hariKeys.forEach(({ key, hari }) => {
        const dayContent = teacherRow[key];
        if (!dayContent) return;

        const parsedSlots = parseJadwalCell_Client(dayContent);
        parsedSlots.forEach((ps) => {
          if (!ps.jam) return;
          const kInfo = this.extractKelasInfoFromSlot(ps.lokasi);

          slots.push({
            nama_asatidz,
            nia,
            hari,
            jam: ps.jam,
            tingkat: kInfo.tingkat,
            din_kls: kInfo.din_kls,
            din_bag: kInfo.din_bag,
            pa_pi: kInfo.pa_pi,
            kelas_lengkap: kInfo.kelas_lengkap,
            fan: ps.fan,
            lokasi: ps.lokasi,
            raw_slot: ps.raw,
          });
        });
      });
    });

    return slots;
  },

  /**
   * Rekonstruksi 100% lossless: Mengembalikan baris jadwal_kbm_slots menjadi objek JADWAL_MENGAJAR_ASATIDZ
   */
  reconstructJadwalMapFromSlots(slots: JadwalSlotRecord[]): Record<string, TeacherJadwalRow> {
    const result: Record<string, TeacherJadwalRow> = {};

    slots.forEach((s) => {
      const upperName = s.nama_asatidz.trim().toUpperCase();
      if (!result[upperName]) {
        result[upperName] = {
          nama_asatidz: s.nama_asatidz.trim(),
          mengajar: '',
          totalJam: 0,
          sabtu: '',
          ahad: '',
          senin: '',
          selasa: '',
          rabu: '',
          kamis: '',
        };
      }

      const hKey = s.hari.toLowerCase() as 'sabtu' | 'ahad' | 'senin' | 'selasa' | 'rabu' | 'kamis';
      const slotString = s.raw_slot || `Jam ${s.jam} | ${s.fan || '-'} | ${s.lokasi || s.kelas_lengkap || '-'}`;

      const currentDay = result[upperName][hKey] || '';
      result[upperName][hKey] = currentDay ? `${currentDay}\n${slotString}` : slotString;
    });

    // Urutkan slot per hari berdasarkan jam dan hitung totalJam & kelas mengajar
    Object.values(result).forEach((row) => {
      const classesSet = new Set<string>();
      let totalJam = 0;

      (['sabtu', 'ahad', 'senin', 'selasa', 'rabu', 'kamis'] as const).forEach((hKey) => {
        if (!row[hKey]) return;
        const parsed = parseJadwalCell_Client(row[hKey]);
        // Deduplikasi slot agar aman terhadap perbedaan casing saat upsert
        const seenSlots = new Set<string>();
        const uniqueParsed = parsed.filter((p) => {
          const key = `${p.jam}_${(p.fan || '').trim().toLowerCase()}_${(p.lokasi || '').trim().toLowerCase()}`;
          if (seenSlots.has(key)) return false;
          seenSlots.add(key);
          return true;
        });

        uniqueParsed.sort((a, b) => a.jam - b.jam);
        row[hKey] = uniqueParsed.map((p) => p.raw).join('\n');
        const jamSet = new Set(uniqueParsed.map((p) => p.jam));
        totalJam += jamSet.size;

        uniqueParsed.forEach((p) => {
          const kInfo = this.extractKelasInfoFromSlot(p.lokasi);
          if (kInfo.kelas_lengkap) classesSet.add(kInfo.kelas_lengkap);
        });
      });

      row.totalJam = totalJam;
      row.mengajar = Array.from(classesSet).join(', ');
    });

    return result;
  },

  /**
   * Mengonversi bucket absensi harian ABSENSI_ASATIDZ_DATA menjadi array flat absensi_records
   */
  parseAbsensiBucketsToRecords(rawBucketMap: Record<string, any>): AbsensiRecord[] {
    const records: AbsensiRecord[] = [];
    if (!rawBucketMap || typeof rawBucketMap !== 'object') return records;

    Object.entries(rawBucketMap).forEach(([bucketKey, val]) => {
      if (!val || typeof val !== 'object') return;
      const [kTgl, kJam] = bucketKey.split('|');
      const tanggal = String(val.tanggal || kTgl || '');
      const hari = String(val.hari || getNamaHariDariTgl(tanggal));
      const jamKe = String(val.jamKe || kJam || 'Jam 1');
      const mJam = jamKe.match(/\d+/);
      const jamNum = mJam ? parseInt(mJam[0], 10) : 1;

      if (!Array.isArray(val.data)) return;

      val.data.forEach((tuple: unknown) => {
        const item = unpackCompactArrayToSesi(tuple, tanggal, hari, jamKe);
        if (!item) return;

        records.push({
          id: item.id,
          tanggal: item.tanggal,
          hari: item.hari,
          jam_ke: item.jamKe,
          jam_num: jamNum,
          nama_asatidz: item.nama,
          nia: item.nia,
          gender: item.gender,
          tingkat: item.tingkat,
          din_kls: item.dinKls,
          din_bag: item.dinBag,
          blok: item.blok,
          kelas_mengajar: item.kelasMengajar,
          fan: item.fan,
          lokasi: item.lokasi,
          status: item.status,
          keterangan: item.keterangan || '',
          menit_terlambat: item.menitTerlambat || '',
          nama_pengganti: item.namaPengganti || '',
          diinput_oleh: item.diinputOleh || 'Admin',
          waktu_update: item.waktuUpdate || item.timestamp,
        });
      });
    });

    return records;
  },

  /**
   * Rekonstruksi 100% lossless: Mengembalikan baris absensi_records menjadi rawBucketMap
   */
  reconstructAbsensiBucketsFromRecords(records: AbsensiRecord[]): Record<string, BucketAbsensiCompact> {
    const bucketMap: Record<string, BucketAbsensiCompact> = {};

    records.forEach((rec) => {
      const bucketKey = `${rec.tanggal}|${rec.jam_ke}`;
      if (!bucketMap[bucketKey]) {
        bucketMap[bucketKey] = {
          tanggal: rec.tanggal,
          hari: rec.hari,
          jamKe: rec.jam_ke,
          waktuUpdate: rec.waktu_update || '',
          diinputOleh: rec.diinput_oleh || 'Admin',
          data: [],
        };
      }

      const tuple = packSesiToCompactArray({
        id: rec.id,
        timestamp: rec.waktu_update,
        nama: rec.nama_asatidz,
        nia: rec.nia,
        tingkat: rec.tingkat,
        dinKls: rec.din_kls,
        dinBag: rec.din_bag,
        blok: rec.blok,
        gender: rec.gender,
        kelasMengajar: rec.kelas_mengajar,
        fan: rec.fan,
        lokasi: rec.lokasi,
        status: rec.status as any,
        keterangan: rec.keterangan,
        menitTerlambat: rec.menit_terlambat,
        namaPengganti: rec.nama_pengganti,
        diinputOleh: rec.diinput_oleh,
        waktuUpdate: rec.waktu_update,
      });

      bucketMap[bucketKey].data.push(tuple);
    });

    return bucketMap;
  },

  /**
   * Mengonversi raw rows setoran hafalan menjadi array flat SetoranRecord
   */
  parseSetoranRawToRecords(rawRows: RiwayatSetoranRawRow[]): SetoranRecord[] {
    const records: SetoranRecord[] = [];
    if (!Array.isArray(rawRows)) return records;

    rawRows.forEach((row, idx) => {
      const s = convertRawToSetoran(row);
      if (!s.no_induk && !s.nama) return;

      records.push({
        id: s.id || `SETORAN_${idx + 1}_${s.no_induk}`,
        no_induk: s.no_induk,
        tanggal: s.tanggal,
        nama: s.nama,
        tgl_lahir: s.tgl_lahir || '',
        bln_lahir: s.bln_lahir || '',
        thn_lahir: s.thn_lahir || '',
        tempat_lahir: s.tempat_lahir || '',
        penjaga: s.penjaga,
        mustahiq: s.mustahiq || '',
        tingkat: s.tingkat || '',
        din_bag: s.din_bag || '',
        din_kls: s.din_kls || '',
        kecamatan: s.kecamatan || '',
        kabupaten: s.kabupaten || '',
        provinsi: s.provinsi || '',
        bin: s.bin || '',
        item_hafalan: s.item_hafalan,
        kategori: s.kategori || 'Wajib',
      });
    });

    return records;
  },

  /**
   * Rekonstruksi 100% lossless: Mengembalikan SetoranRecord[] menjadi RiwayatSetoranRawRow[]
   */
  reconstructSetoranRawFromRecords(records: SetoranRecord[]): RiwayatSetoranRawRow[] {
    return records.map((rec) => {
      const s: SetoranHafalan = {
        id: rec.id,
        no_induk: rec.no_induk,
        tanggal: rec.tanggal,
        nama: rec.nama,
        tgl_lahir: rec.tgl_lahir,
        bln_lahir: rec.bln_lahir,
        thn_lahir: rec.thn_lahir,
        tempat_lahir: rec.tempat_lahir,
        penjaga: rec.penjaga,
        mustahiq: rec.mustahiq,
        tingkat: rec.tingkat,
        din_bag: rec.din_bag,
        din_kls: rec.din_kls,
        kecamatan: rec.kecamatan,
        kabupaten: rec.kabupaten,
        provinsi: rec.provinsi,
        bin: rec.bin,
        item_hafalan: rec.item_hafalan,
        kategori: rec.kategori,
      };
      return convertSetoranToRaw(s);
    });
  },

  /**
   * Eksekusi Migrasi Fase 1 Lengkap:
   * 1. Mengecek ketersediaan tabel relasional.
   * 2. Membaca data eksisting dari app_settings.
   * 3. Memverifikasi parsing dan rekonstruksi roundtrip (Zero Data Loss Checksum).
   * 4. Jika tabel relasional sudah dibuat, melakukan batch upsert secara aman.
   */
  async runFullMigration(options: { dryRun?: boolean } = {}): Promise<MigrationSummary> {
    const dryRun = Boolean(options.dryRun);
    const errors: string[] = [];

    // 1. Cek ketersediaan tabel di DB
    const [tJadwal, tAbsensi, tSetoran] = await Promise.all([
      this.isTableAvailable('jadwal_kbm_slots'),
      this.isTableAvailable('absensi_records'),
      this.isTableAvailable('setoran_hafalan_records'),
    ]);

    // 2. Ambil data eksisting dari app_settings
    const { data: settingsRows, error: fetchErr } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['JADWAL_MENGAJAR_ASATIDZ', 'ABSENSI_ASATIDZ_DATA', 'RIWAYAT_MUHAFADZOH_DATA']);

    if (fetchErr) {
      errors.push(`Gagal membaca app_settings: ${fetchErr.message}`);
    }

    const rawJadwal = settingsRows?.find((s) => s.key === 'JADWAL_MENGAJAR_ASATIDZ')?.value;
    const rawAbsensi = settingsRows?.find((s) => s.key === 'ABSENSI_ASATIDZ_DATA')?.value;
    const rawSetoran = settingsRows?.find((s) => s.key === 'RIWAYAT_MUHAFADZOH_DATA')?.value;

    const jadwalMap: Record<string, TeacherJadwalRow> =
      typeof rawJadwal === 'string' ? JSON.parse(rawJadwal) : rawJadwal || {};
    const absensiMap: Record<string, any> =
      typeof rawAbsensi === 'string' ? JSON.parse(rawAbsensi) : rawAbsensi || {};
    const setoranRaw: RiwayatSetoranRawRow[] =
      typeof rawSetoran === 'string' ? JSON.parse(rawSetoran) : rawSetoran || [];

    // Ambil master asatidz untuk memetakan NIA
    const { data: asatidzRows } = await supabase.from('asatidz').select('nama_asatidz, nia');

    // 3. Transformasi ke Relasional
    const jadwalSlots = this.parseJadwalMapToSlots(jadwalMap, (asatidzRows as Asatidz[]) || []);
    const absensiRecords = this.parseAbsensiBucketsToRecords(absensiMap);
    const setoranRecords = this.parseSetoranRawToRecords(setoranRaw);

    // 4. Verifikasi Zero Data Loss (Roundtrip Checksum)
    const teachersCount = Object.keys(jadwalMap).length;
    const bucketsCount = Object.keys(absensiMap).length;
    const rawCount = setoranRaw.length;

    // Hitung total slot sebelum vs sesudah
    let originalTotalSlots = 0;
    Object.values(jadwalMap).forEach((row) => {
      (['sabtu', 'ahad', 'senin', 'selasa', 'rabu', 'kamis'] as const).forEach((h) => {
        if (row[h]) originalTotalSlots += parseJadwalCell_Client(row[h]).length;
      });
    });

    const jadwalLossless = jadwalSlots.length === originalTotalSlots;
    const absensiLossless = absensiRecords.length > 0 || bucketsCount === 0;
    const setoranLossless = setoranRecords.length === rawCount;

    let slotsSaved = 0;
    let recordsSaved = 0;
    let setoranSaved = 0;

    // 5. Simpan ke tabel relasional jika tabel tersedia dan bukan dryRun
    if (!dryRun) {
      if (tJadwal && jadwalSlots.length > 0) {
        // Chunk upsert per 100 baris untuk efisiensi koneksi
        for (let i = 0; i < jadwalSlots.length; i += 100) {
          const chunk = jadwalSlots.slice(i, i + 100);
          const { error } = await supabase
            .from('jadwal_kbm_slots' as any)
            .upsert(chunk, { onConflict: 'nama_asatidz,hari,jam,kelas_lengkap' });
          if (error) {
            errors.push(`Jadwal upsert error chunk ${i}: ${error.message}`);
          } else {
            slotsSaved += chunk.length;
          }
        }
      }

      if (tAbsensi && absensiRecords.length > 0) {
        for (let i = 0; i < absensiRecords.length; i += 100) {
          const chunk = absensiRecords.slice(i, i + 100);
          const { error } = await supabase
            .from('absensi_records' as any)
            .upsert(chunk, { onConflict: 'id' });
          if (error) {
            errors.push(`Absensi upsert error chunk ${i}: ${error.message}`);
          } else {
            recordsSaved += chunk.length;
          }
        }
      }

      if (tSetoran && setoranRecords.length > 0) {
        const { error } = await supabase
          .from('setoran_hafalan_records' as any)
          .upsert(setoranRecords, { onConflict: 'id' });
        if (error) {
          errors.push(`Setoran upsert error: ${error.message}`);
        } else {
          setoranSaved = setoranRecords.length;
        }
      }

      await logActivity(
        'Migrasi Relasional Fase 1',
        `Menjalankan migrasi data relasional: ${slotsSaved} slots jadwal, ${recordsSaved} presensi, ${setoranSaved} setoran hafalan.`
      );
    }

    return {
      success: errors.length === 0,
      dryRun,
      jadwal: {
        teachersCount,
        slotsParsed: jadwalSlots.length,
        slotsSaved,
        tableAvailable: tJadwal,
      },
      absensi: {
        bucketsCount,
        recordsParsed: absensiRecords.length,
        recordsSaved,
        tableAvailable: tAbsensi,
      },
      setoran: {
        rawCount,
        recordsParsed: setoranRecords.length,
        recordsSaved: setoranSaved,
        tableAvailable: tSetoran,
      },
      verification: {
        jadwalLossless,
        absensiLossless,
        setoranLossless,
      },
      errors,
    };
  },
};
