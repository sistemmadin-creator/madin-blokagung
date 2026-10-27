import { Formasi } from '@/types/formasi';
import { Asatidz } from '@/types/asatidz';
import { FanConfigMap, FanPelajaranDetail } from '@/types/fan';
import { TeacherJadwalRow } from '@/types/jadwal';
import {
  parseFanItemString,
  isKelasUnggulan,
  getItemsKonfigFanKelas,
  URUTAN_TINGKAT,
  cekKategoriJahAsatidz,
} from './fanHelper';
import {
  parseJadwalCell_Client,
  ekstrakKelasMurniDariLokasi,
  ambilNamaFanSingkat,
  HARI_KEYS_LOWER,
} from './jadwalHelper';

export interface FanEntryRow {
  fan: string;
  kelas: string;
  tingkat: string;
  klsNum: number;
  isUg: boolean;
  kitab: string[];
}

/**
 * Membangun peta pengajar fan terpadu dari Fan Pelajaran (fanDetail.item)
 * DAN Jadwal KBM (jadwalMap).
 * Menjamin Mustahiq kelas Unggulan tidak menampilkan badge kelas reguler,
 * dan seluruh fan yang diajar di jadwal tampil lengkap.
 */
export function buildUnifiedTeacherMap(
  asatidzList: Asatidz[],
  fanDetail: FanPelajaranDetail,
  fanConfig: FanConfigMap,
  jadwalMap: Record<string, TeacherJadwalRow>,
  formasiList: Formasi[]
): Record<string, FanEntryRow[]> {
  const tempPeta: Record<string, Record<string, FanEntryRow>> = {};

  // Inisialisasi entri untuk semua asatidz
  (asatidzList || []).forEach((a) => {
    const n = String(a.nama_asatidz || '').trim().toUpperCase();
    if (n) tempPeta[n] = {};
  });

  // Himpunan asatidz yang bertugas sebagai Mustahiq di kelas Unggulan
  const unggulanMustahiqMap = new Map<string, { tingkat: string; klsNum: number; bag: string }>();
  (asatidzList || []).forEach((a) => {
    const n = String(a.nama_asatidz || '').trim().toUpperCase();
    const tkt = String(a.tingkat_asatidz || '').trim().toUpperCase();
    const kls = String(a.din_kls_asatidz || '').trim();
    const bag = String(a.din_bag_asatidz || '').trim().toUpperCase();
    if (!n || !tkt || !kls || !bag) return;

    const { isMS } = cekKategoriJahAsatidz(a.jah_asatidz);
    if (isMS && isKelasUnggulan(`${kls} ${bag} ${tkt}`, formasiList)) {
      unggulanMustahiqMap.set(n, { tingkat: tkt, klsNum: parseInt(kls, 10) || 0, bag });
    }
  });

  // 1. Ekstraksi dari Fan Pelajaran Detail (fanDetail.item)
  const items = fanDetail.item || {};
  Object.keys(items).forEach((itemKey) => {
    const idx = itemKey.indexOf('||');
    if (idx < 0) return;
    const kelasKey = itemKey.substring(0, idx).trim();
    const rawItem = itemKey.substring(idx + 2).trim();

    const daftarCfg = getItemsKonfigFanKelas(kelasKey, fanConfig);
    if (daftarCfg && !daftarCfg.includes(rawItem)) return;

    const det = items[itemKey] || {};
    const guru = Array.isArray(det.asatidz) ? det.asatidz : [];
    if (!guru.length) return;

    const parsed = parseFanItemString(rawItem);
    const namaFan = parsed.fan && parsed.fan !== '-' ? parsed.fan : parsed.mapel;
    const isUg = /\(Ug\)\s*$/i.test(kelasKey);
    const kelasBersih = kelasKey.replace(/\s*\(Ug\)\s*$/i, '').trim();
    const kelasLabel = isUg ? `${kelasBersih} Ug` : kelasBersih;
    const parts = kelasBersih.split(/\s+/);
    const tingkat = String(parts[parts.length - 1] || '').toUpperCase();
    const klsNum = parseInt(parts[0], 10) || 0;

    guru.forEach((g) => {
      const key = String(g || '').trim().toUpperCase();
      if (!key || !tempPeta[key]) return;

      // PENCEGAHAN BOCOR: Jika guru ini adalah Mustahiq kelas Unggulan untuk jenjang ini,
      // jangan masukkan entri dari kelas reguler ke dirinya!
      const ugInfo = unggulanMustahiqMap.get(key);
      if (ugInfo && !isUg && ugInfo.tingkat === tingkat && ugInfo.klsNum === klsNum) {
        return;
      }

      const ek = `${namaFan.toLowerCase()}|${kelasLabel.toLowerCase()}`;
      if (!tempPeta[key][ek]) {
        tempPeta[key][ek] = {
          fan: namaFan,
          kelas: kelasLabel,
          tingkat,
          klsNum,
          isUg,
          kitab: [],
        };
      }
      if (
        parsed.mapel &&
        parsed.mapel !== '-' &&
        !tempPeta[key][ek].kitab.includes(parsed.mapel)
      ) {
        tempPeta[key][ek].kitab.push(parsed.mapel);
      }
    });
  });

  // 2. Ekstraksi dari Jadwal KBM (jadwalMap)
  Object.keys(jadwalMap || {}).forEach((guruKey) => {
    const row = jadwalMap[guruKey];
    if (!row) return;

    const namaAsatidz = String(row.nama_asatidz || guruKey).trim().toUpperCase();
    if (!namaAsatidz || !tempPeta[namaAsatidz]) return;

    HARI_KEYS_LOWER.forEach((hKey) => {
      const cellVal = row[hKey];
      if (!cellVal) return;

      const slots = parseJadwalCell_Client(cellVal);
      slots.forEach((s) => {
        if (!s.fan || s.fan === '-' || !s.lokasi) return;

        // Ambil kelas murni tanpa ruang gedung
        const murniDenganGender = ekstrakKelasMurniDariLokasi(s.lokasi);
        // Hapus (PA) / (PI) untuk identifikasi kelas
        const kelasBersih = murniDenganGender.replace(/\s*\((PA|PI)\)\s*$/i, '').trim();
        const parts = kelasBersih.split(/\s+/);
        if (parts.length < 2) return;

        const klsNum = parseInt(parts[0], 10) || 0;
        const tingkat = String(parts[parts.length - 1] || '').toUpperCase();
        const isUg = isKelasUnggulan(kelasBersih, formasiList);
        const kelasLabel = isUg ? `${kelasBersih} Ug` : kelasBersih;

        // Parse fan & mapel
        const parsed = parseFanItemString(s.fan);
        let namaFan =
          parsed.fan && parsed.fan !== '-'
            ? parsed.fan
            : ambilNamaFanSingkat(s.fan, tingkat, String(klsNum), fanConfig);
        if (!namaFan || namaFan === '-') namaFan = s.fan.trim();

        // PENCEGAHAN BOCOR: Jika guru ini adalah Mustahiq kelas Unggulan untuk jenjang ini,
        // jangan masukkan kelas reguler ke dirinya!
        const ugInfo = unggulanMustahiqMap.get(namaAsatidz);
        if (ugInfo && !isUg && ugInfo.tingkat === tingkat && ugInfo.klsNum === klsNum) {
          return;
        }

        const ek = `${namaFan.toLowerCase()}|${kelasLabel.toLowerCase()}`;
        if (!tempPeta[namaAsatidz][ek]) {
          tempPeta[namaAsatidz][ek] = {
            fan: namaFan,
            kelas: kelasLabel,
            tingkat,
            klsNum,
            isUg,
            kitab: [],
          };
        }

        if (
          parsed.mapel &&
          parsed.mapel !== '-' &&
          !tempPeta[namaAsatidz][ek].kitab.includes(parsed.mapel)
        ) {
          tempPeta[namaAsatidz][ek].kitab.push(parsed.mapel);
        }
      });
    });
  });

  // 3. Subsumpsi Cerdas (Smart Subsumption) & Pengurutan Hasil per Asatidz
  // Jika seorang asatidz sudah memiliki penugasan di rombel spesifik (misal "Shorof (3 C ULA)"),
  // maka entri tingkat generik untuk fan yang sama pada jenjang itu ("Shorof (3 ULA)")
  // otomatis diserap/dieliminasi agar tidak terjadi penumpukan lencana ganda.
  const finalPeta: Record<string, FanEntryRow[]> = {};
  Object.keys(tempPeta).forEach((k) => {
    const rawList = Object.values(tempPeta[k]);

    // Kumpulkan seluruh fan spesifik rombel (bagian kelas >= 3 kata, misal "3 C ULA", "1 B ULA", "3 A ULA Ug")
    const specificFanGroups = new Set<string>();
    rawList.forEach((e) => {
      const cleanKelas = e.kelas.replace(/\s*Ug$/i, '').trim();
      const parts = cleanKelas.split(/\s+/);
      if (parts.length >= 3) {
        specificFanGroups.add(`${e.fan.toLowerCase()}|${e.tingkat.toUpperCase()}|${e.klsNum}`);
      }
    });

    // Saring entri: jika entri adalah tingkat generik (misal "3 ULA") dan sudah ada rombel spesifik untuk fan tersebut, serap!
    const filteredList = rawList.filter((e) => {
      const cleanKelas = e.kelas.replace(/\s*Ug$/i, '').trim();
      const parts = cleanKelas.split(/\s+/);
      if (parts.length < 3) {
        const groupKey = `${e.fan.toLowerCase()}|${e.tingkat.toUpperCase()}|${e.klsNum}`;
        if (specificFanGroups.has(groupKey)) {
          // Gabungkan informasi kitab ke entri spesifik terkait
          rawList.forEach((spec) => {
            const specClean = spec.kelas.replace(/\s*Ug$/i, '').trim();
            if (
              specClean.split(/\s+/).length >= 3 &&
              spec.fan.toLowerCase() === e.fan.toLowerCase() &&
              spec.tingkat.toUpperCase() === e.tingkat.toUpperCase() &&
              spec.klsNum === e.klsNum
            ) {
              e.kitab.forEach((ktb) => {
                if (!spec.kitab.includes(ktb)) spec.kitab.push(ktb);
              });
            }
          });
          return false; // Eliminasi entri generik yang redundant
        }
      }
      return true;
    });

    finalPeta[k] = filteredList.sort(
      (a, b) =>
        (URUTAN_TINGKAT[a.tingkat] || 99) - (URUTAN_TINGKAT[b.tingkat] || 99) ||
        a.klsNum - b.klsNum ||
        a.kelas.localeCompare(b.kelas, undefined, { numeric: true }) ||
        a.fan.localeCompare(b.fan)
    );
  });

  return finalPeta;
}

