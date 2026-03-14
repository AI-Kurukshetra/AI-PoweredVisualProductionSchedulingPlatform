"use server";

import { createSupabaseActionClient } from "@/lib/supabase/actions";
import { getMonitoringData, type MonitoringData } from "@/lib/services/monitoring";

export async function getMonitoringDataAction(
  organizationId: string
): Promise<MonitoringData | null> {
  if (!organizationId) return null;
  const supabase = await createSupabaseActionClient();
  try {
    return await getMonitoringData(supabase, { organizationId });
  } catch {
    return null;
  }
}
