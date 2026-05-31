'use client'

import { createClient } from '@/lib/supabase/client'

export type StudioRole =
  | 'super_admin'
  | 'studio_admin'
  | 'studio_manager'
  | 'photographer'
  | 'photo_editor'
  | 'receptionist'
  | 'finance_officer'
  | 'gallery_manager'
  | 'marketing_manager'
  | 'viewer'

export type Module =
  | 'dashboard'
  | 'bookings'
  | 'jobs'
  | 'clients'
  | 'inquiries'
  | 'gallery'
  | 'services'
  | 'invoices'
  | 'expenses'
  | 'reports'
  | 'equipment'
  | 'staff'
  | 'users'
  | 'permissions'
  | 'audit_logs'
  | 'settings'

export type PermissionAction =
  | 'can_access'
  | 'can_view'
  | 'can_create'
  | 'can_edit'
  | 'can_delete'
  | 'can_approve'
  | 'can_export'
  | 'can_assign_staff'
  | 'can_upload_photos'
  | 'can_publish_gallery'
  | 'can_send_invoice'
  | 'can_record_payment'
  | 'can_issue_refund'

export interface RolePermission {
  id: string
  role: StudioRole
  module: Module
  can_access: boolean
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
  can_approve: boolean
  can_export: boolean
  can_assign_staff: boolean
  can_upload_photos: boolean
  can_publish_gallery: boolean
  can_send_invoice: boolean
  can_record_payment: boolean
  can_issue_refund: boolean
}

export const ROLE_LABELS: Record<StudioRole, string> = {
  super_admin: 'Super Admin',
  studio_admin: 'Studio Admin',
  studio_manager: 'Studio Manager',
  photographer: 'Photographer',
  photo_editor: 'Photo Editor',
  receptionist: 'Receptionist',
  finance_officer: 'Finance Officer',
  gallery_manager: 'Gallery Manager',
  marketing_manager: 'Marketing Manager',
  viewer: 'Viewer',
}

export const ROLE_DESCRIPTIONS: Record<StudioRole, string> = {
  super_admin: 'Full system access with ability to manage all users and settings',
  studio_admin: 'Administrative access to most features except super admin management',
  studio_manager: 'Manages daily operations, bookings, staff scheduling, and approvals',
  photographer: 'Handles photo sessions, uploads photos, and manages assigned jobs',
  photo_editor: 'Edits and processes photos, manages gallery content',
  receptionist: 'Manages bookings, client inquiries, and front desk operations',
  finance_officer: 'Handles invoices, expenses, payments, and financial reports',
  gallery_manager: 'Curates and publishes gallery content, manages client galleries',
  marketing_manager: 'Manages services, gallery for marketing, and client communications',
  viewer: 'Read-only access to basic information',
}

export const MODULE_LABELS: Record<Module, string> = {
  dashboard: 'Dashboard',
  bookings: 'Bookings',
  jobs: 'Job Tracker',
  clients: 'Clients',
  inquiries: 'Inquiries',
  gallery: 'Gallery',
  services: 'Services',
  invoices: 'Invoices',
  expenses: 'Expenses',
  reports: 'Reports',
  equipment: 'Equipment',
  staff: 'Staff',
  users: 'Users',
  permissions: 'Permissions',
  audit_logs: 'Audit Logs',
  settings: 'Settings',
}

export const ACTION_LABELS: Record<PermissionAction, string> = {
  can_access: 'Access',
  can_view: 'View',
  can_create: 'Create',
  can_edit: 'Edit',
  can_delete: 'Delete',
  can_approve: 'Approve',
  can_export: 'Export',
  can_assign_staff: 'Assign Staff',
  can_upload_photos: 'Upload Photos',
  can_publish_gallery: 'Publish Gallery',
  can_send_invoice: 'Send Invoice',
  can_record_payment: 'Record Payment',
  can_issue_refund: 'Issue Refund',
}

// Cache for permissions
let permissionsCache: RolePermission[] | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function fetchPermissions(): Promise<RolePermission[]> {
  const now = Date.now()
  if (permissionsCache && now - cacheTimestamp < CACHE_TTL) {
    return permissionsCache
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('role_permissions')
    .select('*')
    .order('role')
    .order('module')

  if (error) {
    console.error('Error fetching permissions:', error)
    return []
  }

  permissionsCache = data as RolePermission[]
  cacheTimestamp = now
  return permissionsCache
}

export function clearPermissionsCache() {
  permissionsCache = null
  cacheTimestamp = 0
}

export async function getPermissionsForRole(role: StudioRole): Promise<RolePermission[]> {
  const allPermissions = await fetchPermissions()
  return allPermissions.filter((p) => p.role === role)
}

export async function checkPermission(
  role: StudioRole,
  module: Module,
  action: PermissionAction
): Promise<boolean> {
  const permissions = await getPermissionsForRole(role)
  const modulePermission = permissions.find((p) => p.module === module)
  if (!modulePermission) return false
  return modulePermission[action] === true
}

export async function canAccessModule(role: StudioRole, module: Module): Promise<boolean> {
  return checkPermission(role, module, 'can_access')
}

export async function getAccessibleModules(role: StudioRole): Promise<Module[]> {
  const permissions = await getPermissionsForRole(role)
  return permissions.filter((p) => p.can_access).map((p) => p.module as Module)
}

// Synchronous permission check using pre-fetched permissions
export function checkPermissionSync(
  permissions: RolePermission[],
  role: StudioRole,
  module: Module,
  action: PermissionAction
): boolean {
  const modulePermission = permissions.find((p) => p.role === role && p.module === module)
  if (!modulePermission) return false
  return modulePermission[action] === true
}

export function canAccessModuleSync(
  permissions: RolePermission[],
  role: StudioRole,
  module: Module
): boolean {
  return checkPermissionSync(permissions, role, module, 'can_access')
}

export function getAccessibleModulesSync(permissions: RolePermission[], role: StudioRole): Module[] {
  return permissions
    .filter((p) => p.role === role && p.can_access)
    .map((p) => p.module as Module)
}
