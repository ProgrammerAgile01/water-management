import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface TarifConfig {
  tarifPerM3: number // renamed from tarifDasar to match meter reading requirements
  abonemen: number // added abonemen field for monthly subscription fee
  dendaBulanPertama: number // added first month late fee
  dendaBulanKedua: number // added second month late fee
  biayaAdmin: number
  batasMinimal: number
}

export interface SystemConfig {
  namaPerusahaan: string
  alamat: string
  telepon: string
  email: string
  logo?: string
}

export interface User {
  id: string
  username: string
  password: string
  role: "admin" | "petugas" | "warga"
  nama: string
  createdAt: string
  isActive: boolean
}

interface ConfigStore {
  tarif: TarifConfig
  system: SystemConfig
  users: User[]

  // Tarif actions
  updateTarif: (tarif: Partial<TarifConfig>) => void

  // System actions
  updateSystem: (system: Partial<SystemConfig>) => void

  // User actions
  addUser: (user: Omit<User, "id" | "createdAt">) => void
  updateUser: (id: string, user: Partial<User>) => void
  deleteUser: (id: string) => void
  toggleUserStatus: (id: string) => void
}

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set, get) => ({
      tarif: {
        tarifPerM3: 2500, // updated default tariff per m3
        abonemen: 10000, // added default monthly subscription fee
        dendaBulanPertama: 5000, // added first month late fee
        dendaBulanKedua: 10000, // added second month late fee
        biayaAdmin: 5000,
        batasMinimal: 10,
      },
      system: {
        namaPerusahaan: "Tirta Bening",
        alamat: "Jl. Air Bersih No. 123",
        telepon: "(021) 123-4567",
        email: "info@tirtabening.com",
      },
      users: [
        {
          id: "1",
          username: "admin",
          password: "admin123",
          role: "admin",
          nama: "Administrator",
          createdAt: "2024-01-01",
          isActive: true,
        },
        {
          id: "2",
          username: "petugas01",
          password: "petugas123",
          role: "petugas",
          nama: "Petugas Lapangan 1",
          createdAt: "2024-01-01",
          isActive: true,
        },
        {
          id: "3",
          username: "warga01",
          password: "warga123",
          role: "warga",
          nama: "Budi Santoso",
          createdAt: "2024-01-01",
          isActive: true,
        },
      ],

      updateTarif: (newTarif) =>
        set((state) => ({
          tarif: { ...state.tarif, ...newTarif },
        })),

      updateSystem: (newSystem) =>
        set((state) => ({
          system: { ...state.system, ...newSystem },
        })),

      addUser: (userData) =>
        set((state) => ({
          users: [
            ...state.users,
            {
              ...userData,
              id: Date.now().toString(),
              createdAt: new Date().toISOString().split("T")[0],
            },
          ],
        })),

      updateUser: (id, userData) =>
        set((state) => ({
          users: state.users.map((user) => (user.id === id ? { ...user, ...userData } : user)),
        })),

      deleteUser: (id) =>
        set((state) => ({
          users: state.users.filter((user) => user.id !== id),
        })),

      toggleUserStatus: (id) =>
        set((state) => ({
          users: state.users.map((user) => (user.id === id ? { ...user, isActive: !user.isActive } : user)),
        })),
    }),
    {
      name: "tirta-bening-config",
    },
  ),
)
