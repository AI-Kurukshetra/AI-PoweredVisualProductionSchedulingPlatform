import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

const CALENDAR_SCHEMA_MIGRATION_PATH = "supabase/migrations/20260315140000_create_calendar_tables.sql";

export function throwPostgrestError(error: PostgrestError): never {
  const parts = [
    error.message,
    error.code ? `code=${error.code}` : "",
    error.details ? `details=${error.details}` : "",
    error.hint ? `hint=${error.hint}` : "",
  ].filter(Boolean);
  throw new Error(parts.join(" • "));
}

export function requireData<T>(result: { data: T; error: PostgrestError | null }): T {
  if (result.error) {
    throwPostgrestError(result.error);
  }
  return result.data;
}

export function isSchemaCacheMissMessage(message: string) {
  return message.includes("schema cache") || message.includes("code=PGRST205");
}

export function normalizeCalendarSchemaError(error: unknown, fallback = "") {
  const message =
    typeof error === "string" ? error : error instanceof Error ? error.message : fallback;

  if (!message) {
    return message;
  }

  if (isSchemaCacheMissMessage(message)) {
    return `Calendar tables are not deployed in Supabase yet. Run ${CALENDAR_SCHEMA_MIGRATION_PATH} in the Supabase SQL Editor, then reload the PostgREST schema cache.`;
  }

  return message;
}

export type SupabaseLikeClient = SupabaseClient;
