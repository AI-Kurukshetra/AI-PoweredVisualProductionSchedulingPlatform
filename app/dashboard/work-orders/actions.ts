"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseActionClient } from "@/lib/supabase/actions";
import {
  createWorkOrder,
  deleteWorkOrder,
  updateWorkOrder,
} from "@/lib/services/work-orders";

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

function getDependencies(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
}

export async function saveWorkOrderAction(formData: FormData) {
  const id = getString(formData, "id");
  const organizationId = getString(formData, "organizationId");
  const productId = getString(formData, "productId");
  const quantity = getNumber(formData, "quantity");
  const priority = getNumber(formData, "priority");
  const deadline = getString(formData, "deadline");
  const status = getString(formData, "status");
  const notes = getString(formData, "notes");
  const dependencyIds = getDependencies(formData, "dependencyIds");

  if (!organizationId) {
    redirect("/dashboard/work-orders?error=Select%20an%20organization%20first.");
  }
  if (!productId) {
    redirect(
      `/dashboard/work-orders?organizationId=${encodeURIComponent(
        organizationId
      )}&error=Select%20a%20product.`
    );
  }
  if (quantity === null) {
    redirect(
      `/dashboard/work-orders?organizationId=${encodeURIComponent(
        organizationId
      )}&error=Quantity%20is%20required.`
    );
  }
  if (priority === null) {
    redirect(
      `/dashboard/work-orders?organizationId=${encodeURIComponent(
        organizationId
      )}&error=Priority%20is%20required.`
    );
  }

  const normalizedDeps = dependencyIds.filter((depId) => depId && depId !== id);

  const supabase = await createSupabaseActionClient();

  try {
    if (id) {
      await updateWorkOrder(supabase, {
        id,
        productId,
        quantity,
        priority,
        deadline: deadline ? deadline : null,
        status: status || "planned",
        dependencyIds: normalizedDeps,
        notes: notes ? notes : null,
      });
    } else {
      await createWorkOrder(supabase, {
        organizationId,
        productId,
        quantity,
        priority,
        deadline: deadline ? deadline : null,
        status: status || "planned",
        dependencyIds: normalizedDeps,
        notes,
      });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save work order.";
    redirect(
      `/dashboard/work-orders?organizationId=${encodeURIComponent(
        organizationId
      )}&error=${encodeURIComponent(message)}`
    );
  }

  revalidatePath("/dashboard/work-orders");
  redirect(
    `/dashboard/work-orders?organizationId=${encodeURIComponent(
      organizationId
    )}&message=${encodeURIComponent(id ? "Work order updated." : "Work order created.")}`
  );
}

export async function deleteWorkOrderAction(formData: FormData) {
  const id = getString(formData, "id");
  const organizationId = getString(formData, "organizationId");
  if (!id) {
    redirect("/dashboard/work-orders?error=Missing%20work%20order%20id.");
  }

  const supabase = await createSupabaseActionClient();

  try {
    await deleteWorkOrder(supabase, id);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete work order.";
    redirect(
      `/dashboard/work-orders?organizationId=${encodeURIComponent(
        organizationId
      )}&error=${encodeURIComponent(message)}`
    );
  }

  revalidatePath("/dashboard/work-orders");
  redirect(
    `/dashboard/work-orders?organizationId=${encodeURIComponent(
      organizationId
    )}&message=Work%20order%20deleted.`
  );
}

