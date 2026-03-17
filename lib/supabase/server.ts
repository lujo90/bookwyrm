import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/** Client for server-side calls that respect RLS (uses the anon key). */
export function createServerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/** Client that bypasses RLS — only use in trusted server contexts. */
export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
