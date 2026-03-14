"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseActionClient } from "@/lib/supabase/actions";
import { createProduct, deleteProduct, updateProduct } from "@/lib/services/products";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(formData: FormData, key: string) {
  const raw = getString(formData, key);
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

export async function saveProductAction(formData: FormData) {
  const id = getString(formData, "id");
  const organizationId = getString(formData, "organizationId");
  const name = getString(formData, "name");
  const description = getString(formData, "description");
  const sku = getString(formData, "sku");
  const defaultProductionTime = getNumber(formData, "default_production_time");

  if (!organizationId) {
    redirect("/dashboard/products?error=Select%20an%20organization%20first.");
  }
  if (!name) {
    redirect(
      `/dashboard/products?organizationId=${encodeURIComponent(
        organizationId
      )}&error=${encodeURIComponent("Product name is required.")}`
    );
  }
  if (!Number.isFinite(defaultProductionTime) || defaultProductionTime < 0) {
    redirect(
      `/dashboard/products?organizationId=${encodeURIComponent(
        organizationId
      )}&error=${encodeURIComponent(
        "Default production time must be a valid number (0 or more)."
      )}`
    );
  }

  const supabase = await createSupabaseActionClient();

  try {
    if (id) {
      await updateProduct(supabase, {
        id,
        name,
        description: description ? description : null,
        sku: sku ? sku : null,
        defaultProductionTime,
      });
    } else {
      await createProduct(supabase, {
        organizationId,
        name,
        description,
        sku,
        defaultProductionTime,
      });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save product.";
    redirect(
      `/dashboard/products?organizationId=${encodeURIComponent(
        organizationId
      )}&error=${encodeURIComponent(message)}`
    );
  }

  revalidatePath("/dashboard/products");
  redirect(
    `/dashboard/products?organizationId=${encodeURIComponent(
      organizationId
    )}&message=${encodeURIComponent(id ? "Product updated." : "Product created.")}`
  );
}

export async function deleteProductAction(formData: FormData) {
  const id = getString(formData, "id");
  const organizationId = getString(formData, "organizationId");

  if (!id) {
    redirect("/dashboard/products?error=Missing%20product%20id.");
  }

  const supabase = await createSupabaseActionClient();

  try {
    await deleteProduct(supabase, id);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete product.";
    redirect(
      `/dashboard/products?organizationId=${encodeURIComponent(
        organizationId
      )}&error=${encodeURIComponent(message)}`
    );
  }

  revalidatePath("/dashboard/products");
  redirect(
    `/dashboard/products?organizationId=${encodeURIComponent(
      organizationId
    )}&message=Product%20deleted.`
  );
}
