'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Shield, Check, X, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type UserRole = 'admin' | 'staff' | 'client'

interface Permission {
  id?: string
  role: UserRole
  resource: string
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
}

const resources = [
  { key: 'bookings', label: 'Bookings', description: 'Client session bookings' },
  { key: 'clients', label: 'Clients', description: 'Client information and records' },
  { key: 'invoices', label: 'Invoices', description: 'Billing and invoices' },
  { key: 'payments', label: 'Payments', description: 'Payment records' },
  { key: 'gallery', label: 'Gallery', description: 'Portfolio and photos' },
  { key: 'services', label: 'Services', description: 'Service packages' },
  { key: 'expenses', label: 'Expenses', description: 'Business expenses' },
  { key: 'equipment', label: 'Equipment', description: 'Equipment inventory' },
  { key: 'staff', label: 'Staff', description: 'Staff management' },
  { key: 'users', label: 'Users', description: 'User accounts' },
  { key: 'settings', label: 'Settings', description: 'System settings' },
  { key: 'reports', label: 'Reports', description: 'Analytics and reports' },
  { key: 'audit_logs', label: 'Audit Logs', description: 'System audit logs' },
]

const roles: UserRole[] = ['admin', 'staff', 'client']

const defaultPermissions: Record<UserRole, Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }>> = {
  admin: {
    bookings: { view: true, create: true, edit: true, delete: true },
    clients: { view: true, create: true, edit: true, delete: true },
    invoices: { view: true, create: true, edit: true, delete: true },
    payments: { view: true, create: true, edit: true, delete: true },
    gallery: { view: true, create: true, edit: true, delete: true },
    services: { view: true, create: true, edit: true, delete: true },
    expenses: { view: true, create: true, edit: true, delete: true },
    equipment: { view: true, create: true, edit: true, delete: true },
    staff: { view: true, create: true, edit: true, delete: true },
    users: { view: true, create: true, edit: true, delete: true },
    settings: { view: true, create: true, edit: true, delete: true },
    reports: { view: true, create: true, edit: true, delete: true },
    audit_logs: { view: true, create: false, edit: false, delete: false },
  },
  staff: {
    bookings: { view: true, create: true, edit: true, delete: false },
    clients: { view: true, create: true, edit: true, delete: false },
    invoices: { view: true, create: true, edit: true, delete: false },
    payments: { view: true, create: false, edit: false, delete: false },
    gallery: { view: true, create: true, edit: true, delete: false },
    services: { view: true, create: false, edit: false, delete: false },
    expenses: { view: true, create: true, edit: false, delete: false },
    equipment: { view: true, create: false, edit: false, delete: false },
    staff: { view: true, create: false, edit: false, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
    reports: { view: true, create: false, edit: false, delete: false },
    audit_logs: { view: false, create: false, edit: false, delete: false },
  },
  client: {
    bookings: { view: true, create: true, edit: false, delete: false },
    clients: { view: false, create: false, edit: false, delete: false },
    invoices: { view: true, create: false, edit: false, delete: false },
    payments: { view: true, create: false, edit: false, delete: false },
    gallery: { view: true, create: false, edit: false, delete: false },
    services: { view: true, create: false, edit: false, delete: false },
    expenses: { view: false, create: false, edit: false, delete: false },
    equipment: { view: false, create: false, edit: false, delete: false },
    staff: { view: false, create: false, edit: false, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
    reports: { view: false, create: false, edit: false, delete: false },
    audit_logs: { view: false, create: false, edit: false, delete: false },
  },
}

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [activeRole, setActiveRole] = useState<UserRole>('admin')
  const supabase = createClient()

  useEffect(() => {
    fetchPermissions()
  }, [])

  const fetchPermissions = async () => {
    const { data, error } = await supabase.from('permissions').select('*')

    if (error) {
      console.error(error)
      // Initialize with defaults if no permissions exist
      initializeDefaultPermissions()
    } else if (data && data.length > 0) {
      setPermissions(data)
    } else {
      initializeDefaultPermissions()
    }
    setLoading(false)
  }

  const initializeDefaultPermissions = () => {
    const perms: Permission[] = []
    for (const role of roles) {
      for (const resource of resources) {
        const defaults = defaultPermissions[role][resource.key]
        perms.push({
          role,
          resource: resource.key,
          can_view: defaults?.view ?? false,
          can_create: defaults?.create ?? false,
          can_edit: defaults?.edit ?? false,
          can_delete: defaults?.delete ?? false,
        })
      }
    }
    setPermissions(perms)
  }

  const getPermission = (role: UserRole, resource: string): Permission => {
    const found = permissions.find((p) => p.role === role && p.resource === resource)
    if (found) return found
    const defaults = defaultPermissions[role][resource]
    return {
      role,
      resource,
      can_view: defaults?.view ?? false,
      can_create: defaults?.create ?? false,
      can_edit: defaults?.edit ?? false,
      can_delete: defaults?.delete ?? false,
    }
  }

  const updatePermission = (
    role: UserRole,
    resource: string,
    field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete',
    value: boolean
  ) => {
    setHasChanges(true)
    setPermissions((prev) => {
      const existing = prev.find((p) => p.role === role && p.resource === resource)
      if (existing) {
        return prev.map((p) =>
          p.role === role && p.resource === resource ? { ...p, [field]: value } : p
        )
      }
      return [
        ...prev,
        {
          role,
          resource,
          can_view: field === 'can_view' ? value : false,
          can_create: field === 'can_create' ? value : false,
          can_edit: field === 'can_edit' ? value : false,
          can_delete: field === 'can_delete' ? value : false,
        },
      ]
    })
  }

  const savePermissions = async () => {
    setSaving(true)
    
    // Upsert all permissions
    for (const perm of permissions) {
      const { error } = await supabase
        .from('permissions')
        .upsert(
          {
            role: perm.role,
            resource: perm.resource,
            can_view: perm.can_view,
            can_create: perm.can_create,
            can_edit: perm.can_edit,
            can_delete: perm.can_delete,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'role,resource' }
        )

      if (error) {
        console.error(error)
        toast.error('Failed to save some permissions')
        setSaving(false)
        return
      }
    }

    toast.success('Permissions saved successfully')
    setHasChanges(false)
    setSaving(false)
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Permissions</h1>
          <p className="text-muted-foreground">Configure role-based access control for the system</p>
        </div>
        <Button onClick={savePermissions} disabled={!hasChanges || saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Legend */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                <Check className="w-3 h-3 mr-1" />
                Allowed
              </Badge>
              <span className="text-muted-foreground">User can perform this action</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                <X className="w-3 h-3 mr-1" />
                Denied
              </Badge>
              <span className="text-muted-foreground">User cannot perform this action</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions Matrix */}
      <Tabs value={activeRole} onValueChange={(v) => setActiveRole(v as UserRole)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="admin" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Admin
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Staff
          </TabsTrigger>
          <TabsTrigger value="client" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Client
          </TabsTrigger>
        </TabsList>

        {roles.map((role) => (
          <TabsContent key={role} value={role}>
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="capitalize">{role} Permissions</CardTitle>
                <CardDescription>
                  Configure what {role}s can view, create, edit, and delete
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Resource</TableHead>
                      <TableHead className="text-center">View</TableHead>
                      <TableHead className="text-center">Create</TableHead>
                      <TableHead className="text-center">Edit</TableHead>
                      <TableHead className="text-center">Delete</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resources.map((resource) => {
                      const perm = getPermission(role, resource.key)
                      return (
                        <TableRow key={resource.key}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{resource.label}</p>
                              <p className="text-sm text-muted-foreground">{resource.description}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={perm.can_view}
                              onCheckedChange={(checked) =>
                                updatePermission(role, resource.key, 'can_view', !!checked)
                              }
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={perm.can_create}
                              onCheckedChange={(checked) =>
                                updatePermission(role, resource.key, 'can_create', !!checked)
                              }
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={perm.can_edit}
                              onCheckedChange={(checked) =>
                                updatePermission(role, resource.key, 'can_edit', !!checked)
                              }
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={perm.can_delete}
                              onCheckedChange={(checked) =>
                                updatePermission(role, resource.key, 'can_delete', !!checked)
                              }
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
