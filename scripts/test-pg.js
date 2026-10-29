const { Client } = require('pg');

async function testConnection() {
  const directUrl = 'postgresql://postgres:AdminBlokagung123!@db.rdeaouthjemxggvutctl.supabase.co:5432/postgres';
  const poolerUrl = 'postgresql://postgres.rdeaouthjemxggvutctl:AdminBlokagung123!@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

  console.log('Testing direct connection...');
  try {
    const client = new Client({ connectionString: directUrl, ssl: { rejectUnauthorized: false } });
    await client.connect();
    const res = await client.query('SELECT current_database(), current_user, version();');
    console.log('Direct connection SUCCESS:', res.rows[0]);
    await client.end();
    return directUrl;
  } catch (err) {
    console.log('Direct connection failed:', err.message);
  }

  console.log('Testing pooler connection...');
  try {
    const client = new Client({ connectionString: poolerUrl, ssl: { rejectUnauthorized: false } });
    await client.connect();
    const res = await client.query('SELECT current_database(), current_user, version();');
    console.log('Pooler connection SUCCESS:', res.rows[0]);
    await client.end();
    return poolerUrl;
  } catch (err) {
    console.log('Pooler connection failed:', err.message);
  }

  throw new Error('All connection attempts failed');
}

testConnection().catch(console.error);
