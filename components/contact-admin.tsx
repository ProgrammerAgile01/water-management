"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { WAButton } from "./wa-button"
import { Phone, Mail, MessageCircle, Clock, MapPin } from "lucide-react"

interface ContactFormData {
  nama: string
  noTelepon: string
  email: string
  jenisKendala: string
  pesan: string
}

export function ContactAdmin() {
  const [formData, setFormData] = useState<ContactFormData>({
    nama: "",
    noTelepon: "",
    email: "",
    jenisKendala: "",
    pesan: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // In real app, save to database or send email
      console.log("Contact form data:", formData)

      toast({
        title: "Pesan Terkirim",
        description: "Pesan Anda telah dikirim ke admin. Kami akan segera merespons.",
      })

      // Reset form
      setFormData({
        nama: "",
        noTelepon: "",
        email: "",
        jenisKendala: "",
        pesan: "",
      })
    } catch (error) {
      toast({
        title: "Gagal Mengirim Pesan",
        description: "Terjadi kesalahan, silakan coba lagi",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const adminWhatsAppMessage = `Halo Admin Tirta Bening,

Nama: ${formData.nama}
No. Telepon: ${formData.noTelepon}
Email: ${formData.email}
Jenis Kendala: ${formData.jenisKendala}

Pesan:
${formData.pesan}

Mohon bantuan dan tanggapannya. Terima kasih.`

  return (
    <div className="space-y-8">
      {/* Quick Contact Methods */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-green-50/50 border border-green-100/50 rounded-lg text-center">
          <Phone className="w-8 h-8 text-green-600 mx-auto mb-3" />
          <h3 className="font-medium text-foreground mb-2">Telepon</h3>
          <p className="text-sm text-muted-foreground mb-3">Hubungi langsung admin</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("tel:+6281234567890")}
            className="bg-transparent"
          >
            081-234-567-890
          </Button>
        </div>

        <div className="p-4 bg-blue-50/50 border border-blue-100/50 rounded-lg text-center">
          <Mail className="w-8 h-8 text-blue-600 mx-auto mb-3" />
          <h3 className="font-medium text-foreground mb-2">Email</h3>
          <p className="text-sm text-muted-foreground mb-3">Kirim email ke admin</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("mailto:admin@tirtabening.com")}
            className="bg-transparent"
          >
            admin@tirtabening.com
          </Button>
        </div>

        <div className="p-4 bg-teal-50/50 border border-teal-100/50 rounded-lg text-center">
          <MessageCircle className="w-8 h-8 text-teal-600 mx-auto mb-3" />
          <h3 className="font-medium text-foreground mb-2">WhatsApp</h3>
          <p className="text-sm text-muted-foreground mb-3">Chat langsung via WA</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("https://wa.me/6281234567890?text=Halo Admin Tirta Bening, saya butuh bantuan.")}
            className="bg-transparent"
          >
            Chat WhatsApp
          </Button>
        </div>
      </div>

      {/* Office Hours & Location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 bg-muted/20 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="font-medium text-foreground">Jam Operasional</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Senin - Jumat:</span>
              <span className="font-medium">08:00 - 17:00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sabtu:</span>
              <span className="font-medium">08:00 - 12:00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Minggu:</span>
              <span className="font-medium text-red-600">Tutup</span>
            </div>
            <div className="mt-3 p-2 bg-yellow-50/50 rounded text-xs text-yellow-700">
              <strong>Darurat 24 Jam:</strong> 081-234-567-890
            </div>
          </div>
        </div>

        <div className="p-4 bg-muted/20 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <MapPin className="w-5 h-5 text-primary" />
            <h3 className="font-medium text-foreground">Alamat Kantor</h3>
          </div>
          <div className="text-sm space-y-2">
            <p className="text-muted-foreground">
              Jl. Tirta Bening No. 123
              <br />
              Kelurahan Sumber Air
              <br />
              Kecamatan Air Bersih
              <br />
              Kota Sejahtera 12345
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open("https://maps.google.com/?q=Tirta+Bening+Office")}
              className="bg-transparent mt-2"
            >
              Buka di Maps
            </Button>
          </div>
        </div>
      </div>

      {/* Contact Form */}
      <div className="p-6 bg-card/50 border border-border/20 rounded-lg">
        <h3 className="text-lg font-medium text-foreground mb-4">Kirim Pesan ke Admin</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nama" className="text-sm font-medium">
                Nama Lengkap *
              </Label>
              <Input
                id="nama"
                type="text"
                placeholder="Masukkan nama lengkap"
                value={formData.nama}
                onChange={(e) => handleInputChange("nama", e.target.value)}
                className="h-10"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="noTelepon" className="text-sm font-medium">
                No. Telepon *
              </Label>
              <Input
                id="noTelepon"
                type="tel"
                placeholder="081234567890"
                value={formData.noTelepon}
                onChange={(e) => handleInputChange("noTelepon", e.target.value)}
                className="h-10"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jenisKendala" className="text-sm font-medium">
                Jenis Kendala *
              </Label>
              <Select value={formData.jenisKendala} onValueChange={(value) => handleInputChange("jenisKendala", value)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Pilih jenis kendala..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tagihan">Masalah Tagihan</SelectItem>
                  <SelectItem value="teknis">Masalah Teknis</SelectItem>
                  <SelectItem value="pelayanan">Keluhan Pelayanan</SelectItem>
                  <SelectItem value="pembayaran">Masalah Pembayaran</SelectItem>
                  <SelectItem value="meter">Masalah Meter Air</SelectItem>
                  <SelectItem value="kualitas">Kualitas Air</SelectItem>
                  <SelectItem value="lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pesan" className="text-sm font-medium">
              Pesan *
            </Label>
            <Textarea
              id="pesan"
              placeholder="Jelaskan kendala atau pertanyaan Anda secara detail..."
              value={formData.pesan}
              onChange={(e) => handleInputChange("pesan", e.target.value)}
              className="min-h-[100px] resize-none"
              required
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Mengirim...
                </div>
              ) : (
                "Kirim Pesan"
              )}
            </Button>

            {formData.nama && formData.noTelepon && formData.jenisKendala && formData.pesan && (
              <WAButton
                message={adminWhatsAppMessage}
                phone="6281234567890"
                variant="outline"
                className="flex-1 bg-transparent"
              >
                Kirim via WhatsApp
              </WAButton>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
