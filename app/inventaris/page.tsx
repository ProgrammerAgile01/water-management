"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AppHeader } from "@/components/app-header";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AuthGuard } from "@/components/auth-guard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Trash2, CheckCircle2 } from "lucide-react"; // ⬅️ TAMBAH ikon posting

/* ====== Types ====== */
type Item = {
  id: string;
  kode: string;
  nama: string;
  kategori: string;
  satuan: string;
  stok: number;
};

type PurchaseRow = {
  id: string;
  tanggal: string;
  supplier: string;
  itemId: string;
  itemNama: string;
  qty: number;
  harga: number;
  total: number;
  status: "DRAFT" | "CLOSE";
};

type Summary = {
  totalItems: number;
  totalStok: number;
  nilaiPersediaan: number;
  pembelianBulanIni: number;
  pembelianHariIni: number;
  lastPurchaseAt?: string | null;
  recentPurchases: PurchaseRow[];
};

/* ====== Utils ====== */
const fmtRp = (n: number) => "Rp " + Number(n || 0).toLocaleString("id-ID");
const fmtDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      })
    : "-";

// helper: pad 2 digit
const pad2 = (n: number) => String(n).padStart(2, "0");

// helper: gabung "YYYY-MM-DD" + "HH:mm" -> "YYYY-MM-DDTHH:mm"
function composeDateWithTime(dateOnly: string, hhmm: string) {
  if (!dateOnly) return "";
  return `${dateOnly}T${hhmm || "00:00"}`;
}

