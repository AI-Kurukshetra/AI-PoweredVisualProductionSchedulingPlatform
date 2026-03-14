"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseActionClient } from "@/lib/supabase/actions";
import {
  applyMaterialTransaction,
  upsertInventoryStockSettings,
} from "@/lib/services/inventory";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(formData: FormData, key: string) {
  const raw = getString(formData, key);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function saveStockSettingsAction(formData: FormData) {
  const organizationId = getString(formData, "organizationId");
  const facilityId = getString(formData, "facilityId");
  const materialId = getString(formData, "materialId");
  const reserved = getNumber(formData, "reserved");
  const reorderPoint = getNumber(formData, "reorderPoint");
  const unit = getString(formData, "unit");

  if (!organizationId || !facilityId) {
    redirect("/dashboard/inventory?error=Select%20an%20organization%20and%20facility%20first.");
  }
  if (!materialId) {
    redirect(
      `/dashboard/inventory?organizationId=${encodeURIComponent(
        organizationId
      )}&facilityId=${encodeURIComponent(
        facilityId
      )}&error=Select%20a%20material%20first.`
    );
  }

  const supabase = await createSupabaseActionClient();

  try {
    await upsertInventoryStockSettings(supabase, {
      facilityId,
      materialId,
      reserved: reserved ?? undefined,
      reorderPoint: reorderPoint ?? undefined,
      unit: unit ? unit : undefined,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save stock settings.";
    redirect(
      `/dashboard/inventory?organizationId=${encodeURIComponent(
        organizationId
      )}&facilityId=${encodeURIComponent(facilityId)}&error=${encodeURIComponent(message)}`
    );
  }

  revalidatePath("/dashboard/inventory");
  redirect(
    `/dashboard/inventory?organizationId=${encodeURIComponent(
      organizationId
    )}&facilityId=${encodeURIComponent(facilityId)}&message=Stock%20settings%20saved.`
  );
}

export async function applyMaterialTransactionAction(formData: FormData) {
  const organizationId = getString(formData, "organizationId");
  const facilityId = getString(formData, "facilityId");
  const materialId = getString(formData, "materialId");
  const supplierId = getString(formData, "supplierId");
  const txnType = getString(formData, "txnType");
  const quantity = getNumber(formData, "quantity");
  const unit = getString(formData, "unit");
  const reference = getString(formData, "reference");

  if (!organizationId || !facilityId) {
    redirect("/dashboard/inventory?error=Select%20an%20organization%20and%20facility%20first.");
  }
  if (!materialId) {
    redirect(
      `/dashboard/inventory?organizationId=${encodeURIComponent(
        organizationId
      )}&facilityId=${encodeURIComponent(
        facilityId
      )}&error=Select%20a%20material%20first.`
    );
  }
  if (txnType !== "receipt" && txnType !== "issue" && txnType !== "adjustment") {
    redirect(
      `/dashboard/inventory?organizationId=${encodeURIComponent(
        organizationId
      )}&facilityId=${encodeURIComponent(facilityId)}&error=Invalid%20transaction%20type.`
    );
  }
  if (quantity === null) {
    redirect(
      `/dashboard/inventory?organizationId=${encodeURIComponent(
        organizationId
      )}&facilityId=${encodeURIComponent(facilityId)}&error=Quantity%20is%20required.`
    );
  }
  if (!unit) {
    redirect(
      `/dashboard/inventory?organizationId=${encodeURIComponent(
        organizationId
      )}&facilityId=${encodeURIComponent(facilityId)}&error=Unit%20is%20required.`
    );
  }

  const supabase = await createSupabaseActionClient();

  try {
    await applyMaterialTransaction(supabase, {
      facilityId,
      materialId,
      supplierId: supplierId ? supplierId : null,
      txnType,
      quantity,
      unit,
      reference: reference ? reference : undefined,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to apply transaction.";
    redirect(
      `/dashboard/inventory?organizationId=${encodeURIComponent(
        organizationId
      )}&facilityId=${encodeURIComponent(facilityId)}&error=${encodeURIComponent(message)}`
    );
  }

  revalidatePath("/dashboard/inventory");
  redirect(
    `/dashboard/inventory?organizationId=${encodeURIComponent(
      organizationId
    )}&facilityId=${encodeURIComponent(facilityId)}&message=Transaction%20saved.`
  );
}

