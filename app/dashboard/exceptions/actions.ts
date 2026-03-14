"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseActionClient } from "@/lib/supabase/actions";
import { upsertAlerts, resolveAlert, resolveMissingAutoAlerts } from "@/lib/services/alerts";
import { detectExceptionAlerts } from "@/lib/services/exceptions";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function runExceptionDetectionAction(formData: FormData) {
  const organizationId = getString(formData, "organizationId");
  const facilityId = getString(formData, "facilityId");

  if (!organizationId) {
    redirect("/dashboard/exceptions?error=Select%20an%20organization%20first.");
  }

  const supabase = await createSupabaseActionClient();

  try {
    const drafts = await detectExceptionAlerts(supabase, {
      organizationId,
      facilityId: facilityId ? facilityId : undefined,
    });
    await upsertAlerts(supabase, drafts);
    await resolveMissingAutoAlerts(supabase, {
      organizationId,
      facilityId: facilityId ? facilityId : null,
      keepFingerprints: drafts.map((d) => d.fingerprint),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to run exception detection.";
    redirect(
      `/dashboard/exceptions?organizationId=${encodeURIComponent(
        organizationId
      )}&facilityId=${encodeURIComponent(facilityId)}&error=${encodeURIComponent(message)}`
    );
  }

  revalidatePath("/dashboard/exceptions");
  redirect(
    `/dashboard/exceptions?organizationId=${encodeURIComponent(
      organizationId
    )}&facilityId=${encodeURIComponent(
      facilityId
    )}&message=Exception%20scan%20completed.`
  );
}

export async function resolveAlertAction(formData: FormData) {
  const id = getString(formData, "id");
  const organizationId = getString(formData, "organizationId");
  const facilityId = getString(formData, "facilityId");

  if (!id) {
    redirect("/dashboard/exceptions?error=Missing%20alert%20id.");
  }

  const supabase = await createSupabaseActionClient();
  try {
    await resolveAlert(supabase, id);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to resolve alert.";
    redirect(
      `/dashboard/exceptions?organizationId=${encodeURIComponent(
        organizationId
      )}&facilityId=${encodeURIComponent(facilityId)}&error=${encodeURIComponent(message)}`
    );
  }

  revalidatePath("/dashboard/exceptions");
  redirect(
    `/dashboard/exceptions?organizationId=${encodeURIComponent(
      organizationId
    )}&facilityId=${encodeURIComponent(facilityId)}&message=Alert%20resolved.`
  );
}

