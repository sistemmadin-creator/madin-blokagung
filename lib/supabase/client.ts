import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rdeaouthjemxggvutctl.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Y79anaBTmzOtrC7cMgeuzw_5_1h5vke'
  );
}

export const supabase = createClient();
