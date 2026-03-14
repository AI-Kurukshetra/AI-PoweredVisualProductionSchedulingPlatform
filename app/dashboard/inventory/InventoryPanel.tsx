"use client";

import { useMemo, useState } from "react";
import Drawer from "@/app/components/Drawer";
import { useToast } from "@/app/components/Toaster";
import type { InventoryStockWithMaterial, MaterialTransactionWithRefs } from "@/lib/services/inventory";

function n(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value: unknown) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) return `"${str.replaceAll('"', '""')}"`;
  return str;
}

type SortDir = "asc" | "desc";

export default function InventoryPanel({
  stock,
  transactions,
}: {
  stock: InventoryStockWithMaterial[];
  transactions: MaterialTransactionWithRefs[];
}) {
  const { showToast } = useToast();

  const [stockQuery, setStockQuery] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [stockSortKey, setStockSortKey] = useState<
    "material" | "onHand" | "reserved" | "available" | "reorderPoint" | "unit"
  >("material");
  const [stockSortDir, setStockSortDir] = useState<SortDir>("asc");
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);

  const stockRows = useMemo(() => {
    const query = stockQuery.trim().toLowerCase();
    const filtered = stock.filter((s) => {
      const materialName = (s.materials?.name ?? "").toLowerCase();
      const materialCode = (s.materials?.code ?? "").toLowerCase();
      const materialDesc = (s.materials?.description ?? "").toLowerCase();
      const unit = (s.unit ?? "").toLowerCase();
      const matches =
        !query ||
        materialName.includes(query) ||
        materialCode.includes(query) ||
        materialDesc.includes(query) ||
        unit.includes(query);
      if (!matches) return false;

      if (!lowOnly) return true;
      const onHand = n(s.on_hand);
      const reserved = n(s.reserved);
      const reorderPoint = n(s.reorder_point);
      const available = Math.max(onHand - reserved, 0);
      return reorderPoint > 0 && available <= reorderPoint;
    });

    const dirFactor = stockSortDir === "asc" ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      if (stockSortKey === "material") {
        const av = (a.materials?.name ?? "").localeCompare(b.materials?.name ?? "");
        if (av !== 0) return av * dirFactor;
        return (a.materials?.code ?? "").localeCompare(b.materials?.code ?? "") * dirFactor;
      }
      if (stockSortKey === "unit") return (a.unit ?? "").localeCompare(b.unit ?? "") * dirFactor;

      const aOnHand = n(a.on_hand);
      const bOnHand = n(b.on_hand);
      const aReserved = n(a.reserved);
      const bReserved = n(b.reserved);
      const aReorder = n(a.reorder_point);
      const bReorder = n(b.reorder_point);
      const aAvail = Math.max(aOnHand - aReserved, 0);
      const bAvail = Math.max(bOnHand - bReserved, 0);

      const av =
        stockSortKey === "onHand"
          ? aOnHand - bOnHand
          : stockSortKey === "reserved"
          ? aReserved - bReserved
          : stockSortKey === "available"
          ? aAvail - bAvail
          : aReorder - bReorder;
      if (av !== 0) return av * dirFactor;
      return (a.materials?.name ?? "").localeCompare(b.materials?.name ?? "") * dirFactor;
    });

    return sorted;
  }, [lowOnly, stock, stockQuery, stockSortDir, stockSortKey]);

  const selectedStock = useMemo(() => {
    if (!selectedMaterialId) return null;
    return stock.find((s) => s.material_id === selectedMaterialId) ?? null;
  }, [selectedMaterialId, stock]);

  const selectedMaterialTxns = useMemo(() => {
    if (!selectedMaterialId) return [];
    return transactions.filter((t) => t.material_id === selectedMaterialId).slice(0, 15);
  }, [selectedMaterialId, transactions]);

  const handleStockSort = (
    key: "material" | "onHand" | "reserved" | "available" | "reorderPoint" | "unit"
  ) => {
    if (stockSortKey === key) {
      setStockSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setStockSortKey(key);
    setStockSortDir("asc");
  };

  const exportStock = () => {
    const headers = ["Material", "Code", "On hand", "Reserved", "Available", "Reorder point", "Unit"];
    const lines = [headers.map(csvEscape).join(",")];
    for (const s of stockRows) {
      const onHand = n(s.on_hand);
      const reserved = n(s.reserved);
      const reorder = n(s.reorder_point);
      const available = Math.max(onHand - reserved, 0);
      lines.push(
        [
          s.materials?.name ?? "",
          s.materials?.code ?? "",
          onHand.toFixed(4),
          reserved.toFixed(4),
          available.toFixed(4),
          reorder.toFixed(4),
          s.unit ?? "",
        ]
          .map(csvEscape)
          .join(",")
      );
    }
    downloadCsv("inventory_stock.csv", lines.join("\n"));
    showToast("Exported stock CSV.", "info");
  };

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(`Copied ${label}.`, "success");
    } catch {
      showToast("Copy failed.", "error");
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold">Stock</h2>
              <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-black/70 dark:bg-white/10 dark:text-white/70">
                {stockRows.length} / {stock.length}
              </span>
            </div>
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
              Search, sort, and click a row for quick details.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-black/40">
              <span className="text-xs font-medium text-black/60 dark:text-white/60">Search</span>
              <input
                value={stockQuery}
                onChange={(e) => setStockQuery(e.target.value)}
                className="w-56 bg-transparent text-sm text-black outline-none placeholder:text-black/35 dark:text-white dark:placeholder:text-white/35"
                placeholder="Material, code, unit…"
                aria-label="Search stock"
              />
            </div>

            <label className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black/70 dark:border-white/10 dark:bg-black/40 dark:text-white/70">
              <input
                type="checkbox"
                checked={lowOnly}
                onChange={(e) => setLowOnly(e.target.checked)}
              />
              Low stock only
            </label>

            <button
              type="button"
              className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:bg-black/30 dark:hover:bg-white/5"
              onClick={exportStock}
              disabled={!stockRows.length}
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/5 text-xs text-black/60 dark:bg-white/5 dark:text-white/60">
              <tr>
                <th className="px-4 py-3 font-medium">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 hover:text-black dark:hover:text-white"
                    onClick={() => handleStockSort("material")}
                  >
                    Material
                    {stockSortKey === "material" ? (stockSortDir === "asc" ? "↑" : "↓") : null}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 hover:text-black dark:hover:text-white"
                    onClick={() => handleStockSort("onHand")}
                  >
                    On hand
                    {stockSortKey === "onHand" ? (stockSortDir === "asc" ? "↑" : "↓") : null}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 hover:text-black dark:hover:text-white"
                    onClick={() => handleStockSort("reserved")}
                  >
                    Reserved
                    {stockSortKey === "reserved" ? (stockSortDir === "asc" ? "↑" : "↓") : null}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 hover:text-black dark:hover:text-white"
                    onClick={() => handleStockSort("available")}
                  >
                    Available
                    {stockSortKey === "available" ? (stockSortDir === "asc" ? "↑" : "↓") : null}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 hover:text-black dark:hover:text-white"
                    onClick={() => handleStockSort("reorderPoint")}
                  >
                    Reorder
                    {stockSortKey === "reorderPoint" ? (stockSortDir === "asc" ? "↑" : "↓") : null}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 hover:text-black dark:hover:text-white"
                    onClick={() => handleStockSort("unit")}
                  >
                    Unit
                    {stockSortKey === "unit" ? (stockSortDir === "asc" ? "↑" : "↓") : null}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10 dark:divide-white/10">
              {stockRows.length ? (
                stockRows.map((s) => {
                  const onHand = n(s.on_hand);
                  const reserved = n(s.reserved);
                  const reorderPoint = n(s.reorder_point);
                  const available = Math.max(onHand - reserved, 0);
                  const isLow = reorderPoint > 0 && available <= reorderPoint;
                  return (
                    <tr
                      key={s.id}
                      className={[
                        "cursor-pointer bg-white/50 transition-colors hover:bg-black/5 dark:bg-black/10 dark:hover:bg-white/5",
                        isLow ? "ring-1 ring-amber-400/30" : "",
                      ].join(" ")}
                      onClick={() => setSelectedMaterialId(s.material_id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") setSelectedMaterialId(s.material_id);
                      }}
                      aria-label={`Open details for ${s.materials?.name ?? "Material"}`}
                    >
                      <td className="max-w-[18rem] px-4 py-3 font-medium">
                        <div className="truncate" title={s.materials?.description ?? ""}>
                          {s.materials?.name ?? "Material"}
                          {s.materials?.code ? (
                            <span className="ml-2 text-xs text-black/50 dark:text-white/50">
                              {s.materials.code}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-black/70 dark:text-white/70">
                        {onHand.toFixed(4)}
                      </td>
                      <td className="px-4 py-3 text-black/70 dark:text-white/70">
                        {reserved.toFixed(4)}
                      </td>
                      <td className="px-4 py-3 font-medium text-black/80 dark:text-white/80">
                        {available.toFixed(4)}
                      </td>
                      <td
                        className={[
                          "px-4 py-3",
                          isLow
                            ? "font-medium text-amber-800 dark:text-amber-200"
                            : "text-black/70 dark:text-white/70",
                        ].join(" ")}
                      >
                        {reorderPoint.toFixed(4)}
                      </td>
                      <td className="px-4 py-3 text-black/70 dark:text-white/70">{s.unit}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-4 py-10 text-center text-sm text-black/60 dark:text-white/60" colSpan={6}>
                    {stock.length ? "No matches for your filters." : "No stock rows yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer
        open={Boolean(selectedMaterialId)}
        onClose={() => setSelectedMaterialId(null)}
        title={selectedStock?.materials?.name ?? "Material details"}
      >
        {selectedStock ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-black/30">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-black dark:text-white">
                    {selectedStock.materials?.name ?? "Material"}
                  </div>
                  <div className="mt-1 text-sm text-black/60 dark:text-white/60">
                    {selectedStock.materials?.description ?? "—"}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {selectedStock.materials?.code ? (
                      <button
                        type="button"
                        className="rounded-full border border-black/10 bg-white px-3 py-1 text-black/70 hover:bg-black/5 dark:border-white/10 dark:bg-black/30 dark:text-white/70 dark:hover:bg-white/5"
                        onClick={() => copyToClipboard(selectedStock.materials?.code ?? "", "code")}
                      >
                        Code: {selectedStock.materials.code}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="rounded-full border border-black/10 bg-white px-3 py-1 text-black/70 hover:bg-black/5 dark:border-white/10 dark:bg-black/30 dark:text-white/70 dark:hover:bg-white/5"
                      onClick={() => copyToClipboard(selectedStock.material_id, "material id")}
                    >
                      Copy material id
                    </button>
                  </div>
                </div>
                <div className="rounded-2xl bg-black px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white dark:bg-white dark:text-black">
                  Unit: {selectedStock.unit}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(() => {
                const onHand = n(selectedStock.on_hand);
                const reserved = n(selectedStock.reserved);
                const reorder = n(selectedStock.reorder_point);
                const available = Math.max(onHand - reserved, 0);
                const cards = [
                  { label: "On hand", value: onHand.toFixed(4) },
                  { label: "Reserved", value: reserved.toFixed(4) },
                  { label: "Available", value: available.toFixed(4) },
                  { label: "Reorder point", value: reorder.toFixed(4) },
                ];
                return cards.map((c) => (
                  <div
                    key={c.label}
                    className="rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-black/30"
                  >
                    <div className="text-xs font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
                      {c.label}
                    </div>
                    <div className="mt-2 text-lg font-semibold text-black dark:text-white">{c.value}</div>
                  </div>
                ));
              })()}
            </div>

            <div className="rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-black/30">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-black dark:text-white">Recent for material</div>
                <div className="text-xs text-black/60 dark:text-white/60">{selectedMaterialTxns.length}</div>
              </div>
              <div className="mt-3 space-y-2">
                {selectedMaterialTxns.length ? (
                  selectedMaterialTxns.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-black/10 bg-white p-3 text-sm dark:border-white/10 dark:bg-black/40"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-black/80 dark:text-white/80">
                          {t.txn_type} • {n(t.quantity).toFixed(4)} {t.unit}
                        </div>
                        <div className="mt-1 truncate text-xs text-black/60 dark:text-white/60">
                          {new Date(t.created_at).toLocaleString()}
                          {t.suppliers?.name ? ` • ${t.suppliers.name}` : ""}
                          {t.reference ? ` • ${t.reference}` : ""}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-black/70 hover:bg-black/5 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
                        onClick={() => copyToClipboard(t.id, "transaction id")}
                      >
                        Copy id
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-black/60 dark:text-white/60">No transactions in the current list.</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-black/60 dark:text-white/60">No stock row selected.</div>
        )}
      </Drawer>
    </>
  );
}

export function InventoryTransactionsPanel({
  transactions,
}: {
  transactions: MaterialTransactionWithRefs[];
}) {
  const { showToast } = useToast();
  const [txnQuery, setTxnQuery] = useState("");
  const [txnType, setTxnType] = useState<"" | "receipt" | "issue" | "adjustment">("");

  const filteredTxns = useMemo(() => {
    const query = txnQuery.trim().toLowerCase();
    return transactions.filter((t) => {
      if (txnType && t.txn_type !== txnType) return false;
      if (!query) return true;
      const material = (t.materials?.name ?? "").toLowerCase();
      const code = (t.materials?.code ?? "").toLowerCase();
      const supplier = (t.suppliers?.name ?? "").toLowerCase();
      const reference = (t.reference ?? "").toLowerCase();
      const type = (t.txn_type ?? "").toLowerCase();
      return (
        material.includes(query) ||
        code.includes(query) ||
        supplier.includes(query) ||
        reference.includes(query) ||
        type.includes(query)
      );
    });
  }, [transactions, txnQuery, txnType]);

  const exportTxns = () => {
    const headers = ["When", "Material", "Code", "Type", "Quantity", "Unit", "Supplier", "Reference"];
    const lines = [headers.map(csvEscape).join(",")];
    for (const t of filteredTxns) {
      lines.push(
        [
          new Date(t.created_at).toISOString(),
          t.materials?.name ?? "",
          t.materials?.code ?? "",
          t.txn_type ?? "",
          n(t.quantity).toFixed(4),
          t.unit ?? "",
          t.suppliers?.name ?? "",
          t.reference ?? "",
        ]
          .map(csvEscape)
          .join(",")
      );
    }
    downloadCsv("material_transactions.csv", lines.join("\n"));
    showToast("Exported transactions CSV.", "info");
  };

  return (
    <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold">Recent transactions</h2>
            <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-black/70 dark:bg-white/10 dark:text-white/70">
              {filteredTxns.length} / {transactions.length}
            </span>
          </div>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Filter by type, supplier, reference, or material.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-black/40">
            <span className="text-xs font-medium text-black/60 dark:text-white/60">Search</span>
            <input
              value={txnQuery}
              onChange={(e) => setTxnQuery(e.target.value)}
              className="w-56 bg-transparent text-sm text-black outline-none placeholder:text-black/35 dark:text-white dark:placeholder:text-white/35"
              placeholder="Material, supplier, ref…"
              aria-label="Search transactions"
            />
          </div>

          <select
            className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none dark:border-white/10 dark:bg-black/40 dark:text-white"
            value={txnType}
            onChange={(e) => setTxnType(e.target.value as typeof txnType)}
            aria-label="Filter transaction type"
          >
            <option value="">All types</option>
            <option value="receipt">Receipt</option>
            <option value="issue">Issue</option>
            <option value="adjustment">Adjustment</option>
          </select>

          <button
            type="button"
            className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:bg-black/30 dark:hover:bg-white/5"
            onClick={exportTxns}
            disabled={!filteredTxns.length}
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/5 text-xs text-black/60 dark:bg-white/5 dark:text-white/60">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Material</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Qty</th>
              <th className="px-4 py-3 font-medium">Supplier</th>
              <th className="px-4 py-3 font-medium">Ref</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10 dark:divide-white/10">
            {filteredTxns.length ? (
              filteredTxns.map((t) => (
                <tr key={t.id} className="bg-white/50 dark:bg-black/10">
                  <td className="px-4 py-3 text-black/60 dark:text-white/60">
                    {new Date(t.created_at).toLocaleString()}
                  </td>
                  <td className="max-w-[16rem] px-4 py-3 font-medium">
                    <div className="truncate">
                      {t.materials?.name ?? "Material"}
                      {t.materials?.code ? (
                        <span className="ml-2 text-xs text-black/50 dark:text-white/50">
                          {t.materials.code}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-black/70 dark:text-white/70">{t.txn_type}</td>
                  <td className="px-4 py-3 text-black/70 dark:text-white/70">
                    {n(t.quantity).toFixed(4)} {t.unit}
                  </td>
                  <td className="max-w-[14rem] px-4 py-3 text-black/70 dark:text-white/70">
                    <div className="truncate" title={t.suppliers?.name ?? ""}>
                      {t.suppliers?.name ?? "—"}
                    </div>
                  </td>
                  <td className="max-w-[14rem] px-4 py-3 text-black/60 dark:text-white/60">
                    <div className="truncate" title={t.reference ?? ""}>
                      {t.reference ?? "—"}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-10 text-center text-sm text-black/60 dark:text-white/60" colSpan={6}>
                  {transactions.length ? "No matches for your filters." : "No transactions yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
