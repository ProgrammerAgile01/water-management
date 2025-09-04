import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface Permission {
  id: string
  name: string
  description: string
  category: string
}

export interface RolePermission {
  roleId: string
  permissionId: string
  canView: boolean
  canAdd: boolean
  canEdit: boolean
  canDelete: boolean
}

export interface Role {
  id: string
  name: string
  description: string
  isActive: boolean
  createdAt: string
}

interface PermissionStore {
  permissions: Permission[]
  roles: Role[]
  rolePermissions: RolePermission[]

  // Permission actions
  addPermission: (permission: Omit<Permission, "id">) => void
  updatePermission: (id: string, permission: Partial<Permission>) => void
  deletePermission: (id: string) => void

  // Role actions
  addRole: (role: Omit<Role, "id" | "createdAt">) => void
  updateRole: (id: string, role: Partial<Role>) => void
  deleteRole: (id: string) => void
  toggleRoleStatus: (id: string) => void

  // Role Permission actions
  updateRolePermission: (
    roleId: string,
    permissionId: string,
    permissions: Partial<Omit<RolePermission, "roleId" | "permissionId">>,
  ) => void
  getRolePermissions: (roleId: string) => RolePermission[]
  hasPermission: (roleId: string, permissionId: string, action: "view" | "add" | "edit" | "delete") => boolean
}

