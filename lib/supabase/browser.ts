import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

let browserClient: SupabaseClient | null = null;

export function getBrowserSupabaseClient() {
  if (!browserClient) {
    const { url, anonKey } = getSupabaseEnv();
    browserClient = createClient(url, anonKey);
  }
  return browserClient;
}
