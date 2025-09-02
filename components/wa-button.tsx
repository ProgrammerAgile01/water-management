"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import type { ReactNode } from "react"

interface WAButtonProps {
  message: string
  phone?: string
  pdfUrl?: string
  children: ReactNode
  className?: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
}

export function WAButton({ message, phone, pdfUrl, children, className, variant = "default" }: WAButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSendWhatsApp = async () => {
    setIsLoading(true)

    try {
      // Simulate API call to WhatsApp service
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // In real app, this would call WhatsApp API
      const whatsappData = {
        phone: phone || "broadcast", // If no phone, send to all customers
        message,
        pdfUrl,
        timestamp: new Date().toISOString(),
      }

      console.log("WhatsApp API call:", whatsappData)

      toast({
        title: "Pesan Terkirim",
        description: phone ? `Pesan berhasil dikirim ke ${phone}` : "Pesan berhasil dikirim ke semua pelanggan",
      })
    } catch (error) {
      toast({
        title: "Gagal Mengirim Pesan",
        description: "Terjadi kesalahan saat mengirim pesan WhatsApp",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleSendWhatsApp} disabled={isLoading} variant={variant} className={className}>
      {isLoading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Mengirim...
        </div>
      ) : (
        children
      )}
    </Button>
  )
}
