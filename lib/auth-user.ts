// lib/auth-user.ts
export function getCurrentUser() {
    if (typeof window === "undefined") return null
    try {
      const raw = localStorage.getItem("tb_user")
      if (!raw) return null
      return JSON.parse(raw) as { id: string; name: string; role: string }
    } catch {
      return null
    }
  }