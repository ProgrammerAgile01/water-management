// components/user-management.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

type RoleStr = "ADMIN" | "PETUGAS" | "WARGA";
type UserRow = {
  id: string;
  username: string;
  name: string;
  phone: string | null;
  role: RoleStr;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export function UserManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "WARGA" as RoleStr,
    name: "",
    phone: "",
  });

  // --- ganti fetchUsers ---
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      const json = await res.json();

      // dukung 2 bentuk respons: array langsung ATAU { ok, items }
      const list: UserRow[] = Array.isArray(json)
        ? json
        : Array.isArray(json?.items)
        ? json.items
        : [];

      setUsers(list);
    } catch (e) {
      setUsers([]); // pastikan selalu array
      toast({ title: "Gagal memuat user", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const resetForm = () =>
    setFormData({
      username: "",
      password: "",
      role: "WARGA",
      name: "",
      phone: "",
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingUser) {
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: formData.username,
            password: formData.password, // boleh kosong -> tidak update
            name: formData.name,
            role: formData.role,
            phone: formData.phone || null,
          }),
        });
        if (!res.ok) throw new Error();
        toast({ title: "User diperbarui" });
        setEditingUser(null);
      } else {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: formData.username,
            password: formData.password,
            name: formData.name,
            role: formData.role,
            phone: formData.phone || null,
          }),
        });
        if (!res.ok) throw new Error();
        toast({ title: "User ditambahkan" });
        setIsAddDialogOpen(false);
      }
      resetForm();
      await fetchUsers();
    } catch {
      toast({ title: "Operasi gagal", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (u: UserRow) => {
    setEditingUser(u);
    setFormData({
      username: u.username,
      password: "",
      role: u.role,
      name: u.name,
      phone: u.phone ?? "",
    });
  };

  const handleDelete = async (id: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast({ title: "User dihapus" });
      await fetchUsers();
    } catch {
      toast({ title: "Gagal menghapus", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", isActive: !current }),
      });
      if (!res.ok) throw new Error();
      await fetchUsers();
    } catch {
      toast({ title: "Gagal ubah status", variant: "destructive" });
    }
  };

  const getRoleLabel = (role: RoleStr) =>
    role === "ADMIN"
      ? "Administrator"
      : role === "PETUGAS"
      ? "Petugas Lapangan"
      : "Warga";

  const fmtDate = (iso: string) => iso?.slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">
            Manajemen User
          </h2>
        </div>

        <Dialog
          open={isAddDialogOpen}
          onOpenChange={(o) => {
            setIsAddDialogOpen(o);
            if (!o) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Tambah User
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white/95 backdrop-blur-md border-white/20">
            <DialogHeader>
              <DialogTitle>Tambah User Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, username: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Telepon/WA (opsional)</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, phone: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, password: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      role: e.target.value as RoleStr,
                    }))
                  }
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="ADMIN">Administrator</option>
                  <option value="PETUGAS">Petugas Lapangan</option>
                  <option value="WARGA">Warga</option>
                </select>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Memproses…" : "Tambah User"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Memuat…</div>
      ) : (
        <div className="space-y-2">
          <h3 className="font-medium">Daftar User ({users.length})</h3>
          <div className="space-y-2">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between p-4 bg-muted/20 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{u.name}</p>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        u.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {u.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    @{u.username} • {getRoleLabel(u.role)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Dibuat: {fmtDate(u.createdAt)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleStatus(u.id, u.isActive)}
                    className="p-2"
                  >
                    {u.isActive ? (
                      <ToggleRight className="w-4 h-4 text-green-600" />
                    ) : (
                      <ToggleLeft className="w-4 h-4 text-gray-400" />
                    )}
                  </Button>

                  <Dialog
                    open={editingUser?.id === u.id}
                    onOpenChange={(open) => !open && setEditingUser(null)}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(u)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white/95 backdrop-blur-md border-white/20">
                      <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="e-username">Username</Label>
                          <Input
                            id="e-username"
                            value={formData.username}
                            onChange={(e) =>
                              setFormData((p) => ({
                                ...p,
                                username: e.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="e-name">Nama Lengkap</Label>
                          <Input
                            id="e-name"
                            value={formData.name}
                            onChange={(e) =>
                              setFormData((p) => ({
                                ...p,
                                name: e.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="e-phone">Telepon/WA</Label>
                          <Input
                            id="e-phone"
                            value={formData.phone}
                            onChange={(e) =>
                              setFormData((p) => ({
                                ...p,
                                phone: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="e-password">
                            Password (biarkan kosong jika tidak ganti)
                          </Label>
                          <Input
                            id="e-password"
                            type="password"
                            value={formData.password}
                            onChange={(e) =>
                              setFormData((p) => ({
                                ...p,
                                password: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="e-role">Role</Label>
                          <select
                            id="e-role"
                            value={formData.role}
                            onChange={(e) =>
                              setFormData((p) => ({
                                ...p,
                                role: e.target.value as RoleStr,
                              }))
                            }
                            className="w-full px-3 py-2 border rounded-md"
                          >
                            <option value="ADMIN">Administrator</option>
                            <option value="PETUGAS">Petugas Lapangan</option>
                            <option value="WARGA">Warga</option>
                          </select>
                        </div>
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={submitting}
                        >
                          {submitting ? "Menyimpan…" : "Simpan Perubahan"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {u.username !== "admin" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-white/95 backdrop-blur-md border-white/20">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus User</AlertDialogTitle>
                          <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus user “{u.name}”?
                            Tindakan ini tidak dapat dibatalkan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(u.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Hapus
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