// ambil jam:menit lokal sekarang
function nowHHmm() {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// ambil jam:menit dari ISO string (fallback ke now)
function timeFromIsoOrNow(iso?: string) {
  if (!iso) return nowHHmm();
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/* ====== Page ====== */
export default function InventarisPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(false);

  // form buat Item (kode otomatis dari server; hanya preview di UI)
  const [kodePreview, setKodePreview] = useState("");
  const [newItem, setNewItem] = useState({
    nama: "",
    kategori: "",
    satuan: "",
  });

  // form buat Purchase
  const [purchase, setPurchase] = useState({
    tanggal: "",
    supplier: "",
    itemId: "",
    qty: 0,
    harga: 0,
  });
  const subtotal = useMemo(
    () => Number(purchase.qty || 0) * Number(purchase.harga || 0),
    [purchase.qty, purchase.harga]
  );

  // edit Item
  const [openEditItem, setOpenEditItem] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editItemForm, setEditItemForm] = useState({
    nama: "",
    kategori: "",
    satuan: "",
  });

  // edit Purchase
  const [openEditPur, setOpenEditPur] = useState(false);
  const [editingPur, setEditingPur] = useState<PurchaseRow | null>(null);
  const [editPurForm, setEditPurForm] = useState({
    tanggal: "",
    supplier: "",
    itemId: "",
    qty: 0,
    harga: 0,
  });

  // ====== Dialog konfirmasi hapus (frontend) ======
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    null | (() => Promise<unknown>)
  >(null);
  function askConfirm(text: string, onYes: () => Promise<unknown>) {
    setConfirmText(text);
    setConfirmAction(() => onYes);
    setConfirmOpen(true);
  }

  /* ====== Data fetch ====== */
  async function fetchItems() {
    const r = await fetch("/api/inventaris/items");
    const j = await r.json();
    if (j?.ok) setItems(j.items || []);
  }
  async function fetchSummary() {
    const r = await fetch("/api/inventaris/summary");
    const j = await r.json();
    if (j?.ok) setSummary(j.data);
  }
  async function fetchPurchases() {
    const r = await fetch("/api/inventaris/purchase");
    const j = await r.json();
    if (j?.ok) setPurchases(j.rows || []);
  }
  useEffect(() => {
    fetchItems();
    fetchSummary();
    fetchPurchases();
  }, []);

  // preview kode otomatis saat nama diisi
  useEffect(() => {
    (async () => {
      if (newItem.nama.trim() && !kodePreview) {
        try {
          const r = await fetch("/api/inventaris/items/next-code");
          const j = await r.json();
          if (j?.ok) setKodePreview(j.kode);
        } catch {}
      }
    })();
  }, [newItem.nama, kodePreview]);

  async function refreshPreviewKode() {
    try {
      const r = await fetch("/api/inventaris/items/next-code");
      const j = await r.json();
      if (j?.ok) setKodePreview(j.kode);
    } catch {
      toast.error("Gagal mengambil kode");
    }
  }

  /* ====== Actions: create ====== */
  async function onCreateItem() {
    if (!newItem.nama) return toast.error("Nama wajib diisi");
    setLoading(true);
    try {
      const r = await fetch("/api/inventaris/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.message || "Gagal membuat item");
      setNewItem({ nama: "", kategori: "", satuan: "" });
      setKodePreview("");
      await fetchItems();
      await fetchSummary();
      toast.success("Berhasil", {
        description: `Item “${j.item.kode} — ${j.item.nama}” berhasil disimpan.`,
      });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function onCreatePurchase() {
    if (!purchase.tanggal || !purchase.supplier || !purchase.itemId)
      return toast.error("Tanggal, Supplier, dan Item wajib diisi");
    if (purchase.qty <= 0 || purchase.harga <= 0)
      return toast.error("Qty & Harga harus > 0");

    // tetap input date saja, tapi kirim ke server beserta jam:menit lokal sekarang
    const tanggalDenganJam = composeDateWithTime(purchase.tanggal, nowHHmm());

    setLoading(true);
    try {
      const r = await fetch("/api/inventaris/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...purchase, tanggal: tanggalDenganJam }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.message || "Gagal menyimpan pembelian");
      setPurchase({ tanggal: "", supplier: "", itemId: "", qty: 0, harga: 0 });
      await Promise.all([fetchItems(), fetchSummary(), fetchPurchases()]);

      const name =
        j.row?.itemNama ||
        items.find((i) => i.id === j.row?.itemId)?.nama ||
        "Item";
      toast.success("Berhasil", {
        description: `Pembelian “${name}” berhasil disimpan.`,
      });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  /* ====== Actions: edit/delete item ====== */
  function openItemModal(it: Item) {
    setEditingItem(it);
    setEditItemForm({
      nama: it.nama,
      kategori: it.kategori || "",
      satuan: it.satuan || "",
    });
    setOpenEditItem(true);
  }

  async function submitEditItem() {
    if (!editingItem) return;
    if (!editItemForm.nama.trim()) return toast.error("Nama wajib diisi");
    const r = await fetch(`/api/inventaris/items/${editingItem.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editItemForm),
    });
    const j = await r.json();
    if (!j.ok) return toast.error(j.message || "Gagal perbarui item");
    setOpenEditItem(false);
    setEditingItem(null);
    await fetchItems();
    toast.success("Berhasil", {
      description: `Item “${j.item?.kode ?? ""} — ${
        j.item?.nama ?? editItemForm.nama
      }” berhasil diperbarui.`,
    });
  }

  function requestDeleteItem(it: Item) {
    askConfirm(
      `Hapus item “${it.kode} — ${it.nama}”? Data pembelian yang terkait akan tetap ada, tetapi stok item ini akan menyesuaikan.`,
      async () => {
        setConfirmBusy(true);
        const r = await fetch(`/api/inventaris/items/${it.id}`, {
          method: "DELETE",
        });
        const j = await r.json();
        setConfirmBusy(false);
        setConfirmOpen(false);
        if (!j.ok) {
          toast.error(j.message || "Gagal menghapus item");
          return;
        }
        await Promise.all([fetchItems(), fetchSummary(), fetchPurchases()]);
        toast.success("Berhasil", {
          description: `Item “${it.kode} — ${it.nama}” berhasil dihapus.`,
        });
      }
    );
  }

  /* ====== Actions: edit/delete purchase ====== */
  function openPurchaseModal(p: PurchaseRow) {
    if (p.status === "CLOSE") {
      toast.info("Purchase sudah CLOSE dan tidak bisa diedit.");
      return;
    }
    setEditingPur(p);
    setEditPurForm({
      tanggal: p.tanggal.slice(0, 10), // tetap date saja di form
      supplier: p.supplier,
      itemId: p.itemId,
      qty: p.qty,
      harga: p.harga,
    });
    setOpenEditPur(true);
  }

  async function submitEditPurchase() {
    if (!editingPur) return;
    if (!editPurForm.tanggal || !editPurForm.supplier || !editPurForm.itemId)
      return toast.error("Semua field wajib diisi");
    if (editPurForm.qty <= 0 || editPurForm.harga <= 0)
      return toast.error("Qty/Harga harus > 0");

    // ambil jam:menit dari record lama (fallback ke sekarang)
    const hhmm = timeFromIsoOrNow(editingPur?.tanggal);
    const tanggalDenganJam = composeDateWithTime(editPurForm.tanggal, hhmm);

    const r = await fetch(`/api/inventaris/purchase/${editingPur.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editPurForm, tanggal: tanggalDenganJam }),
    });
    const j = await r.json();
    if (!j.ok) return toast.error(j.message || "Gagal perbarui pembelian");
    setOpenEditPur(false);
    setEditingPur(null);
    await Promise.all([fetchItems(), fetchSummary(), fetchPurchases()]);
    const name =
      j.row?.itemNama ||
      items.find((i) => i.id === editPurForm.itemId)?.nama ||
      "Item";
    toast.success("Berhasil", {
      description: `Pembelian “${name}” berhasil diperbarui.`,
    });
  }

  function requestDeletePurchase(p: PurchaseRow) {
    if (p.status === "CLOSE") {
      toast.info("Purchase sudah CLOSE dan tidak bisa dihapus.");
      return;
    }
    askConfirm(
      `Hapus pembelian ${fmtDate(p.tanggal)} • ${p.itemNama} (${
        p.qty
      } @ ${fmtRp(p.harga)})? Stok akan dikurangi otomatis.`,
      async () => {
        setConfirmBusy(true);
        const r = await fetch(`/api/inventaris/purchase/${p.id}`, {
          method: "DELETE",
        });
        const j = await r.json();
        setConfirmBusy(false);
        setConfirmOpen(false);
        if (!j.ok) {
          toast.error(j.message || "Gagal menghapus pembelian");
          return;
        }
        await Promise.all([fetchItems(), fetchSummary(), fetchPurchases()]);
        toast.success("Berhasil", {
          description: `Pembelian “${p.itemNama}” berhasil dihapus.`,
        });
      }
    );
  }

  /* ====== Actions: Posting ====== */
  async function postingAllDraft(ids?: string[]) {
    const target = ids?.length
      ? `(${ids.length} baris terpilih)`
      : "semua DRAFT";
    askConfirm(
      `Posting (CLOSE) ${target}? Data yang sudah CLOSE tidak bisa diedit lagi.`,
      async () => {
        setConfirmBusy(true);
        const r = await fetch("/api/inventaris/purchase/posting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ids?.length ? { ids } : {}),
        });
        const j = await r.json();
        setConfirmBusy(false);
        setConfirmOpen(false);
        if (!j.ok) {
          toast.error(j.message || "Gagal posting");
          return;
        }
        await fetchPurchases();
        toast.success("Berhasil", {
          description: `${j.closedCount} transaksi berhasil di-POST (CLOSE).`,
        });
      }
    );
  }

  // ⬇️ Posting per ID (ikon di setiap baris)
  async function postingById(id: string) {
    askConfirm(
      "Posting (CLOSE) transaksi ini? Setelah CLOSE tidak bisa diedit.",
      async () => {
        setConfirmBusy(true);
        const r = await fetch(`/api/inventaris/purchase/${id}/posting`, {
          method: "POST",
        });
        const j = await r.json();
        setConfirmBusy(false);
        setConfirmOpen(false);
        if (!j.ok) {
          toast.error(j.message || "Gagal posting");
          return;
        }
        await fetchPurchases();
        toast.success("Berhasil", {
          description: "Transaksi berhasil di-POST (CLOSE).",
        });
      }
    );
  }

  /* ====== UI ====== */
  return (
    <AuthGuard requiredRole="PETUGAS">
      <AppShell>
        <div className="max-w-7xl mx-auto space-y-6">
          <AppHeader title="Inventaris" />

          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard className="p-4">
              <div className="text-sm text-muted-foreground">Total Item</div>
              <div className="text-2xl font-semibold">
                {summary?.totalItems ?? 0}
              </div>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="text-sm text-muted-foreground">Total Stok</div>
              <div className="text-2xl font-semibold">
                {summary?.totalStok ?? 0}
              </div>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="text-sm text-muted-foreground">
                Nilai Persediaan
              </div>
              <div className="text-2xl font-semibold">
                {fmtRp(summary?.nilaiPersediaan ?? 0)}
              </div>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="text-sm text-muted-foreground">
                Pembelian Bulan Ini
              </div>
              <div className="text-2xl font-semibold">
                {fmtRp(summary?.pembelianBulanIni ?? 0)}
              </div>
            </GlassCard>
          </div>

          {/* Forms */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Item */}
            <GlassCard className="p-6 space-y-4">
              <div className="text-lg font-semibold">Buat Item</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Kode otomatis
                  </label>
                  <div className="flex gap-2">
                    <Input value={kodePreview || "Kode otomatis"} readOnly />
                    <Button variant="outline" onClick={refreshPreviewKode}>
                      Ambil Kode
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Nama *
                  </label>
                  <Input
                    value={newItem.nama}
                    onChange={(e) =>
                      setNewItem((s) => ({ ...s, nama: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Kategori
                  </label>
                  <Input
                    value={newItem.kategori}
                    onChange={(e) =>
                      setNewItem((s) => ({ ...s, kategori: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Satuan
                  </label>
                  <Input
                    value={newItem.satuan}
                    onChange={(e) =>
                      setNewItem((s) => ({ ...s, satuan: e.target.value }))
                    }
                  />
                </div>
              </div>
              <Button
                onClick={onCreateItem}
                disabled={loading}
                className="bg-emerald-600 text-white"
              >
                {loading ? "Menyimpan..." : "Simpan Item"}
              </Button>
              <p className="text-xs text-muted-foreground">
                * Kode final ditentukan server saat disimpan. Preview bisa
                berubah jika ada penyimpanan bersamaan.
              </p>
            </GlassCard>

            {/* Form Purchase */}
            <GlassCard className="p-6 space-y-4">
              <div className="text-lg font-semibold">Pembelian</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Tanggal *
                  </label>
                  <Input
                    type="date"
                    value={purchase.tanggal}
                    onChange={(e) =>
                      setPurchase((s) => ({ ...s, tanggal: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Supplier *
                  </label>
                  <Input
                    value={purchase.supplier}
                    onChange={(e) =>
                      setPurchase((s) => ({ ...s, supplier: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Item *
                  </label>
                  <Select
                    value={purchase.itemId}
                    onValueChange={(v) =>
                      setPurchase((s) => ({ ...s, itemId: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih item" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((it) => (
                        <SelectItem key={it.id} value={it.id}>
                          {it.kode} — {it.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Qty *</label>
                  <Input
                    type="number"
                    value={purchase.qty || ""}
                    onChange={(e) =>
                      setPurchase((s) => ({
                        ...s,
                        qty: Number(e.target.value || 0),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Harga *
                  </label>
                  <Input
                    type="number"
                    value={purchase.harga || ""}
                    onChange={(e) =>
                      setPurchase((s) => ({
                        ...s,
                        harga: Number(e.target.value || 0),
                      }))
                    }
                  />
                </div>
                <div className="rounded-lg bg-muted/40 px-3 py-2">
                  <div className="text-xs text-muted-foreground">Subtotal</div>
                  <div className="font-semibold">{fmtRp(subtotal)}</div>
                </div>
              </div>
              <Button
                onClick={onCreatePurchase}
                disabled={loading}
                className="bg-emerald-600 text-white"
              >
                {loading ? "Menyimpan..." : "Simpan Pembelian"}
              </Button>
            </GlassCard>
          </div>

          {/* LISTS: 2 kolom desktop; Card mobile, Table desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ITEM LIST */}
            <GlassCard className="p-6">
              <div className="text-lg font-semibold mb-4">Daftar Item</div>

              {/* Mobile: cards */}
              <div className="space-y-3 lg:hidden">
                {items.map((it) => (
                  <div
                    key={it.id}
                    className="rounded-xl border border-border/60 p-4 bg-background/60"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{it.kode}</div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openItemModal(it)}
                          title="Edit"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => requestDeleteItem(it)}
                          title="Hapus"
                          aria-label="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Separator className="my-3" />
                    <div className="grid grid-cols-2 gap-y-1 text-sm">
                      <span className="text-muted-foreground">Nama</span>
                      <span>{it.nama}</span>
                      <span className="text-muted-foreground">Kategori</span>
                      <span>{it.kategori || "-"}</span>
                      <span className="text-muted-foreground">Satuan</span>
                      <span>{it.satuan || "-"}</span>
                      <span className="text-muted-foreground">Stok</span>
                      <span className="font-medium">{it.stok}</span>
                    </div>
                  </div>
                ))}
                {!items.length && (
                  <div className="text-sm text-muted-foreground text-center py-6">
                    Belum ada item.
                  </div>
                )}
              </div>

              {/* Desktop: table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50 text-sm text-muted-foreground">
                      <th className="text-left py-2">Kode</th>
                      <th className="text-left py-2">Nama</th>
                      <th className="text-left py-2">Kategori</th>
                      <th className="text-left py-2">Satuan</th>
                      <th className="text-right py-2">Stok</th>
                      <th className="text-right py-2">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr
                        key={it.id}
                        className="border-b border-border/30 text-sm"
                      >
                        <td className="py-2">{it.kode}</td>
                        <td className="py-2">{it.nama}</td>
                        <td className="py-2">{it.kategori || "-"}</td>
                        <td className="py-2">{it.satuan || "-"}</td>
                        <td className="py-2 text-right">{it.stok}</td>
                        <td className="py-2">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openItemModal(it)}
                              title="Edit"
                              aria-label="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => requestDeleteItem(it)}
                              title="Hapus"
                              aria-label="Hapus"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!items.length && (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-6 text-center text-sm text-muted-foreground"
                        >
                          Belum ada item.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>

            {/* PURCHASE LIST */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-semibold">Daftar Pembelian</div>
                <Button
                  onClick={() => postingAllDraft()}
                  className="bg-emerald-600 text-white"
                >
                  Posting
                </Button>
              </div>

              {/* Mobile: cards */}
              <div className="space-y-3 lg:hidden">
                {purchases.map((p) => {
                  const isClosed = p.status === "CLOSE";
                  return (
                    <div
                      key={p.id}
                      className="rounded-xl border border-border/60 p-4 bg-background/60"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">
                          {fmtDate(p.tanggal)}
                        </div>
                        <div className="flex gap-1">
                          {!isClosed && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => postingById(p.id)}
                              title="Posting"
                              aria-label="Posting"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openPurchaseModal(p)}
                            disabled={isClosed}
                            title={isClosed ? "Sudah CLOSE" : "Edit"}
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => requestDeletePurchase(p)}
                            disabled={isClosed}
                            title={isClosed ? "Sudah CLOSE" : "Hapus"}
                            aria-label="Hapus"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="grid grid-cols-2 gap-y-1 text-sm">
                        <span className="text-muted-foreground">Supplier</span>
                        <span>{p.supplier}</span>
                        <span className="text-muted-foreground">Item</span>
                        <span>{p.itemNama}</span>
                        <span className="text-muted-foreground">Qty</span>
                        <span>{p.qty}</span>
                        <span className="text-muted-foreground">Harga</span>
                        <span>{fmtRp(p.harga)}</span>
                        <span className="text-muted-foreground">Total</span>
                        <span className="font-medium">{fmtRp(p.total)}</span>
                        <span className="text-muted-foreground">Status</span>
                        <span
                          className={
                            isClosed
                              ? "text-red-600 font-medium"
                              : "text-emerald-600 font-medium"
                          }
                        >
                          {p.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {!purchases.length && (
                  <div className="text-sm text-muted-foreground text-center py-6">
                    Belum ada data pembelian.
                  </div>
                )}
              </div>

              {/* Desktop: table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50 text-sm text-muted-foreground">
                      <th className="text-left px-4 py-2">Tanggal</th>
                      <th className="text-left px-4 py-2">Supplier</th>
                      <th className="text-left px-4 py-2">Item</th>
                      <th className="text-right px-4 py-2">Qty</th>
                      <th className="text-right px-4 py-2">Harga</th>
                      <th className="text-right px-4 py-2">Total</th>
                      <th className="text-left px-4 py-2">Status</th>
                      <th className="text-right px-4 py-2">Aksi</th>
                    </tr>
                  </thead>

                  <tbody>
                    {purchases.map((p) => {
                      const isClosed = p.status === "CLOSE";
                      return (
                        <tr
                          key={p.id}
                          className="border-b border-border/30 text-sm align-middle"
                        >
                          <td className="px-4 py-2 whitespace-nowrap">
                            {fmtDate(p.tanggal)}
                          </td>
                          <td className="px-4 py-2">{p.supplier}</td>
                          <td className="px-4 py-2">{p.itemNama}</td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {p.qty}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {fmtRp(p.harga)}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {fmtRp(p.total)}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={
                                isClosed
                                  ? "text-red-600 font-medium"
                                  : "text-emerald-600 font-medium"
                              }
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="py-2">
                            <div className="flex justify-end gap-1">
                              {!isClosed && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => postingById(p.id)}
                                  title="Posting"
                                  aria-label="Posting"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openPurchaseModal(p)}
                                disabled={isClosed}
                                title={isClosed ? "Sudah CLOSE" : "Edit"}
                                aria-label="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => requestDeletePurchase(p)}
                                disabled={isClosed}
                                title={isClosed ? "Sudah CLOSE" : "Hapus"}
                                aria-label="Hapus"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!purchases.length && (
                      <tr>
                        <td
                          colSpan={8}
                          className="py-6 text-center text-sm text-muted-foreground"
                        >
                          Belum ada data pembelian.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>

          <Separator className="my-2" />
        </div>

        {/* ====== Edit Item Modal ====== */}
        <Dialog open={openEditItem} onOpenChange={setOpenEditItem}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
              <DialogDescription>
                Perbarui data item. Kode tidak bisa diubah.
              </DialogDescription>
            </DialogHeader>
            {editingItem && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Kode</label>
                  <Input value={editingItem.kode} readOnly />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Nama *
                  </label>
                  <Input
                    value={editItemForm.nama}
                    onChange={(e) =>
                      setEditItemForm((s) => ({ ...s, nama: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Kategori
                  </label>
                  <Input
                    value={editItemForm.kategori}
                    onChange={(e) =>
                      setEditItemForm((s) => ({
                        ...s,
                        kategori: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Satuan
                  </label>
                  <Input
                    value={editItemForm.satuan}
                    onChange={(e) =>
                      setEditItemForm((s) => ({ ...s, satuan: e.target.value }))
                    }
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setOpenEditItem(false)}
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={submitEditItem}
                    className="bg-emerald-600 text-white"
                  >
                    Simpan
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ====== Edit Purchase Modal ====== */}
        <Dialog open={openEditPur} onOpenChange={setOpenEditPur}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Pembelian</DialogTitle>
              <DialogDescription>
                Perbarui data pembelian. Stok & ledger akan disesuaikan.
              </DialogDescription>
            </DialogHeader>
            {editingPur && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Tanggal *
                  </label>
                  <Input
                    type="date"
                    value={editPurForm.tanggal}
                    onChange={(e) =>
                      setEditPurForm((s) => ({ ...s, tanggal: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Supplier *
                  </label>
                  <Input
                    value={editPurForm.supplier}
                    onChange={(e) =>
                      setEditPurForm((s) => ({
                        ...s,
                        supplier: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Item *
                  </label>
                  <Select
                    value={editPurForm.itemId}
                    onValueChange={(v) =>
                      setEditPurForm((s) => ({ ...s, itemId: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih item" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((it) => (
                        <SelectItem key={it.id} value={it.id}>
                          {it.kode} — {it.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Qty *</label>
                  <Input
                    type="number"
                    value={editPurForm.qty || ""}
                    onChange={(e) =>
                      setEditPurForm((s) => ({
                        ...s,
                        qty: Number(e.target.value || 0),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Harga *
                  </label>
                  <Input
                    type="number"
                    value={editPurForm.harga || ""}
                    onChange={(e) =>
                      setEditPurForm((s) => ({
                        ...s,
                        harga: Number(e.target.value || 0),
                      }))
                    }
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setOpenEditPur(false)}
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={submitEditPurchase}
                    className="bg-emerald-600 text-white"
                  >
                    Simpan
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ====== Confirm Delete (frontend) ====== */}
        <Dialog
          open={confirmOpen}
          onOpenChange={(o) => !confirmBusy && setConfirmOpen(o)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Konfirmasi</DialogTitle>
              <DialogDescription>{confirmText}</DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                disabled={confirmBusy}
                onClick={() => setConfirmOpen(false)}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                disabled={confirmBusy}
                onClick={async () => {
                  if (!confirmAction) return;
                  await confirmAction();
                }}
              >
                {confirmBusy ? "Memproses..." : "Lanjut"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </AppShell>
    </AuthGuard>
  );
}