export const usePermissionStore = create<PermissionStore>()(
  persist(
    (set, get) => ({
      permissions: [
        { id: "dashboard", name: "Dashboard", description: "Akses ke halaman dashboard utama", category: "Umum" },
        { id: "pelanggan", name: "Manajemen Pelanggan", description: "Kelola data pelanggan", category: "Pelanggan" },
        { id: "catat-meter", name: "Catat Meter", description: "Input pembacaan meter air", category: "Operasional" },
        { id: "pelunasan", name: "Pelunasan", description: "Proses pembayaran tagihan", category: "Keuangan" },
        { id: "laporan", name: "Laporan", description: "Akses laporan dan analitik", category: "Laporan" },
        {
          id: "kendala",
          name: "Kendala Air",
          description: "Manajemen kendala dan masalah air",
          category: "Operasional",
        },
        { id: "pengaturan", name: "Pengaturan", description: "Konfigurasi sistem dan tarif", category: "Sistem" },
        { id: "user-management", name: "Manajemen User", description: "Kelola pengguna sistem", category: "Sistem" },
      ],

      roles: [
        {
          id: "admin",
          name: "Administrator",
          description: "Akses penuh ke semua fitur sistem",
          isActive: true,
          createdAt: "2024-01-01",
        },
        {
          id: "petugas",
          name: "Petugas Lapangan",
          description: "Akses untuk operasional lapangan",
          isActive: true,
          createdAt: "2024-01-01",
        },
        {
          id: "warga",
          name: "Warga/Pelanggan",
          description: "Akses terbatas untuk pelanggan",
          isActive: true,
          createdAt: "2024-01-01",
        },
        {
          id: "supervisor",
          name: "Supervisor",
          description: "Akses supervisi dan monitoring",
          isActive: true,
          createdAt: "2024-01-01",
        },
        {
          id: "keuangan",
          name: "Staff Keuangan",
          description: "Akses khusus untuk bagian keuangan",
          isActive: true,
          createdAt: "2024-01-01",
        },
      ],

      rolePermissions: [
        // Admin - Full access
        { roleId: "admin", permissionId: "dashboard", canView: true, canAdd: true, canEdit: true, canDelete: true },
        { roleId: "admin", permissionId: "pelanggan", canView: true, canAdd: true, canEdit: true, canDelete: true },
        { roleId: "admin", permissionId: "catat-meter", canView: true, canAdd: true, canEdit: true, canDelete: true },
        { roleId: "admin", permissionId: "pelunasan", canView: true, canAdd: true, canEdit: true, canDelete: true },
        { roleId: "admin", permissionId: "laporan", canView: true, canAdd: true, canEdit: true, canDelete: true },
        { roleId: "admin", permissionId: "kendala", canView: true, canAdd: true, canEdit: true, canDelete: true },
        { roleId: "admin", permissionId: "pengaturan", canView: true, canAdd: true, canEdit: true, canDelete: true },
        {
          roleId: "admin",
          permissionId: "user-management",
          canView: true,
          canAdd: true,
          canEdit: true,
          canDelete: true,
        },

        // Petugas - Operational access
        {
          roleId: "petugas",
          permissionId: "dashboard",
          canView: true,
          canAdd: false,
          canEdit: false,
          canDelete: false,
        },
        { roleId: "petugas", permissionId: "pelanggan", canView: true, canAdd: true, canEdit: true, canDelete: false },
        {
          roleId: "petugas",
          permissionId: "catat-meter",
          canView: true,
          canAdd: true,
          canEdit: true,
          canDelete: false,
        },
        { roleId: "petugas", permissionId: "pelunasan", canView: true, canAdd: true, canEdit: false, canDelete: false },
        { roleId: "petugas", permissionId: "laporan", canView: true, canAdd: false, canEdit: false, canDelete: false },
        { roleId: "petugas", permissionId: "kendala", canView: true, canAdd: true, canEdit: true, canDelete: false },

        // Warga - Limited access
        { roleId: "warga", permissionId: "dashboard", canView: true, canAdd: false, canEdit: false, canDelete: false },
        { roleId: "warga", permissionId: "pelunasan", canView: true, canAdd: false, canEdit: false, canDelete: false },
        { roleId: "warga", permissionId: "kendala", canView: true, canAdd: true, canEdit: false, canDelete: false },

        // Supervisor - Monitoring access
        {
          roleId: "supervisor",
          permissionId: "dashboard",
          canView: true,
          canAdd: false,
          canEdit: false,
          canDelete: false,
        },
        {
          roleId: "supervisor",
          permissionId: "pelanggan",
          canView: true,
          canAdd: false,
          canEdit: false,
          canDelete: false,
        },
        {
          roleId: "supervisor",
          permissionId: "catat-meter",
          canView: true,
          canAdd: false,
          canEdit: false,
          canDelete: false,
        },
        {
          roleId: "supervisor",
          permissionId: "pelunasan",
          canView: true,
          canAdd: false,
          canEdit: false,
          canDelete: false,
        },
        {
          roleId: "supervisor",
          permissionId: "laporan",
          canView: true,
          canAdd: true,
          canEdit: false,
          canDelete: false,
        },
        {
          roleId: "supervisor",
          permissionId: "kendala",
          canView: true,
          canAdd: false,
          canEdit: true,
          canDelete: false,
        },

        // Keuangan - Financial access
        {
          roleId: "keuangan",
          permissionId: "dashboard",
          canView: true,
          canAdd: false,
          canEdit: false,
          canDelete: false,
        },
        {
          roleId: "keuangan",
          permissionId: "pelanggan",
          canView: true,
          canAdd: false,
          canEdit: false,
          canDelete: false,
        },
        { roleId: "keuangan", permissionId: "pelunasan", canView: true, canAdd: true, canEdit: true, canDelete: false },
        { roleId: "keuangan", permissionId: "laporan", canView: true, canAdd: true, canEdit: false, canDelete: false },
      ],

      addPermission: (permissionData) =>
        set((state) => ({
          permissions: [
            ...state.permissions,
            {
              ...permissionData,
              id: Date.now().toString(),
            },
          ],
        })),

      updatePermission: (id, permissionData) =>
        set((state) => ({
          permissions: state.permissions.map((permission) =>
            permission.id === id ? { ...permission, ...permissionData } : permission,
          ),
        })),

      deletePermission: (id) =>
        set((state) => ({
          permissions: state.permissions.filter((permission) => permission.id !== id),
          rolePermissions: state.rolePermissions.filter((rp) => rp.permissionId !== id),
        })),

      addRole: (roleData) =>
        set((state) => ({
          roles: [
            ...state.roles,
            {
              ...roleData,
              id: Date.now().toString(),
              createdAt: new Date().toISOString().split("T")[0],
            },
          ],
        })),

      updateRole: (id, roleData) =>
        set((state) => ({
          roles: state.roles.map((role) => (role.id === id ? { ...role, ...roleData } : role)),
        })),

      deleteRole: (id) =>
        set((state) => ({
          roles: state.roles.filter((role) => role.id !== id),
          rolePermissions: state.rolePermissions.filter((rp) => rp.roleId !== id),
        })),

      toggleRoleStatus: (id) =>
        set((state) => ({
          roles: state.roles.map((role) => (role.id === id ? { ...role, isActive: !role.isActive } : role)),
        })),

      updateRolePermission: (roleId, permissionId, permissions) =>
        set((state) => {
          const existingIndex = state.rolePermissions.findIndex(
            (rp) => rp.roleId === roleId && rp.permissionId === permissionId,
          )

          if (existingIndex >= 0) {
            const updated = [...state.rolePermissions]
            updated[existingIndex] = { ...updated[existingIndex], ...permissions }
            return { rolePermissions: updated }
          } else {
            return {
              rolePermissions: [
                ...state.rolePermissions,
                {
                  roleId,
                  permissionId,
                  canView: false,
                  canAdd: false,
                  canEdit: false,
                  canDelete: false,
                  ...permissions,
                },
              ],
            }
          }
        }),

      getRolePermissions: (roleId) => {
        const state = get()
        return state.rolePermissions.filter((rp) => rp.roleId === roleId)
      },

      hasPermission: (roleId, permissionId, action) => {
        const state = get()
        const rolePermission = state.rolePermissions.find(
          (rp) => rp.roleId === roleId && rp.permissionId === permissionId,
        )

        if (!rolePermission) return false

        switch (action) {
          case "view":
            return rolePermission.canView
          case "add":
            return rolePermission.canAdd
          case "edit":
            return rolePermission.canEdit
          case "delete":
            return rolePermission.canDelete
          default:
            return false
        }
      },
    }),
    {
      name: "tirta-bening-permissions",
    },
  ),
)
