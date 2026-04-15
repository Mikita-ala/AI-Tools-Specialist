import { createClient } from "@supabase/supabase-js";

import { env, hasSupabaseAdminEnv } from "@/lib/env";

export const createAdminSupabaseClient = () => {
  if (!hasSupabaseAdminEnv || !env.supabaseUrl || !env.supabaseSecretKey) {
    throw new Error("Supabase admin environment variables are not configured");
  }

  return createClient(env.supabaseUrl, env.supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
