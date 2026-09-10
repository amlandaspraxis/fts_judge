import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const EVENT_ID = import.meta.env.VITE_EVENT_ID ?? 'evt_fts_2026';
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!isSupabaseConfigured) {
  // Graceful fallback notice
  console.info('ℹ️ [Supabase Client] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set. Using API sync mode.');
}

/**
 * Subscribe to real-time table changes if Supabase is configured.
 * Returns an unsubscribe function.
 */
export function subscribeToTableChanges(tableName, onEvent) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`realtime_${tableName}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: tableName },
      (payload) => {
        if (onEvent) onEvent(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export default supabase;
