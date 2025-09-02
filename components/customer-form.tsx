"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

interface CustomerData {
  nama: string
  noWA: string
  kodeCustomer: string
  alamat: string
  meterAwal: string
}

export function CustomerForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<CustomerData>({
    nama: "",
    noWA: "",
    kodeCustomer: "",
    alamat: "",
    meterAwal: "",
  })
  const { toast } = useToast()

  // Generate customer code automatically
  const generateCustomerCode = () => {
    const timestamp = Date.now().toString().slice(-6)
    const randomNum = Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, "0")
    return `TB${timestamp}${randomNum}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Auto-generate customer code if empty
      const customerCode = formData.kodeCustomer || generateCustomerCode()

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // In real app, save to database
      console.log("Customer data:", { ...formData, kodeCustomer: customerCode })

      toast({
        title: "Pelanggan Berhasil Ditambahkan",
        description: `Kode Customer: ${customerCode}`,
      })

      // Reset form
      setFormData({
        nama: "",
        noWA: "",
        kodeCustomer: "",
        alamat: "",
        meterAwal: "",
      })
    } catch (error) {
      toast({
        title: "Gagal Menambahkan Pelanggan",
        description: "Terjadi kesalahan, silakan coba lagi",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof CustomerData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Nama */}
        <div className="space-y-2">
          <Label htmlFor="nama" className="text-base font-medium">
            Nama Lengkap *
          </Label>
          <Input
            id="nama"
            type="text"
            placeholder="Masukkan nama lengkap"
            value={formData.nama}
            onChange={(e) => handleInputChange("nama", e.target.value)}
            className="h-12 text-base"
            required
          />
        </div>

        {/* No WhatsApp */}
        <div className="space-y-2">
          <Label htmlFor="noWA" className="text-base font-medium">
            No. WhatsApp *
          </Label>
          <Input
            id="noWA"
            type="tel"
            placeholder="08xxxxxxxxxx"
            value={formData.noWA}
            onChange={(e) => handleInputChange("noWA", e.target.value)}
            className="h-12 text-base"
            required
          />
        </div>

        {/* Kode Customer */}
        <div className="space-y-2">
          <Label htmlFor="kodeCustomer" className="text-base font-medium">
            Kode Customer
          </Label>
          <div className="flex gap-2">
            <Input
              id="kodeCustomer"
              type="text"
              placeholder="Auto generate jika kosong"
              value={formData.kodeCustomer}
              onChange={(e) => handleInputChange("kodeCustomer", e.target.value)}
              className="h-12 text-base"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => handleInputChange("kodeCustomer", generateCustomerCode())}
              className="h-12 px-4 bg-transparent"
            >
              Generate
            </Button>
          </div>
        </div>

        {/* Meter Awal */}
        <div className="space-y-2">
          <Label htmlFor="meterAwal" className="text-base font-medium">
            Meter Awal *
          </Label>
          <Input
            id="meterAwal"
            type="number"
            placeholder="0"
            value={formData.meterAwal}
            onChange={(e) => handleInputChange("meterAwal", e.target.value)}
            className="h-12 text-base"
            required
            min="0"
          />
        </div>
      </div>

      {/* Alamat */}
      <div className="space-y-2">
        <Label htmlFor="alamat" className="text-base font-medium">
          Alamat Lengkap *
        </Label>
        <Textarea
          id="alamat"
          placeholder="Masukkan alamat lengkap"
          value={formData.alamat}
          onChange={(e) => handleInputChange("alamat", e.target.value)}
          className="min-h-[100px] text-base resize-none"
          required
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" className="px-8 h-12 text-base" disabled={isLoading}>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Menyimpan...
            </div>
          ) : (
            "Simpan Pelanggan"
          )}
        </Button>
      </div>
    </form>
  )
}
