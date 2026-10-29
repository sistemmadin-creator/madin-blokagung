const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
let databaseUrl = '';
for (const line of envFile.split('\n')) {
  if (line.startsWith('DATABASE_URL=')) {
    databaseUrl = line.substring('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');
  }
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

const MAP_FAN_3B_TO_3A = {
  '(Fiqih) Fiqih': '(Fiqih) Matan Taqrib 1',
  '(Nahwu) Nahwu': '(Nahwu) Jurumiyyah {Al-Bayan}',
  '(Shorof) Shorof': '(Shorof) Tasrif Istilah',
  "(I'lal) I'lal": "(I'lal) Qowa'idul I'lal",
  '(Tauhid) Tauhid': '(Tauhid) Tahsilu Nailil Marom',
  '(Tarikh) Tarikh': '(Tarikh) Khulasoh Nurul Yaqin Juz III',
  "(Bandongan) Minhajul Muta'allim": '(Badongan) Badongan',
  '(Takror) Takror': '(Takror) Takror',
};

function normalisasiTingkat(tkt) {
  const t = String(tkt || '').trim().toUpperCase();
  if (t === 'IST' || t === "ISTI'DAD") return "ISTI'DAD";
  return t;
}

function resolveNewKelasKey(oldKey) {
  if (!/\(Ug\)\s*$/i.test(oldKey)) return oldKey;
  const clean = oldKey.replace(/\s*\(Ug\)\s*$/i, '').trim();
  const parts = clean.split(/\s+/);
  const klsNum = parts[0];
  const tkt = normalisasiTingkat(parts.slice(parts.length > 2 ? 2 : 1).join(' '));
  return `${klsNum} ${tkt} (Ug)`;
}

async function runMigration(isDryRun = true) {
  console.log(`=== START MIGRATION (DryRun: ${isDryRun}) ===`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch current settings
    const res = await client.query("SELECT key, value FROM app_settings WHERE key IN ('FAN_CONFIG', 'FAN_PELAJARAN_DETAIL')");
    const settingsMap = {};
    for (const r of res.rows) {
      settingsMap[r.key] = typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
    }

    const fanConfig = settingsMap['FAN_CONFIG'] || {};
    const fanDetail = settingsMap['FAN_PELAJARAN_DETAIL'] || { kelas: {}, item: {} };

    // Backup to local file just in case
    const backupDir = path.join(__dirname, '../backup');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const backupPath = path.join(backupDir, `fan_backup_${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(settingsMap, null, 2), 'utf-8');
    console.log(`Backup saved to ${backupPath}`);

    // --- MIGRATION: FAN_CONFIG ---
    const newFanConfig = {};
    // Keep all reguler keys intact
    for (const [k, v] of Object.entries(fanConfig)) {
      if (!/\(Ug\)\s*$/i.test(k)) {
        newFanConfig[k] = v;
      }
    }

    // Consolidated Unggulan keys:
    // 3 ULA (Ug) <- take from 3 A ULA (Ug)
    newFanConfig['3 ULA (Ug)'] = fanConfig['3 A ULA (Ug)'] || [
      '(Fiqih) Matan Taqrib 1',
      '(Shorof) Tasrif Istilah',
      '(Tauhid) Tahsilu Nailil Marom',
      "(I'lal) Qowa'idul I'lal",
      '(Nahwu) Jurumiyyah {Al-Bayan}',
      '(Tarikh) Khulasoh Nurul Yaqin Juz III',
      '(Badongan) Badongan',
      '(Takror) Takror',
    ];

    // 4 ULA (Ug) <- take from 4 A ULA (Ug)
    newFanConfig['4 ULA (Ug)'] = fanConfig['4 A ULA (Ug)'] || fanConfig['4 B ULA (Ug)'] || [];

    // 1 WUSTHO (Ug) <- take from 1 A WUSTHO (Ug)
    newFanConfig['1 WUSTHO (Ug)'] = fanConfig['1 A WUSTHO (Ug)'] || fanConfig['1 B WUSTHO (Ug)'] || [];

    // 2 WUSTHO (Ug) <- take from 2 A WUSTHO (Ug)
    newFanConfig['2 WUSTHO (Ug)'] = fanConfig['2 A WUSTHO (Ug)'] || [];

    // 1 ULYA (Ug) <- take from 1 A ULYA (Ug)
    newFanConfig['1 ULYA (Ug)'] = fanConfig['1 A ULYA (Ug)'] || [];

    console.log('\nNew FAN_CONFIG Keys:');
    for (const [k, v] of Object.entries(newFanConfig)) {
      if (k.includes('(Ug)')) {
        console.log(`  ${k} (${v.length} fan items)`);
      }
    }

    // --- MIGRATION: FAN_PELAJARAN_DETAIL ---
    const newFanDetail = {
      kelas: {},
      item: {},
    };

    // 1. Process kelas keterangan
    for (const [k, v] of Object.entries(fanDetail.kelas || {})) {
      const newKey = resolveNewKelasKey(k);
      if (!newFanDetail.kelas[newKey]) {
        newFanDetail.kelas[newKey] = v;
      } else if (v.keterangan && !newFanDetail.kelas[newKey].keterangan) {
        newFanDetail.kelas[newKey].keterangan = v.keterangan;
      }
    }

    // 2. Process items
    for (const [itemKey, itemVal] of Object.entries(fanDetail.item || {})) {
      const idx = itemKey.indexOf('||');
      if (idx < 0) continue;
      const kelasKey = itemKey.substring(0, idx).trim();
      let rawItem = itemKey.substring(idx + 2).trim();

      if (!/\(Ug\)\s*$/i.test(kelasKey)) {
        // Reguler item, keep as is
        newFanDetail.item[itemKey] = itemVal;
      } else {
        // Unggulan item
        let targetRawItem = rawItem;
        if (kelasKey.includes('3 B ULA') && MAP_FAN_3B_TO_3A[rawItem]) {
          targetRawItem = MAP_FAN_3B_TO_3A[rawItem];
        }

        const newKelasKey = resolveNewKelasKey(kelasKey);
        const newItemKey = `${newKelasKey}||${targetRawItem}`;

        if (!newFanDetail.item[newItemKey]) {
          newFanDetail.item[newItemKey] = {
            jam: itemVal.jam || '',
            pengajar: itemVal.pengajar || '',
            asatidz: Array.isArray(itemVal.asatidz) ? [...itemVal.asatidz] : [],
          };
        } else {
          // Merge
          const existing = newFanDetail.item[newItemKey];
          if (!existing.jam && itemVal.jam) existing.jam = itemVal.jam;
          if (!existing.pengajar && itemVal.pengajar) existing.pengajar = itemVal.pengajar;
          if (Array.isArray(itemVal.asatidz)) {
            itemVal.asatidz.forEach((guru) => {
              if (guru && !existing.asatidz.includes(guru)) {
                existing.asatidz.push(guru);
              }
            });
          }
        }
      }
    }

    const ugItemsCount = Object.keys(newFanDetail.item).filter(k => k.includes('(Ug)')).length;
    console.log(`\nNew FAN_PELAJARAN_DETAIL consolidated Ug items count: ${ugItemsCount}`);
    for (const [k, v] of Object.entries(newFanDetail.item)) {
      if (k.includes('(Ug)')) {
        console.log(`  ${k} => jam: "${v.jam || ''}", pengajar: "${v.pengajar || ''}", asatidz: [${(v.asatidz || []).join(', ')}]`);
      }
    }

    if (!isDryRun) {
      await client.query("UPDATE app_settings SET value = $1 WHERE key = 'FAN_CONFIG'", [JSON.stringify(newFanConfig)]);
      await client.query("UPDATE app_settings SET value = $1 WHERE key = 'FAN_PELAJARAN_DETAIL'", [JSON.stringify(newFanDetail)]);
      await client.query('COMMIT');
      console.log('\n>>> MIGRATION COMMITTED SUCCESSFULLY TO SUPABASE! <<<');
    } else {
      await client.query('ROLLBACK');
      console.log('\n>>> DRY RUN COMPLETED (NO CHANGES COMMITTED) <<<');
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

const isDryRun = process.argv.includes('--execute') ? false : true;
runMigration(isDryRun);
