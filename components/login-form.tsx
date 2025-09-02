"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  })
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Simulate authentication
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const mockUsers = {
        admin: { password: "admin123", role: "admin", name: "Administrator" },
        petugas: { password: "petugas123", role: "petugas_catat", name: "Petugas Lapangan" },
        warga: { password: "warga123", role: "warga", name: "Budi Santoso" },
      }

      const user = mockUsers[formData.username as keyof typeof mockUsers]

      if (user && user.password === formData.password) {
        // Store user session
        localStorage.setItem(
          "user",
          JSON.stringify({
            username: formData.username,
            role: user.role,
            name: user.name,
            loginTime: new Date().toISOString(),
          }),
        )

        toast({
          title: "Login Berhasil",
          description: `Selamat datang, ${user.name}`,
        })

        if (user.role === "warga") {
          router.push("/warga-dashboard")
        } else {
          router.push("/dashboard")
        }
      } else {
        throw new Error("Invalid credentials")
      }
    } catch (error) {
      toast({
        title: "Login Gagal",
        description: "Username atau password salah",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username" className="text-base font-medium">
          Username
        </Label>
        <Input
          id="username"
          type="text"
          placeholder="Masukkan username"
          value={formData.username}
          onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
          className="h-12 text-base"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-base font-medium">
          Password
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="Masukkan password"
          value={formData.password}
          onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
          className="h-12 text-base"
          required
        />
      </div>

      <Button type="submit" className="w-full h-12 text-lg font-medium" disabled={isLoading}>
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Memproses...
          </div>
        ) : (
          "Masuk"
        )}
      </Button>

      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <p className="text-sm font-medium text-muted-foreground mb-2">Demo Credentials:</p>
        <div className="text-sm space-y-1">
          <p>
            <strong>Admin:</strong> admin / admin123
          </p>
          <p>
            <strong>Petugas:</strong> petugas / petugas123
          </p>
          <p>
            <strong>Warga:</strong> warga / warga123
          </p>
        </div>
      </div>
    </form>
  )
}
