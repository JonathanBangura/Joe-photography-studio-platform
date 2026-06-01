'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { createAuditLog } from '@/lib/audit-log-client'
import { Check, Eye, Save, Shield, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ACTION_LABELS,
  MODULE_LABELS,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  type Module,
  type PermissionAction,
  type RolePermission,
  type StudioRole,
} from '@/lib/permissions'

const roles: StudioRole[] = [
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

const modules: Module[] = [
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

const actions: PermissionAction[] = [
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

const defaultPermission = (role: StudioRole, module: Module): RolePermission => {
  const isSuperAdmin = role === 'super_admin'
  const isViewer = role === 'viewer'
  const baseViewModules: Module[] = ['dashboard']
  const financeModules: Module[] = ['invoices', 'expenses', 'reports']
  const galleryModules: Module[] = ['gallery', 'clients', 'bookings']
  const bookingModules: Module[] = ['dashboard', 'bookings', 'clients', 'inquiries']

  const canAccess =
    isSuperAdmin ||
    (role === 'studio_admin') ||
    (role === 'studio_manager' && !['permissions', 'settings'].includes(module)) ||
    (role === 'photographer' && ['dashboard', 'bookings', 'jobs', 'gallery'].includes(module)) ||
    (role === 'photo_editor' && ['dashboard', 'jobs', 'gallery'].includes(module)) ||
    (role === 'receptionist' && bookingModules.includes(module)) ||
    (role === 'finance_officer' && ['dashboard', ...financeModules].includes(module)) ||
    (role === 'gallery_manager' && galleryModules.includes(module)) ||
    (role === 'marketing_manager' && ['dashboard', 'gallery', 'services', 'inquiries'].includes(module)) ||
    (isViewer && baseViewModules.includes(module))

  return {
    id: '',
    role,
    module,
    can_access: canAccess,
    can_view: canAccess,
    can_create: isSuperAdmin || (!isViewer && canAccess && !['reports', 'audit_logs', 'settings'].includes(module)),
    can_edit: isSuperAdmin || (!isViewer && canAccess && !['reports', 'audit_logs'].includes(module)),
    can_delete: isSuperAdmin || (role === 'studio_admin' && !['audit_logs'].includes(module)),
    can_approve: isSuperAdmin || ['studio_admin', 'studio_manager', 'finance_officer'].includes(role),
    can_export: isSuperAdmin || ['studio_admin', 'studio_manager', 'finance_officer'].includes(role),
    can_assign_staff: isSuperAdmin || ['studio_admin', 'studio_manager', 'receptionist'].includes(role),
    can_upload_photos: isSuperAdmin || ['studio_admin', 'photographer', 'photo_editor', 'gallery_manager'].includes(role),
    can_publish_gallery: isSuperAdmin || ['studio_admin', 'gallery_manager', 'marketing_manager'].includes(role),
    can_send_invoice: isSuperAdmin || ['studio_admin', 'finance_officer', 'receptionist'].includes(role),
    can_record_payment: isSuperAdmin || ['studio_admin', 'finance_officer'].includes(role),
    can_issue_refund: isSuperAdmin || ['studio_admin', 'finance_officer'].includes(role),
    created_at: '',
    updated_at: '',
  }
}

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<RolePermission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [activeRole, setActiveRole] = useState<StudioRole>('studio_admin')
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = createClient()

  useEffect(() => {
    fetchPermissions()
  }, [])

  const fetchPermissions = async () => {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('*')
      .order('role')
      .order('module')

    if (error) {
      console.error(error)
      toast.error('Failed to load role permissions. Showing defaults.')
      initializeDefaultPermissions()
    } else if (data && data.length > 0) {
      const merged = roles.flatMap((role) =>
        modules.map((module) => {
          const existing = data.find((p) => p.role === role && p.module === module)
          return existing || defaultPermission(role, module)
        })
      ) as RolePermission[]
      setPermissions(merged)
    } else {
      initializeDefaultPermissions()
    }
    setLoading(false)
  }

  const initializeDefaultPermissions = () => {
    setPermissions(roles.flatMap((role) => modules.map((module) => defaultPermission(role, module))))
  }

  const visibleModules = useMemo(
    () => modules.filter((module) => MODULE_LABELS[module].toLowerCase().includes(searchQuery.toLowerCase())),
    [searchQuery]
  )

  const getPermission = (role: StudioRole, module: Module): RolePermission => {
    return permissions.find((p) => p.role === role && p.module === module) || defaultPermission(role, module)
  }

  const updatePermission = (role: StudioRole, module: Module, action: PermissionAction, value: boolean) => {
    if (role === 'super_admin') {
      toast.info('Super Admin always keeps full access.')
      return
    }

    setHasChanges(true)
    setPermissions((prev) => {
      const existing = prev.find((p) => p.role === role && p.module === module)
      const next = existing || defaultPermission(role, module)
      const updated = { ...next, [action]: value }

      if (action === 'can_access' && !value) {
        for (const permissionAction of actions) updated[permissionAction] = false
      }
      if (action !== 'can_access' && value) {
        updated.can_access = true
        updated.can_view = true
      }

      if (existing) {
        return prev.map((p) => (p.role === role && p.module === module ? updated : p))
      }
      return [...prev, updated]
    })
  }

  const applyBulk = (action: 'grant_view' | 'revoke_delete' | 'clear_role') => {
    if (activeRole === 'super_admin') {
      toast.info('Super Admin permissions cannot be restricted.')
      return
    }

    setHasChanges(true)
    setPermissions((prev) =>
      prev.map((permission) => {
        if (permission.role !== activeRole) return permission
        if (action === 'grant_view') return { ...permission, can_access: true, can_view: true }
        if (action === 'revoke_delete') return { ...permission, can_delete: false }
        return { ...permission, ...Object.fromEntries(actions.map((item) => [item, false])) }
      }) as RolePermission[]
    )
  }

  const savePermissions = async () => {
    setSaving(true)

    for (const permission of permissions) {
      const payload = {
        role: permission.role,
        module: permission.module,
        can_access: permission.can_access,
        can_view: permission.can_view,
        can_create: permission.can_create,
        can_edit: permission.can_edit,
        can_delete: permission.can_delete,
        can_approve: permission.can_approve,
        can_export: permission.can_export,
        can_assign_staff: permission.can_assign_staff,
        can_upload_photos: permission.can_upload_photos,
        can_publish_gallery: permission.can_publish_gallery,
        can_send_invoice: permission.can_send_invoice,
        can_record_payment: permission.can_record_payment,
        can_issue_refund: permission.can_issue_refund,
        updated_at: new Date().toISOString(),
      }

      const { error } = permission.id
        ? await supabase.from('role_permissions').update(payload).eq('id', permission.id)
        : await supabase.from('role_permissions').insert(payload)

      if (error) {
        console.error(error)
        toast.error('Failed to save some permissions')
        setSaving(false)
        return
      }
    }

    await createAuditLog({
      action: 'permission_change',
      resource_type: 'role_permissions',
      new_data: { updated_permissions: permissions.length },
    })

    toast.success('Role permissions saved successfully')
    setHasChanges(false)
    setSaving(false)
    fetchPermissions()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Roles & Permissions</h1>
          <p className="text-muted-foreground">Manage module visibility and action-level access for studio roles.</p>
        </div>
        <Button onClick={savePermissions} disabled={!hasChanges || saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                <Check className="w-3 h-3 mr-1" /> Allowed
              </Badge>
              <span className="text-muted-foreground">User can perform this action</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                <X className="w-3 h-3 mr-1" /> Denied
              </Badge>
              <span className="text-muted-foreground">User cannot perform this action</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeRole} onValueChange={(value) => setActiveRole(value as StudioRole)}>
        <TabsList className="flex h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
          {roles.map((role) => (
            <TabsTrigger key={role} value={role} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Shield className="w-4 h-4 mr-2" />
              {ROLE_LABELS[role]}
            </TabsTrigger>
          ))}
        </TabsList>

        {roles.map((role) => (
          <TabsContent key={role} value={role}>
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <CardTitle>{ROLE_LABELS[role]}</CardTitle>
                    <CardDescription>{ROLE_DESCRIPTIONS[role]}</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => applyBulk('grant_view')}>Grant all View</Button>
                    <Button variant="outline" size="sm" onClick={() => applyBulk('revoke_delete')}>Revoke all Delete</Button>
                    <Button variant="destructive" size="sm" onClick={() => applyBulk('clear_role')}>Clear Role</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative max-w-sm">
                  <Eye className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search modules..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[190px]">Module</TableHead>
                        {actions.map((action) => (
                          <TableHead key={action} className="text-center whitespace-nowrap">
                            {ACTION_LABELS[action]}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleModules.map((module) => {
                        const permission = getPermission(role, module)
                        const isHidden = !permission.can_access
                        return (
                          <TableRow key={module} className={isHidden ? 'opacity-60' : ''}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{MODULE_LABELS[module]}</p>
                                <p className="text-xs text-muted-foreground">{isHidden ? 'Hidden from this role' : 'Visible to this role'}</p>
                              </div>
                            </TableCell>
                            {actions.map((action) => (
                              <TableCell key={action} className="text-center">
                                <Checkbox
                                  checked={permission[action] === true}
                                  disabled={role === 'super_admin' || (action !== 'can_access' && !permission.can_access)}
                                  onCheckedChange={(checked) => updatePermission(role, module, action, !!checked)}
                                />
                              </TableCell>
                            ))}
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
