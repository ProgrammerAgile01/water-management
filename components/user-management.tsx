"use client"

import type React from "react"

import { useState } from "react"
import { useConfigStore, type User } from "@/lib/config-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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
} from "@/components/ui/alert-dialog"
import { Users, Plus, Edit, Trash2, ToggleLeft, ToggleRight } from "lucide-react"

export function UserManagement() {
  const { users, addUser, updateUser, deleteUser, toggleUserStatus } = useConfigStore()
  const { toast } = useToast()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "warga" as const,
    nama: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingUser) {
      updateUser(editingUser.id, formData)
      toast({
        title: "Berhasil",
        description: "User berhasil diperbarui",
      })
      setEditingUser(null)
    } else {
      addUser(formData)
      toast({
        title: "Berhasil",
        description: "User berhasil ditambahkan",
      })
      setIsAddDialogOpen(false)
    }

    setFormData({ username: "", password: "", role: "warga", nama: "" })
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      password: user.password,
      role: user.role,
      nama: user.nama,
    })
  }

  const handleDelete = (id: string) => {
    deleteUser(id)
    toast({
      title: "Berhasil",
      description: "User berhasil dihapus",
    })
  }

  const handleToggleStatus = (id: string) => {
    toggleUserStatus(id)
    toast({
      title: "Berhasil",
      description: "Status user berhasil diubah",
    })
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrator"
      case "petugas":
        return "Petugas Lapangan"
      case "warga":
        return "Warga"
      default:
        return role
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Manajemen User</h2>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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
                  onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                  placeholder="Masukkan username"
                  required
                />
              </div>
              <div>
                <Label htmlFor="nama">Nama Lengkap</Label>
                <Input
                  id="nama"
                  value={formData.nama}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nama: e.target.value }))}
                  placeholder="Masukkan nama lengkap"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Masukkan password"
                  required
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md"
                >
                  <option value="admin">Administrator</option>
                  <option value="petugas">Petugas Lapangan</option>
                  <option value="warga">Warga</option>
                </select>
              </div>
              <Button type="submit" className="w-full">
                Tambah User
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium">Daftar User ({users.length})</h3>
        <div className="space-y-2">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{user.nama}</p>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      user.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {user.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  @{user.username} • {getRoleLabel(user.role)}
                </p>
                <p className="text-xs text-muted-foreground">Dibuat: {user.createdAt}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(user.id)} className="p-2">
                  {user.isActive ? (
                    <ToggleRight className="w-4 h-4 text-green-600" />
                  ) : (
                    <ToggleLeft className="w-4 h-4 text-gray-400" />
                  )}
                </Button>

                <Dialog open={editingUser?.id === user.id} onOpenChange={(open) => !open && setEditingUser(null)}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(user)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white/95 backdrop-blur-md border-white/20">
                    <DialogHeader>
                      <DialogTitle>Edit User</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="edit-username">Username</Label>
                        <Input
                          id="edit-username"
                          value={formData.username}
                          onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-nama">Nama Lengkap</Label>
                        <Input
                          id="edit-nama"
                          value={formData.nama}
                          onChange={(e) => setFormData((prev) => ({ ...prev, nama: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-password">Password</Label>
                        <Input
                          id="edit-password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-role">Role</Label>
                        <select
                          id="edit-role"
                          value={formData.role}
                          onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-input bg-background rounded-md"
                        >
                          <option value="admin">Administrator</option>
                          <option value="petugas">Petugas Lapangan</option>
                          <option value="warga">Warga</option>
                        </select>
                      </div>
                      <Button type="submit" className="w-full">
                        Simpan Perubahan
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>

                {user.username !== "admin" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-white/95 backdrop-blur-md border-white/20">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus User</AlertDialogTitle>
                        <AlertDialogDescription>
                          Apakah Anda yakin ingin menghapus user "{user.nama}"? Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(user.id)}
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
    </div>
  )
}
