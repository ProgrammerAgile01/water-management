"use client"

import type React from "react"

import { useState } from "react"
import { useConfigStore } from "@/lib/config-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Save, Droplets } from "lucide-react"

export function TarifForm() {
  const { tarif, updateTarif } = useConfigStore()
  const { toast } = useToast()
  const [formData, setFormData] = useState(tarif)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateTarif(formData)
    toast({
      title: "Berhasil",
      description: "Tarif air berhasil diperbarui",
    })
  }

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: Number.parseFloat(value) || 0,
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Droplets className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">Tarif Air</h2>
      </div>

      <div>
        <Label htmlFor="tarif-dasar">Tarif Dasar (per m³)</Label>
        <Input
          id="tarif-dasar"
          type="number"
          value={formData.tarifDasar}
          onChange={(e) => handleChange("tarifDasar", e.target.value)}
          placeholder="2000"
        />
      </div>

      <div>
        <Label htmlFor="biaya-admin">Biaya Admin</Label>
        <Input
          id="biaya-admin"
          type="number"
          value={formData.biayaAdmin}
          onChange={(e) => handleChange("biayaAdmin", e.target.value)}
          placeholder="5000"
        />
      </div>

      <div>
        <Label htmlFor="denda-telat">Denda Keterlambatan (%)</Label>
        <Input
          id="denda-telat"
          type="number"
          value={formData.dendaTelat}
          onChange={(e) => handleChange("dendaTelat", e.target.value)}
          placeholder="10"
        />
      </div>

      <div>
        <Label htmlFor="batas-minimal">Batas Minimal (m³)</Label>
        <Input
          id="batas-minimal"
          type="number"
          value={formData.batasMinimal}
          onChange={(e) => handleChange("batasMinimal", e.target.value)}
          placeholder="10"
        />
      </div>

      <Button type="submit" className="w-full">
        <Save className="w-4 h-4 mr-2" />
        Simpan Tarif
      </Button>
    </form>
  )
}
