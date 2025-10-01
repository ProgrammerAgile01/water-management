"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GlassCard } from "./glass-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomerHistoryModal } from "./customer-history-modal";
import { CustomerEditModal } from "./customer-edit-modal";
import { ConfirmDialog } from "./confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { Edit, Eye, GripVertical, Trash2 } from "lucide-react";
import { ResetPasswordButton } from "./reset-password-button"; // ⬅️ TAMBAHKAN INI

// ——— Server types ———
type ServerPelanggan = {
  id: string;
  kode: string;
  nama: string;
  wa: string | null;
  alamat: string;
  meterAwal: number;
  statusAktif: boolean;
  createdAt?: string;
  zonaId?: string | null;
  zona?: { id: string; nama: string } | null;
  noUrutRumah?: number | null;
  lat?: number | null;
  lng?: number | null;
};

// ——— UI types ———
interface Customer {
  id: string;
  nama: string;
  kodeCustomer: string;
  noWA: string;
  alamat: string;
  meterAwal: number;
  status: "aktif" | "nonaktif";
  tanggalDaftar?: string;
  zonaId: string | null;
  zonaNama: string | null;
  noUrutRumah: number | null;
  lat?: number | null;
  lng?: number | null;
}

type ApiResp = {
  ok: boolean;
  items: ServerPelanggan[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/* ===================== Sortable <tr> ===================== */
function DraggableRow({
  customer,
  children,
}: {
  customer: Customer;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: customer.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    background: isDragging ? "hsl(var(--muted) / 0.5)" : undefined,
    display: "table-row",
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="border-b border-border/10 hover:bg-muted/20"
    >
      {/* drag handle */}
      <td className="py-3 px-2 w-[44px] text-center align-middle">
        <button
          ref={setActivatorNodeRef}
          {...listeners}
          className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted/60 cursor-grab active:cursor-grabbing"
          title="Geser untuk mengubah urutan"
          type="button"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      </td>
      {children}
    </tr>
  );
}

export function CustomerList() {
  const { toast } = useToast();
  const { mutate } = useSWRConfig();

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // === Page size (persist ke localStorage) ===
  const [pageSizeUI, setPageSizeUI] = useState<number>(() => 10);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("tb.pelanggan.pageSize");
      if (saved) setPageSizeUI(parseInt(saved, 10) || 10);
    } catch {}
  }, []);
  const changePageSize = (val: number) => {
    setPageSizeUI(val);
    setCurrentPage(1);
    try {
      localStorage.setItem("tb.pelanggan.pageSize", String(val));
    } catch {}
  };

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [showHistory, setShowHistory] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(
    null
  );

  const listKey = `/api/pelanggan?page=${currentPage}&pageSize=${pageSizeUI}&q=${encodeURIComponent(
    searchTerm.trim()
  )}`;

  const { data, error, isLoading } = useSWR<ApiResp>(listKey, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  const rows: Customer[] = useMemo(() => {
    const mapped =
      data?.ok && Array.isArray(data.items)
        ? data.items.map((p) => ({
            id: p.id,
            nama: p.nama,
            kodeCustomer: p.kode,
            noWA: p.wa ?? "-",
            alamat: p.alamat,
            meterAwal: p.meterAwal,
            status: p.statusAktif ? "aktif" : "nonaktif",
            tanggalDaftar: p.createdAt,
            zonaId: p.zonaId ?? null,
            zonaNama: p.zona?.nama ?? null,
            noUrutRumah: p.noUrutRumah ?? null,
            lat: p.lat ?? null,
            lng: p.lng ?? null,
          }))
        : [];

    // UI sort (zona terisi duluan → nama zona → noUrut → createdAt)
    return mapped.sort((a, b) => {
      const aHasZona = a.zonaNama ? 1 : 0;
      const bHasZona = b.zonaNama ? 1 : 0;
      if (aHasZona !== bHasZona) return bHasZona - aHasZona;
      if (a.zonaNama && b.zonaNama) {
        const cmpZona = a.zonaNama.localeCompare(b.zonaNama);
        if (cmpZona !== 0) return cmpZona;
      }
      const ua = a.noUrutRumah ?? Number.MAX_SAFE_INTEGER;
      const ub = b.noUrutRumah ?? Number.MAX_SAFE_INTEGER;
      if (ua !== ub) return ua - ub;
      return (a.tanggalDaftar || "").localeCompare(b.tanggalDaftar || "");
    });
  }, [data]);

  const total = data?.pagination?.total ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 1;
  const page = data?.pagination?.page ?? currentPage;
  const pageSize = data?.pagination?.pageSize ?? pageSizeUI;

  const getStatusBadge = (status: Customer["status"]) =>
    status === "aktif" ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        Aktif
      </Badge>
    ) : (
      <Badge variant="secondary">Non-aktif</Badge>
    );

  const handleViewHistory = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowHistory(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowEditModal(true);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setCustomerToDelete(customer);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!customerToDelete) return;
    try {
      const res = await fetch(`/api/pelanggan?id=${customerToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json?.ok)
        throw new Error(json?.message || "Gagal menghapus pelanggan");
      toast({
        title: "Pelanggan Dihapus",
        description: `Data ${customerToDelete.nama} berhasil dihapus.`,
      });
      await mutate(listKey);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Terjadi kesalahan.";
      toast({
        title: "Gagal Menghapus",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setShowDeleteConfirm(false);
      setCustomerToDelete(null);
    }
  };

  const handleSaveCustomer = async (_updated: Customer) => {
    setShowEditModal(false);
    setSelectedCustomer(null);
    await mutate(listKey);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const rowsByZona = useMemo(() => {
    const map = new Map<string | null, Customer[]>();
    rows.forEach((r) => {
      const key = r.zonaId ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return map;
  }, [rows]);

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = rows.find((r) => r.id === String(active.id));
    const to = rows.find((r) => r.id === String(over.id));
    if (!from || !to) return;

    if ((from.zonaId ?? null) !== (to.zonaId ?? null) || !from.zonaId) {
      toast({
        title: "Pindah antar-blok tidak diizinkan",
        description: "Reorder hanya berlaku di zona yang sama.",
        variant: "destructive",
      });
      return;
    }

    const cluster = rowsByZona.get(from.zonaId) ?? [];
    const oldIndex = cluster.findIndex((r) => r.id === from.id);
    const newIndex = cluster.findIndex((r) => r.id === to.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const targetOrder = newIndex + 1;

    // optimistic UI
    await mutate(
      listKey,
      (prev?: ApiResp) => {
        if (!prev?.ok || !Array.isArray(prev.items)) return prev;
        const items = prev.items.slice();
        const subsetIdxs = items
          .map((it, idx) => ({ it, idx }))
          .filter(({ it }) => (it.zonaId ?? null) === from.zonaId)
          .map(({ idx }) => idx);

        const list = subsetIdxs.map((i) => items[i]);
        const moved = arrayMove(
          list,
          list.findIndex((i) => i.id === from.id),
          list.findIndex((i) => i.id === to.id)
        );
        moved.forEach((row, idx) => {
          const idxInItems = items.findIndex((i) => i.id === row.id);
          if (idxInItems >= 0)
            items[idxInItems] = { ...items[idxInItems], noUrutRumah: idx + 1 };
        });
        return { ...prev, items };
      },
      { revalidate: false }
    );
    try {
      const res = await fetch(`/api/pelanggan?id=${from.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noUrutRumah: targetOrder, zonaId: from.zonaId }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok)
        throw new Error(json?.message || "Gagal mengubah urutan");

      toast({
        title: "Berhasil",
        description: json.message || `Nomor urut diperbarui ke ${targetOrder}.`,
      });

      await mutate(listKey); // sinkron ulang
    } catch (err) {
      await mutate(listKey);
      toast({
        title: "Gagal reorder",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <GlassCard className="p-6">
        {/* Header filter */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <h3 className="text-xl font-semibold text-foreground">
            Daftar Pelanggan
          </h3>
          <div className="flex w-full lg:w-auto items-stretch gap-3">
            <Input
              placeholder="Cari nama, kode, atau alamat..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-card/50 lg:w-72"
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:block">
                Tampilkan
              </span>
              <select
                value={pageSizeUI}
                onChange={(e) => changePageSize(parseInt(e.target.value, 10))}
                className="px-3 py-2 bg-card/50 border border-primary/30 rounded-md text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                title="Jumlah baris per halaman"
              >
                {[10, 20, 30, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="p-4 text-sm text-muted-foreground">Memuat data…</div>
        )}
        {error && (
          <div className="p-4 text-sm text-destructive">Gagal memuat data.</div>
        )}

        {!isLoading && !error && (
          <>
            {/* Desktop table with DnD */}
            <div className="hidden lg:block overflow-x-auto">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onDragEnd}
              >
                <SortableContext
                  items={rows.map((r) => r.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/20">
                        <th className="w-[44px]" />
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                          Kode
                        </th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                          Nama
                        </th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                          No. WA
                        </th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                          Alamat
                        </th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">
                          Blok
                        </th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">
                          No
                        </th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">
                          Meter Awal
                        </th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((customer) => (
                        <DraggableRow key={customer.id} customer={customer}>
                          <td className="py-3 px-2 text-sm font-medium text-primary">
                            {customer.kodeCustomer}
                          </td>
                          <td className="py-3 px-2 text-sm font-medium text-foreground">
                            {customer.nama}
                          </td>
                          <td className="py-3 px-2 text-sm text-foreground">
                            {customer.noWA}
                          </td>
                          <td className="py-3 px-2 text-sm text-foreground max-w-xs truncate">
                            {customer.alamat}
                          </td>
                          <td className="py-3 px-2 text-sm text-center text-foreground">
                            {customer.zonaNama ?? "-"}
                          </td>
                          <td className="py-3 px-2 text-sm text-center text-foreground">
                            {customer.noUrutRumah ?? "-"}
                          </td>
                          <td className="py-3 px-2 text-sm text-center text-foreground">
                            {customer.meterAwal}
                          </td>
                          <td className="py-3 px-2 text-center">
                            {getStatusBadge(customer.status)}
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewHistory(customer)}
                                className="h-8 w-8 p-0 bg-transparent"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditCustomer(customer)}
                                className="h-8 w-8 p-0 bg-transparent"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteCustomer(customer)}
                                className="h-8 w-8 p-0 bg-transparent text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>

                              {/* ⬇️ Tambahkan tombol Reset Password (kecil) */}
                              <ResetPasswordButton pelangganId={customer.id} />
                            </div>
                          </td>
                        </DraggableRow>
                      ))}
                      {rows.length === 0 && (
                        <tr>
                          <td
                            className="py-6 px-2 text-center text-sm text-muted-foreground"
                            colSpan={10}
                          >
                            Tidak ada data.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </SortableContext>
              </DndContext>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden space-y-4">
              {rows.map((customer) => (
                <div
                  key={customer.id}
                  className="p-4 bg-muted/20 rounded-lg space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-foreground">
                        {customer.nama}
                      </p>
                      <p className="text-sm text-primary font-medium">
                        {customer.kodeCustomer}
                      </p>
                    </div>
                    {getStatusBadge(customer.status)}
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">WA:</span> {customer.noWA}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Alamat:</span>{" "}
                      {customer.alamat}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Blok:</span>{" "}
                      {customer.zonaNama ?? "-"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">No:</span>{" "}
                      {customer.noUrutRumah ?? "-"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Meter Awal:</span>{" "}
                      {customer.meterAwal}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewHistory(customer)}
                      className="flex-1 bg-transparent"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Histori
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditCustomer(customer)}
                      className="bg-transparent"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteCustomer(customer)}
                      className="bg-transparent text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    {/* Mobile: reset password tombol kecil */}
                    <ResetPasswordButton pelangganId={customer.id} />
                  </div>
                </div>
              ))}
              {rows.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground bg-muted/20 rounded-lg">
                  Tidak ada data.
                </div>
              )}
            </div>

            {/* Pagination */}
            {total > 0 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-muted-foreground">
                  Menampilkan {(page - 1) * pageSize + 1}–
                  {Math.min(page * pageSize, total)} dari {total} pelanggan
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={page <= 1}
                    className="bg-transparent"
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(p + 1, totalPages))
                    }
                    disabled={page >= totalPages}
                    className="bg-transparent"
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </GlassCard>

      {showHistory && selectedCustomer && (
        <CustomerHistoryModal
          customer={selectedCustomer}
          onClose={() => {
            setShowHistory(false);
            setSelectedCustomer(null);
          }}
        />
      )}
      {showEditModal && selectedCustomer && (
        <CustomerEditModal
          customer={selectedCustomer}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCustomer(null);
          }}
          onSave={handleSaveCustomer}
        />
      )}
      {showDeleteConfirm && customerToDelete && (
        <ConfirmDialog
          title="Hapus Pelanggan"
          message={`Apakah Anda yakin ingin menghapus data pelanggan "${customerToDelete.nama}"?`}
          onConfirm={confirmDelete}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setCustomerToDelete(null);
          }}
        />
      )}
    </>
  );
}
