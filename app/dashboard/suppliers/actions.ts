"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseActionClient } from "@/lib/supabase/actions";
import {
  createSupplier,
  deleteSupplier,
  updateSupplier,
} from "@/lib/services/suppliers";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function saveSupplierAction(formData: FormData) {
  const id = getString(formData, "id");
  const organizationId = getString(formData, "organizationId");
  const name = getString(formData, "name");
  const contact = getString(formData, "contact");
  const notes = getString(formData, "notes");

  if (!organizationId) {
    redirect("/dashboard/suppliers?error=Select%20an%20organization%20first.");
  }
  if (!name) {
    redirect(
      `/dashboard/suppliers?organizationId=${encodeURIComponent(
        organizationId
      )}&error=Supplier%20name%20is%20required.`
    );
  }

  const supabase = await createSupabaseActionClient();

  try {
    if (id) {
      await updateSupplier(supabase, {
        id,
        name,
        contact: contact ? contact : null,
        notes: notes ? notes : null,
      });
    } else {
      await createSupplier(supabase, {
        organizationId,
        name,
        contact,
        notes,
      });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save supplier.";
    redirect(
      `/dashboard/suppliers?organizationId=${encodeURIComponent(
        organizationId
      )}&error=${encodeURIComponent(message)}`
    );
  }

  revalidatePath("/dashboard/suppliers");
  redirect(
    `/dashboard/suppliers?organizationId=${encodeURIComponent(
      organizationId
    )}&message=${encodeURIComponent(id ? "Supplier updated." : "Supplier created.")}`
  );
}

export async function deleteSupplierAction(formData: FormData) {
  const id = getString(formData, "id");
  const organizationId = getString(formData, "organizationId");
  if (!id) {
    redirect("/dashboard/suppliers?error=Missing%20supplier%20id.");
  }

  const supabase = await createSupabaseActionClient();

  try {
    await deleteSupplier(supabase, id);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete supplier.";
    redirect(
      `/dashboard/suppliers?organizationId=${encodeURIComponent(
        organizationId
      )}&error=${encodeURIComponent(message)}`
    );
  }

  revalidatePath("/dashboard/suppliers");
  redirect(
    `/dashboard/suppliers?organizationId=${encodeURIComponent(
      organizationId
    )}&message=Supplier%20deleted.`
  );
}

