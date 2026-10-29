/**
 * Supabase CLI CRUD Helper
 * Digunakan untuk eksekusi CRUD langsung via CLI/Script
 * 
 * Penggunaan:
 * node scripts/supabase-crud.js query <table_name> [options_json]
 * node scripts/supabase-crud.js insert <table_name> <record_json>
 * node scripts/supabase-crud.js update <table_name> <filter_field> <filter_val> <record_json>
 * node scripts/supabase-crud.js delete <table_name> <filter_field> <filter_val>
 * node scripts/supabase-crud.js count <table_name>
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.resolve(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('.env.local file not found');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

if (!urlMatch || !keyMatch) {
  console.error('Kredensial Supabase tidak ditemukan di .env.local');
  process.exit(1);
}

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function run() {
  const [,, action, table, arg1, arg2, arg3] = process.argv;

  if (!action || !table) {
    console.log('Perintah tidak lengkap.');
    console.log('Action yang tersedia: query, insert, update, delete, count');
    process.exit(0);
  }

  try {
    switch (action.toLowerCase()) {
      case 'count': {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) throw error;
        console.log(`Total record di tabel '${table}': ${count}`);
        break;
      }

      case 'query': {
        let opts = {};
        if (arg1) {
          try {
            opts = JSON.parse(arg1);
          } catch {
            console.error('arg1 harus JSON format: {"select": "*", "limit": 10, "filter": {"kolom": "nilai"}}');
            process.exit(1);
          }
        }
        let query = supabase.from(table).select(opts.select || '*');
        if (opts.filter) {
          Object.entries(opts.filter).forEach(([k, v]) => {
            query = query.eq(k, v);
          });
        }
        if (opts.order) {
          query = query.order(opts.order.column, { ascending: opts.order.ascending ?? true });
        }
        if (opts.limit) {
          query = query.limit(opts.limit);
        } else {
          query = query.limit(20);
        }
        const { data, error } = await query;
        if (error) throw error;
        console.log(JSON.stringify(data, null, 2));
        break;
      }

      case 'insert': {
        if (!arg1) {
          console.error('Record JSON wajib diisi.');
          process.exit(1);
        }
        const payload = JSON.parse(arg1);
        const { data, error } = await supabase.from(table).insert(payload).select();
        if (error) throw error;
        console.log('Berhasil insert:', JSON.stringify(data, null, 2));
        break;
      }

      case 'update': {
        const filterCol = arg1;
        const filterVal = arg2;
        const payload = JSON.parse(arg3 || '{}');
        if (!filterCol || !filterVal || !arg3) {
          console.error('Format: update <table_name> <filter_col> <filter_val> <update_json>');
          process.exit(1);
        }
        const { data, error } = await supabase.from(table).update(payload).eq(filterCol, filterVal).select();
        if (error) throw error;
        console.log('Berhasil update:', JSON.stringify(data, null, 2));
        break;
      }

      case 'delete': {
        const filterCol = arg1;
        const filterVal = arg2;
        if (!filterCol || !filterVal) {
          console.error('Format: delete <table_name> <filter_col> <filter_val>');
          process.exit(1);
        }
        const { data, error } = await supabase.from(table).delete().eq(filterCol, filterVal).select();
        if (error) throw error;
        console.log('Berhasil delete:', JSON.stringify(data, null, 2));
        break;
      }

      default:
        console.error(`Action '${action}' tidak dikenal.`);
        process.exit(1);
    }
  } catch (err) {
    console.error('Error Supabase CRUD:', err.message);
    process.exit(1);
  }
}

run();
