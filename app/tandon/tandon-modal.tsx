"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Save } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void; // panggil mutate di parent
  editItem?: {
    id: string;
    kode: string;
    nama: string;
    deskripsi?: string | null;
  };
};

export function TandonModal({ open, onClose, onSaved, editItem }: Props) {
  const { toast } = useToast();
  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [saving, setSaving] = useState(false);
  const [genLoading, setGenLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editItem) {
      setKode(editItem.kode);
      setNama(editItem.nama);
      setDeskripsi(editItem.deskripsi || "");
    } else {
      // tambah baru: kosongkan field
      setKode("");
      setNama("");
      setDeskripsi("");
    }
  }, [open, editItem]);

  async function handleGenerate() {
    setGenLoading(true);
    try {
      const res = await fetch("/api/tandon/next-code", { cache: "no-store" });
      const js = await res.json();
      if (!res.ok || !js?.ok)
        throw new Error(js?.message || "Gagal generate kode");
      setKode(js.kode || "");
    } catch (e: any) {
      toast({
        title: "Gagal generate",
        description: e?.message ?? "Error",
        variant: "destructive",
      });
    } finally {
      setGenLoading(false);
    }
  }

  async function handleSave() {
    if (!nama.trim()) {
      toast({ title: "Nama wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        // kirim kode bila ada; kalau kosong backend akan generate sendiri
        ...(kode.trim() ? { kode: kode.trim().toUpperCase() } : {}),
        nama: nama.trim(),
        deskripsi: deskripsi.trim() || null,
      };

      const url = editItem ? `/api/tandon/${editItem.id}` : "/api/tandon";
      const method = editItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const js = await res.json();
      if (!res.ok || !js?.ok) throw new Error(js?.message || "Gagal menyimpan");

      toast({
        title: "Tersimpan",
        description: editItem ? "Tandon diperbarui" : "Tandon dibuat",
      });
      onSaved?.();
      onClose();
    } catch (e: any) {
      toast({
        title: "Gagal menyimpan",
        description: e?.message ?? "Error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editItem ? "Edit Tandon" : "Tambah Tandon"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Kode</label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={handleGenerate}
                disabled={genLoading}
                title="Generate Kode Otomatis"
              >
                <RefreshCw
                  className={`w-4 h-4 ${genLoading ? "animate-spin" : ""}`}
                />
                Generate
              </Button>
            </div>
            <Input
              value={kode}
              onChange={(e) => setKode(e.target.value.toUpperCase())}
              placeholder="Mis. TDN-001 (opsional, bisa klik Generate)"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Nama</label>
            <Input
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Tandon Utama"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Deskripsi</label>
            <Textarea
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Opsional"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
