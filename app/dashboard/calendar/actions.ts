"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseActionClient } from "@/lib/supabase/actions";
import {
  createHoliday,
  createMaintenanceWindow,
  createShift,
  deleteHoliday,
  deleteMaintenanceWindow,
  deleteShift,
} from "@/lib/services/calendar";
import { normalizeCalendarSchemaError } from "@/lib/services/supabase-helpers";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createShiftAction(formData: FormData) {
  const organizationId = getString(formData, "organizationId");
  const name = getString(formData, "name");
  const daysRaw = getString(formData, "days");
  const startTime = getString(formData, "startTime");
  const endTime = getString(formData, "endTime");
  const daysOfWeek = daysRaw
    ? daysRaw.split(",").map((value) => value.trim()).filter(Boolean)
    : [];

  if (!organizationId || !name || !startTime || !endTime) {
    redirect("/dashboard/calendar/shifts?error=Missing required shift details.");
  }

  const supabase = await createSupabaseActionClient();

  try {
    await createShift(supabase, {
      organizationId,
      name,
      daysOfWeek,
      startTime,
      endTime,
    });
  } catch (error) {
    const message = normalizeCalendarSchemaError(error, "Unable to save shift.");
    redirect(`/dashboard/calendar/shifts?organizationId=${encodeURIComponent(organizationId)}&error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/dashboard/calendar/shifts");
  redirect(`/dashboard/calendar/shifts?organizationId=${encodeURIComponent(organizationId)}&message=Shift%20created.`);
}

export async function deleteShiftAction(formData: FormData) {
  const id = getString(formData, "id");
  if (!id) {
    redirect("/dashboard/calendar/shifts?error=Missing%20shift%20id.");
  }
  const supabase = await createSupabaseActionClient();
  try {
    await deleteShift(supabase, id);
  } catch (error) {
    const message = normalizeCalendarSchemaError(error, "Unable to delete shift.");
    redirect(`/dashboard/calendar/shifts?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/dashboard/calendar/shifts");
  redirect("/dashboard/calendar/shifts?message=Shift%20deleted.");
}

export async function createHolidayAction(formData: FormData) {
  const organizationId = getString(formData, "organizationId");
  const name = getString(formData, "name");
  const date = getString(formData, "date");
  const notes = getString(formData, "notes");

  if (!organizationId || !name || !date) {
    redirect("/dashboard/calendar/holidays?error=Missing%20holiday%20details.");
  }

  const supabase = await createSupabaseActionClient();

  try {
    await createHoliday(supabase, {
      organizationId,
      name,
      date,
      notes,
    });
  } catch (error: unknown) {
    const msg = (error instanceof Error ? error.message : String(error)) ?? "";
    const isDuplicate =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "23505";
    const isDuplicateByMessage =
      typeof msg === "string" &&
      (msg.includes("holidays_organization_date_idx") || msg.includes("23505"));
    if (isDuplicate || isDuplicateByMessage) {
      redirect(
        `/dashboard/calendar/holidays?organizationId=${encodeURIComponent(organizationId)}&error=${encodeURIComponent("A holiday for this organization and date already exists.")}`
      );
    }
    const message = normalizeCalendarSchemaError(error, "Unable to save holiday.");
    redirect(`/dashboard/calendar/holidays?organizationId=${encodeURIComponent(organizationId)}&error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/dashboard/calendar/holidays");
  redirect(`/dashboard/calendar/holidays?organizationId=${encodeURIComponent(organizationId)}&message=Holiday%20added.`);
}

export async function deleteHolidayAction(formData: FormData) {
  const id = getString(formData, "id");
  if (!id) {
    redirect("/dashboard/calendar/holidays?error=Missing%20holiday%20id.");
  }
  const supabase = await createSupabaseActionClient();
  try {
    await deleteHoliday(supabase, id);
  } catch (error) {
    const message = normalizeCalendarSchemaError(error, "Unable to delete holiday.");
    redirect(`/dashboard/calendar/holidays?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/dashboard/calendar/holidays");
  redirect("/dashboard/calendar/holidays?message=Holiday%20removed.");
}

export async function createMaintenanceWindowAction(formData: FormData) {
  const machineId = getString(formData, "machineId");
  const startTime = getString(formData, "startTime");
  const endTime = getString(formData, "endTime");
  const description = getString(formData, "description");

  if (!machineId || !startTime || !endTime) {
    redirect("/dashboard/calendar/maintenance?error=Missing%20maintenance%20details.");
  }

  const supabase = await createSupabaseActionClient();

  try {
    await createMaintenanceWindow(supabase, {
      machineId,
      startTime,
      endTime,
      description,
    });
  } catch (error) {
    const message = normalizeCalendarSchemaError(error, "Unable to save maintenance window.");
    redirect(`/dashboard/calendar/maintenance?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/dashboard/calendar/maintenance");
  redirect("/dashboard/calendar/maintenance?message=Maintenance%20created.");
}

export async function deleteMaintenanceWindowAction(formData: FormData) {
  const id = getString(formData, "id");
  if (!id) {
    redirect("/dashboard/calendar/maintenance?error=Missing%20maintenance%20id.");
  }
  const supabase = await createSupabaseActionClient();
  try {
    await deleteMaintenanceWindow(supabase, id);
  } catch (error) {
    const message = normalizeCalendarSchemaError(error, "Unable to delete maintenance window.");
    redirect(`/dashboard/calendar/maintenance?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/dashboard/calendar/maintenance");
  redirect("/dashboard/calendar/maintenance?message=Maintenance%20removed.");
}