/**
 * Mensinkronkan seluruh jadwal mengajar yang aktif di Jadwal KBM ke Fan Detail
 * agar data tersimpan permanen di basis data.
 */
export function buildSyncJadwalToFanPayload(
  jadwalMap: Record<string, TeacherJadwalRow>,
  fanConfig: FanConfigMap,
  fanDetail: FanPelajaranDetail,
  formasiList: Formasi[]
): {
  updatedConfig: FanConfigMap;
  updatedDetail: FanPelajaranDetail;
  changesCount: number;
} {
  const cfg = JSON.parse(JSON.stringify(fanConfig || {})) as FanConfigMap;
  const det = JSON.parse(JSON.stringify(fanDetail || { kelas: {}, item: {} })) as FanPelajaranDetail;
  if (!det.item) det.item = {};
  if (!det.kelas) det.kelas = {};

  let changesCount = 0;

  Object.keys(jadwalMap || {}).forEach((guruKey) => {
    const row = jadwalMap[guruKey];
    if (!row) return;
    const namaGuru = String(row.nama_asatidz || guruKey).trim();
    if (!namaGuru) return;

    HARI_KEYS_LOWER.forEach((hKey) => {
      const cellVal = row[hKey];
      if (!cellVal) return;

      const slots = parseJadwalCell_Client(cellVal);
      slots.forEach((s) => {
        if (!s.fan || s.fan === '-' || !s.lokasi) return;

        const murniDenganGender = ekstrakKelasMurniDariLokasi(s.lokasi);
        const kelasBersih = murniDenganGender.replace(/\s*\((PA|PI)\)\s*$/i, '').trim();
        const parts = kelasBersih.split(/\s+/);
        if (parts.length < 2) return;

        const klsNum = parts[0];
        const tingkat = parts[parts.length - 1]?.toUpperCase();
        const isUg = isKelasUnggulan(kelasBersih, formasiList);

        const targetKelasKey = isUg ? `${kelasBersih} (Ug)` : `${klsNum} ${tingkat}`;
        if (!cfg[targetKelasKey]) {
          cfg[targetKelasKey] = [];
        }

        // Cari item yang cocok di cfg
        const parsed = parseFanItemString(s.fan);
        const fanShort =
          parsed.fan && parsed.fan !== '-'
            ? parsed.fan
            : ambilNamaFanSingkat(s.fan, tingkat, klsNum, cfg);

        let matchedRawItem = cfg[targetKelasKey].find((r) => {
          const p = parseFanItemString(r);
          return (
            r.toLowerCase() === s.fan.toLowerCase() ||
            p.fan.toLowerCase() === fanShort.toLowerCase() ||
            p.mapel.toLowerCase() === (parsed.mapel || s.fan).toLowerCase()
          );
        });

        // Bila belum ada di config target (misal Sorogan/Takror pada kelas Unggulan)
        if (!matchedRawItem) {
          matchedRawItem = parsed.fan !== '-' ? s.fan : `(${fanShort}) ${s.fan}`;
          cfg[targetKelasKey].push(matchedRawItem);
          changesCount++;
        }

        const itemKey = `${targetKelasKey}||${matchedRawItem}`;
        if (!det.item![itemKey]) {
          det.item![itemKey] = { pengajar: '', asatidz: [] };
        }
        if (!Array.isArray(det.item![itemKey].asatidz)) {
          det.item![itemKey].asatidz = [];
        }

        if (!det.item![itemKey].asatidz!.some((g) => g.trim().toUpperCase() === namaGuru.toUpperCase())) {
          det.item![itemKey].asatidz!.push(namaGuru);
          changesCount++;
        }
      });
    });
  });

  return {
    updatedConfig: cfg,
    updatedDetail: det,
    changesCount,
  };
}
