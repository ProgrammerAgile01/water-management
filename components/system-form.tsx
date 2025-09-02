"use client"

import type React from "react"

import { useState } from "react"
import { useConfigStore } from "@/lib/config-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Save, Settings } from "lucide-react"

export function SystemForm() {
  const { system, updateSystem } = useConfigStore()
  const { toast } = useToast()
  const [formData, setFormData] = useState(system)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateSystem(formData)
    toast({
      title: "Berhasil",
      description: "Pengaturan sistem berhasil diperbarui",
    })
  }

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">Pengaturan Sistem</h2>
      </div>

      <div>
        <Label htmlFor="nama-perusahaan">Nama Perusahaan</Label>
        <Input
          id="nama-perusahaan"
          value={formData.namaPerusahaan}
          onChange={(e) => handleChange("namaPerusahaan", e.target.value)}
          placeholder="Tirta Bening"
        />
      </div>

      <div>
        <Label htmlFor="alamat">Alamat</Label>
        <Input
          id="alamat"
          value={formData.alamat}
          onChange={(e) => handleChange("alamat", e.target.value)}
          placeholder="Jl. Air Bersih No. 123"
        />
      </div>

      <div>
        <Label htmlFor="telepon">Telepon</Label>
        <Input
          id="telepon"
          value={formData.telepon}
          onChange={(e) => handleChange("telepon", e.target.value)}
          placeholder="(021) 123-4567"
        />
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
          placeholder="info@tirtabening.com"
        />
      </div>

      <Button type="submit" className="w-full">
        <Save className="w-4 h-4 mr-2" />
        Simpan Pengaturan
      </Button>
    </form>
  )
}
