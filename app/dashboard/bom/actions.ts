"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseActionClient } from "@/lib/supabase/actions";
import { createMaterial, deleteMaterial, updateMaterial } from "@/lib/services/materials";
import { createBomItem, deleteBomItem, updateBomItem } from "@/lib/services/bom";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(formData: FormData, key: string) {
  const raw = getString(formData, key);
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

export async function saveMaterialAction(formData: FormData) {
  const id = getString(formData, "id");
  const organizationId = getString(formData, "organizationId");
  const name = getString(formData, "name");
  const code = getString(formData, "code");
  const description = getString(formData, "description");

  if (!organizationId) {
    redirect("/dashboard/bom?error=Select%20an%20organization%20first.");
  }
  if (!name) {
    redirect(
      `/dashboard/bom?organizationId=${encodeURIComponent(
        organizationId
      )}&error=${encodeURIComponent("Material name is required.")}`
    );
  }

  const supabase = await createSupabaseActionClient();

  try {
    if (id) {
      await updateMaterial(supabase, {
        id,
        name,
        code: code ? code : null,
        description: description ? description : null,
      });
    } else {
      await createMaterial(supabase, { organizationId, name, code, description });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save material.";
    redirect(
      `/dashboard/bom?organizationId=${encodeURIComponent(
        organizationId
      )}&error=${encodeURIComponent(message)}`
    );
  }

  revalidatePath("/dashboard/bom");
  redirect(
    `/dashboard/bom?organizationId=${encodeURIComponent(
      organizationId
    )}&message=${encodeURIComponent(id ? "Material updated." : "Material created.")}`
  );
}

export async function deleteMaterialAction(formData: FormData) {
  const id = getString(formData, "id");
  const organizationId = getString(formData, "organizationId");

  if (!id) {
    redirect("/dashboard/bom?error=Missing%20material%20id.");
  }

  const supabase = await createSupabaseActionClient();

  try {
    await deleteMaterial(supabase, id);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete material.";
    redirect(
      `/dashboard/bom?organizationId=${encodeURIComponent(
        organizationId
      )}&error=${encodeURIComponent(message)}`
    );
  }

  revalidatePath("/dashboard/bom");
  redirect(
    `/dashboard/bom?organizationId=${encodeURIComponent(
      organizationId
    )}&message=Material%20deleted.`
  );
}

export async function saveBomItemAction(formData: FormData) {
  const id = getString(formData, "id");
  const organizationId = getString(formData, "organizationId");
  const productId = getString(formData, "productId");
  const materialId = getString(formData, "materialId");
  const quantity = getNumber(formData, "quantity");
  const unit = getString(formData, "unit");

  if (!productId) {
    redirect("/dashboard/bom?error=Select%20a%20product%20first.");
  }
  if (!materialId) {
    redirect(
      `/dashboard/bom?organizationId=${encodeURIComponent(
        organizationId
      )}&productId=${encodeURIComponent(productId)}&error=${encodeURIComponent(
        "Select a material."
      )}`
    );
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    redirect(
      `/dashboard/bom?organizationId=${encodeURIComponent(
        organizationId
      )}&productId=${encodeURIComponent(productId)}&error=${encodeURIComponent(
        "Quantity must be a valid number (greater than 0)."
      )}`
    );
  }
  if (!unit) {
    redirect(
      `/dashboard/bom?organizationId=${encodeURIComponent(
        organizationId
      )}&productId=${encodeURIComponent(productId)}&error=${encodeURIComponent("Unit is required.")}`
    );
  }

  const supabase = await createSupabaseActionClient();

  try {
    if (id) {
      await updateBomItem(supabase, { id, quantity, unit });
    } else {
      await createBomItem(supabase, { productId, materialId, quantity, unit });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save BOM item.";
    redirect(
      `/dashboard/bom?organizationId=${encodeURIComponent(
        organizationId
      )}&productId=${encodeURIComponent(productId)}&error=${encodeURIComponent(message)}`
    );
  }

  revalidatePath("/dashboard/bom");
  redirect(
    `/dashboard/bom?organizationId=${encodeURIComponent(
      organizationId
    )}&productId=${encodeURIComponent(productId)}&message=${encodeURIComponent(
      id ? "BOM item updated." : "BOM item created."
    )}`
  );
}

export async function deleteBomItemAction(formData: FormData) {
  const id = getString(formData, "id");
  const organizationId = getString(formData, "organizationId");
  const productId = getString(formData, "productId");

  if (!id) {
    redirect("/dashboard/bom?error=Missing%20BOM%20item%20id.");
  }

  const supabase = await createSupabaseActionClient();

  try {
    await deleteBomItem(supabase, id);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete BOM item.";
    redirect(
      `/dashboard/bom?organizationId=${encodeURIComponent(
        organizationId
      )}&productId=${encodeURIComponent(productId)}&error=${encodeURIComponent(message)}`
    );
  }

  revalidatePath("/dashboard/bom");
  redirect(
    `/dashboard/bom?organizationId=${encodeURIComponent(
      organizationId
    )}&productId=${encodeURIComponent(productId)}&message=BOM%20item%20deleted.`
  );
}

