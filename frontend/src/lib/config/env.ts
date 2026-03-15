export const config = {
  pretix: {
    apiUrl: import.meta.env.VITE_PRETIX_API_URL || '',
    apiToken: import.meta.env.VITE_PRETIX_API_TOKEN || '',
    organizer: import.meta.env.VITE_PRETIX_ORGANIZER || '',
    event: import.meta.env.VITE_PRETIX_EVENT || '',
  },
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },
} as const;
