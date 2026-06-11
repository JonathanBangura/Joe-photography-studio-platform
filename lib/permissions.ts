import type { StudioRole, RolePermission as DatabaseRolePermission } from '@/lib/types'

export type { StudioRole }

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

export interface RolePermission extends DatabaseRolePermission {
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

export const ALL_STUDIO_ROLES: StudioRole[] = [
  'super_admin',
  'studio_admin',
  'studio_manager',
  'photographer',
  'photo_editor',
  'receptionist',
  'finance_officer',
  'gallery_manager',
  'marketing_manager',
  'viewer',
]

export const ALL_MODULES: Module[] = [
  'dashboard',
  'bookings',
  'jobs',
  'clients',
  'inquiries',
  'gallery',
  'services',
  'invoices',
  'expenses',
  'reports',
  'equipment',
  'staff',
  'users',
  'permissions',
  'audit_logs',
  'settings',
]

export const ALL_PERMISSION_ACTIONS: PermissionAction[] = [
  'can_access',
  'can_view',
  'can_create',
  'can_edit',
  'can_delete',
  'can_approve',
  'can_export',
  'can_assign_staff',
  'can_upload_photos',
  'can_publish_gallery',
  'can_send_invoice',
  'can_record_payment',
  'can_issue_refund',
]

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
  super_admin: 'Full system access with ability to manage all users and settings.',
  studio_admin: 'Administrative access to most operational areas.',
  studio_manager: 'Manages bookings, clients, staff scheduling, and workflow.',
  photographer: 'Handles photo sessions, assigned jobs, and uploads photos.',
  photo_editor: 'Processes photos and updates editing workflow stages.',
  receptionist: 'Manages bookings, clients, and front-desk inquiries.',
  finance_officer: 'Handles invoices, payments, expenses, and financial reports.',
  gallery_manager: 'Manages client galleries, photo delivery, and publishing.',
  marketing_manager: 'Manages website content, public gallery, services, and inquiries.',
  viewer: 'Read-only access to limited information.',
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

export function isSuperAdmin(role?: StudioRole | null) {
  return role === 'super_admin'
}

export function getModuleFromPath(pathname: string): Module {
  if (pathname === '/admin' || pathname === '/admin/') return 'dashboard'

  const segments = pathname.split('/').filter(Boolean)
  const adminChild = segments[1]

  switch (adminChild) {
    case 'bookings':
      return 'bookings'
    case 'jobs':
      return 'jobs'
    case 'clients':
      return 'clients'
    case 'inquiries':
      return 'inquiries'
    case 'testimonials':
      return 'inquiries'
    case 'gallery':
      return 'gallery'
    case 'services':
      return 'services'
    case 'invoices':
      return 'invoices'
    case 'expenses':
      return 'expenses'
    case 'reports':
      return 'reports'
    case 'equipment':
      return 'equipment'
    case 'staff':
      return 'staff'
    case 'users':
      return 'users'
    case 'permissions':
      return 'permissions'
    case 'audit-logs':
      return 'audit_logs'
    case 'settings':
      return 'settings'
    default:
      return 'dashboard'
  }
}

export function checkPermissionSync(
  permissions: RolePermission[],
  role: StudioRole,
  module: Module,
  action: PermissionAction,
): boolean {
  if (isSuperAdmin(role)) return true

  const modulePermission = permissions.find((p) => p.role === role && p.module === module)
  if (!modulePermission) return false

  if (action !== 'can_access' && !modulePermission.can_access) return false

  return modulePermission[action] === true
}

export function canAccessModuleSync(
  permissions: RolePermission[],
  role: StudioRole,
  module: Module,
): boolean {
  return checkPermissionSync(permissions, role, module, 'can_access')
}

export function canPerformActionSync(
  permissions: RolePermission[],
  role: StudioRole,
  module: Module,
  action: PermissionAction,
): boolean {
  return checkPermissionSync(permissions, role, module, action)
}

export function getAccessibleModulesSync(permissions: RolePermission[], role: StudioRole): Module[] {
  if (isSuperAdmin(role)) return ALL_MODULES
  return permissions
    .filter((permission) => permission.role === role && permission.can_access)
    .map((permission) => permission.module as Module)
}

export function getDefaultPermission(role: StudioRole, module: Module): RolePermission {
  const isViewer = role === 'viewer'
  const canAccess =
    role === 'super_admin' ||
    role === 'studio_admin' ||
    (role === 'studio_manager' && !['permissions', 'settings'].includes(module)) ||
    (role === 'photographer' && ['dashboard', 'bookings', 'jobs', 'gallery'].includes(module)) ||
    (role === 'photo_editor' && ['dashboard', 'jobs', 'gallery'].includes(module)) ||
    (role === 'receptionist' && ['dashboard', 'bookings', 'clients', 'inquiries', 'invoices'].includes(module)) ||
    (role === 'finance_officer' && ['dashboard', 'invoices', 'expenses', 'reports'].includes(module)) ||
    (role === 'gallery_manager' && ['dashboard', 'gallery', 'clients', 'bookings'].includes(module)) ||
    (role === 'marketing_manager' && ['dashboard', 'gallery', 'services', 'inquiries'].includes(module)) ||
    (isViewer && ['dashboard'].includes(module))

  return {
    id: '',
    role,
    module,
    can_access: canAccess,
    can_view: canAccess,
    can_create: role === 'super_admin' || (!isViewer && canAccess && !['reports', 'audit_logs', 'settings'].includes(module)),
    can_edit: role === 'super_admin' || (!isViewer && canAccess && !['reports', 'audit_logs'].includes(module)),
    can_delete: role === 'super_admin' || (role === 'studio_admin' && module !== 'audit_logs'),
    can_approve: role === 'super_admin' || ['studio_admin', 'studio_manager', 'finance_officer'].includes(role),
    can_export: role === 'super_admin' || ['studio_admin', 'studio_manager', 'finance_officer'].includes(role),
    can_assign_staff: role === 'super_admin' || ['studio_admin', 'studio_manager', 'receptionist'].includes(role),
    can_upload_photos: role === 'super_admin' || ['studio_admin', 'photographer', 'photo_editor', 'gallery_manager'].includes(role),
    can_publish_gallery: role === 'super_admin' || ['studio_admin', 'gallery_manager', 'marketing_manager'].includes(role),
    can_send_invoice: role === 'super_admin' || ['studio_admin', 'finance_officer', 'receptionist'].includes(role),
    can_record_payment: role === 'super_admin' || ['studio_admin', 'finance_officer'].includes(role),
    can_issue_refund: role === 'super_admin' || ['studio_admin', 'finance_officer'].includes(role),
    created_at: '',
    updated_at: '',
  }
}

export function buildDefaultRolePermissions(): RolePermission[] {
  return ALL_STUDIO_ROLES.flatMap((role) => ALL_MODULES.map((module) => getDefaultPermission(role, module)))
}
