const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const INITIAL_USERS = [
  {
    id: '11111111-1111-4111-8111-111111111101',
    username: 'admin',
    email: 'admin@madinblokagung.local',
    password: process.env.ADMIN_INITIAL_PASSWORD || 'Madina@1951',
    fullName: 'Master Administrator',
    role: 'master_admin',
    roleLabel: 'Master Admin',
  },
  {
    id: '11111111-1111-4111-8111-111111111102',
    username: 'kurikulum',
    email: 'kurikulum@madinblokagung.local',
    password: process.env.KURIKULUM_INITIAL_PASSWORD || 'Kurikulum@1951',
    fullName: 'PKM. Kurikulum',
    role: 'pkm_kurikulum',
    roleLabel: 'PKM. Kurikulum',
  },
];

async function run() {
  const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
  const dbMatch = envContent.match(/DATABASE_URL=(.*)/);
  if (!dbMatch) {
    throw new Error('DATABASE_URL tidak ditemukan di .env.local');
  }

  const client = new Client({
    connectionString: dbMatch[1].trim(),
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    const migrationPath = path.join(
      process.cwd(),
      'supabase',
      'migrations',
      '20261104_harden_rls_auth_security.sql'
    );
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    await client.query(migrationSql);
    console.log('Migrasi RLS 20261104_harden_rls_auth_security.sql berhasil diterapkan.');

    for (const u of INITIAL_USERS) {
      const appMeta = {
        provider: 'email',
        providers: ['email'],
        username: u.username,
        full_name: u.fullName,
        role: u.role,
        role_label: u.roleLabel,
      };
      const userMeta = {
        sub: u.id,
        email: u.email,
        username: u.username,
        full_name: u.fullName,
        role_label: u.roleLabel,
        email_verified: true,
        phone_verified: false,
      };

      const existing = await client.query(
        'SELECT id FROM auth.users WHERE email = $1',
        [u.email]
      );

      let userId = u.id;
      if (existing.rows.length > 0) {
        userId = existing.rows[0].id;
        await client.query(
          `UPDATE auth.users
           SET encrypted_password = extensions.crypt($2, extensions.gen_salt('bf')),
               raw_app_meta_data = $3::jsonb,
               raw_user_meta_data = $4::jsonb,
               email_confirmed_at = COALESCE(email_confirmed_at, now()),
               updated_at = now()
           WHERE id = $1`,
          [userId, u.password, JSON.stringify(appMeta), JSON.stringify(userMeta)]
        );
        console.log(`Akun diperbarui: ${u.username} (${u.email})`);
      } else {
        await client.query(
          `INSERT INTO auth.users (
             instance_id, id, aud, role, email, encrypted_password,
             email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
             created_at, updated_at, confirmation_token, recovery_token,
             email_change_token_new, email_change, email_change_token_current,
             phone_change, phone_change_token, reauthentication_token,
             is_sso_user, is_anonymous
           ) VALUES (
             '00000000-0000-0000-0000-000000000000',
             $1, 'authenticated', 'authenticated', $2,
             extensions.crypt($3, extensions.gen_salt('bf')),
             now(), $4::jsonb, $5::jsonb, now(), now(),
             '', '', '', '', '', '', '', '', false, false
           )`,
          [userId, u.email, u.password, JSON.stringify(appMeta), JSON.stringify(userMeta)]
        );

        console.log(`Akun baru dibuat: ${u.username} (${u.email})`);
      }

      await client.query(
        `INSERT INTO auth.identities (
           provider_id, user_id, identity_data, provider,
           last_sign_in_at, created_at, updated_at
         ) VALUES (
           $1::text, $2::uuid, $3::jsonb, 'email', now(), now(), now()
         )
         ON CONFLICT (provider_id, provider) DO UPDATE
           SET identity_data = EXCLUDED.identity_data,
               updated_at = now()`,
        [String(userId), userId, JSON.stringify(userMeta)]
      );
    }

    const rbacMigrationPath = path.join(
      process.cwd(),
      'supabase',
      'migrations',
      '20261105_create_user_accounts_rbac.sql'
    );
    if (fs.existsSync(rbacMigrationPath)) {
      const rbacSql = fs.readFileSync(rbacMigrationPath, 'utf8');
      await client.query(rbacSql);
      console.log('Migrasi RBAC 20261105_create_user_accounts_rbac.sql berhasil diterapkan.');
    }

    const switchMigrationPath = path.join(
      process.cwd(),
      'supabase',
      'migrations',
      '20261106_create_app_security_switch.sql'
    );
    if (fs.existsSync(switchMigrationPath)) {
      const switchSql = fs.readFileSync(switchMigrationPath, 'utf8');
      await client.query(switchSql);
      console.log('Migrasi Saklar Keamanan 20261106_create_app_security_switch.sql berhasil diterapkan.');
    }
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error('Gagal menjalankan seed-admin-user:', err);
  process.exit(1);
});
