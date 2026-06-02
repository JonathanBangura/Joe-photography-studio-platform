'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Edit,
  Eye,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Shield,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ROLE_LABELS, type StudioRole } from '@/lib/permissions'
import { createAuditLog } from '@/lib/audit-log-client'

type LegacyUserRole = 'admin' | 'staff' | 'client'

interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  role: LegacyUserRole
  studio_role: StudioRole | null
  is_active: boolean
  created_at: string
  hire_date: string | null
  department: string | null
  bio?: string | null
}

const STUDIO_ROLES: StudioRole[] = [
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

const roleColors: Record<StudioRole, string> = {
  super_admin: 'bg-red-500/10 text-red-500 border-red-500/20',
  studio_admin: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  studio_manager: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  photographer: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  photo_editor: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  receptionist: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  finance_officer: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  gallery_manager: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  marketing_manager: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  viewer: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
}

function getEffectiveStudioRole(user: Profile): StudioRole {
  if (user.studio_role) return user.studio_role
  if (user.role === 'admin') return 'studio_admin'
  if (user.role === 'staff') return 'studio_manager'
  return 'viewer'
}

function getLegacyRoleFromStudioRole(studioRole: StudioRole): LegacyUserRole {
  if (studioRole === 'super_admin' || studioRole === 'studio_admin') return 'admin'
  if (studioRole === 'viewer') return 'client'
  return 'staff'
}

function getInitials(name: string | null, email: string): string {
  const source = name || email
  return source
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function UsersPage() {
  const supabase = createClient()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [editUser, setEditUser] = useState<Profile | null>(null)
  const [viewUser, setViewUser] = useState<Profile | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [newUser, setNewUser] = useState({
    full_name: '',
    email: '',
    phone: '',
    department: '',
    studio_role: 'viewer' as StudioRole,
    password: '',
    bio: '',
  })

  async function fetchUsers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      toast.error('Failed to load users')
      setUsers([])
    } else {
      setUsers((data || []) as Profile[])
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function updateUserStudioRole(userId: string, studioRole: StudioRole) {
    const { error } = await supabase
      .from('profiles')
      .update({
        studio_role: studioRole,
        role: getLegacyRoleFromStudioRole(studioRole),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) {
      toast.error('Failed to update user role')
      return
    }

    await createAuditLog({
      action: 'role_change',
      resource_type: 'profiles',
      resource_id: userId,
      new_data: { studio_role: studioRole, role: getLegacyRoleFromStudioRole(studioRole) },
    })

    toast.success('User role updated')
    fetchUsers()
  }

  async function toggleUserStatus(userId: string, isActive: boolean) {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) {
      toast.error('Failed to update user status')
      return
    }

    await createAuditLog({
      action: 'status_change',
      resource_type: 'profiles',
      resource_id: userId,
      new_data: { is_active: isActive },
    })

    toast.success(isActive ? 'User activated' : 'User deactivated')
    fetchUsers()
  }

  async function handleEditSave() {
    if (!editUser) return

    const studioRole = getEffectiveStudioRole(editUser)
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editUser.full_name,
        phone: editUser.phone,
        department: editUser.department,
        studio_role: studioRole,
        role: getLegacyRoleFromStudioRole(studioRole),
        updated_at: new Date().toISOString(),
      })
      .eq('id', editUser.id)

    if (error) {
      toast.error('Failed to update user')
      return
    }

    await createAuditLog({
      action: 'update',
      resource_type: 'profiles',
      resource_id: editUser.id,
      new_data: {
        full_name: editUser.full_name,
        phone: editUser.phone,
        department: editUser.department,
        studio_role: studioRole,
      },
    })

    toast.success('User updated successfully')
    setEditDialogOpen(false)
    fetchUsers()
  }

  async function handleCreateUser() {
    if (!newUser.full_name || !newUser.email) {
      toast.error('Full name and email are required')
      return
    }

    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    })
    const result = await response.json()

    if (!response.ok) {
      toast.error(result.error || 'Failed to create user')
      return
    }

    setTemporaryPassword(result.temporary_password || '')
    toast.success('User created successfully')
    setNewUser({
      full_name: '',
      email: '',
      phone: '',
      department: '',
      studio_role: 'viewer',
      password: '',
      bio: '',
    })
    fetchUsers()
  }

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const effectiveRole = getEffectiveStudioRole(user)
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        (user.full_name || '').toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
      const matchesRole = roleFilter === 'all' || effectiveRole === roleFilter
      return matchesSearch && matchesRole
    })
  }, [roleFilter, searchQuery, users])

  const stats = useMemo(() => {
    return {
      total: users.length,
      superAdmins: users.filter((user) => getEffectiveStudioRole(user) === 'super_admin').length,
      admins: users.filter((user) => ['studio_admin', 'studio_manager'].includes(getEffectiveStudioRole(user))).length,
      staff: users.filter((user) => !['super_admin', 'studio_admin', 'studio_manager', 'viewer'].includes(getEffectiveStudioRole(user))).length,
      active: users.filter((user) => user.is_active).length,
    }
  }, [users])

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground">Manage users, active status, and studio-level access roles.</p>
        </div>
        <Button
          className="gap-2"
          onClick={() => {
            setTemporaryPassword('')
            setAddDialogOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          Add User / Staff
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard icon={<Users className="h-5 w-5 text-primary" />} label="Total Users" value={stats.total} />
        <StatCard icon={<Shield className="h-5 w-5 text-red-500" />} label="Super Admins" value={stats.superAdmins} />
        <StatCard icon={<Shield className="h-5 w-5 text-amber-500" />} label="Admins/Managers" value={stats.admins} />
        <StatCard icon={<UserCheck className="h-5 w-5 text-blue-500" />} label="Studio Staff" value={stats.staff} />
        <StatCard icon={<UserCheck className="h-5 w-5 text-green-500" />} label="Active" value={stats.active} />
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>All Users</CardTitle>
              <CardDescription>Manage login users, staff, and studio permission roles.</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="w-64 pl-9"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {STUDIO_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const effectiveRole = getEffectiveStudioRole(user)
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>{getInitials(user.full_name, user.email)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.full_name || 'Unnamed User'}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                          {user.phone ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {user.phone}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={roleColors[effectiveRole]}>
                        {ROLE_LABELS[effectiveRole]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? 'default' : 'secondary'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <UserActions
                        user={user}
                        effectiveRole={effectiveRole}
                        onView={() => setViewUser(user)}
                        onEdit={() => {
                          setEditUser({ ...user, studio_role: effectiveRole })
                          setEditDialogOpen(true)
                        }}
                        onSetRole={(role) => updateUserStudioRole(user.id, role)}
                        onToggleStatus={() => toggleUserStatus(user.id, !user.is_active)}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add User / Staff</DialogTitle>
            <DialogDescription>
              Create a login account and staff profile. The temporary password can be shared with the user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={newUser.full_name} onChange={(event) => setNewUser({ ...newUser, full_name: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={newUser.phone} onChange={(event) => setNewUser({ ...newUser, phone: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Input value={newUser.department} onChange={(event) => setNewUser({ ...newUser, department: event.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Studio Role</Label>
              <Select value={newUser.studio_role} onValueChange={(value) => setNewUser({ ...newUser, studio_role: value as StudioRole })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STUDIO_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Password Optional</Label>
              <Input
                type="text"
                placeholder="Leave blank to auto-generate"
                value={newUser.password}
                onChange={(event) => setNewUser({ ...newUser, password: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Bio / Notes</Label>
              <Textarea value={newUser.bio} onChange={(event) => setNewUser({ ...newUser, bio: event.target.value })} />
            </div>
            {temporaryPassword ? (
              <div className="rounded-lg border bg-muted p-3 text-sm">
                <p className="font-medium">Temporary Password</p>
                <p className="mt-1 font-mono">{temporaryPassword}</p>
                <p className="mt-2 text-xs text-muted-foreground">Copy and share this securely with the user.</p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={handleCreateUser}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewUser)} onOpenChange={(open) => !open && setViewUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>{viewUser?.email}</DialogDescription>
          </DialogHeader>
          {viewUser ? (
            <div className="space-y-3 text-sm">
              <p><b>Name:</b> {viewUser.full_name || 'N/A'}</p>
              <p><b>Phone:</b> {viewUser.phone || 'N/A'}</p>
              <p><b>Department:</b> {viewUser.department || 'N/A'}</p>
              <p><b>Studio Role:</b> {ROLE_LABELS[getEffectiveStudioRole(viewUser)]}</p>
              <p><b>Status:</b> {viewUser.is_active ? 'Active' : 'Inactive'}</p>
              <p><b>Created:</b> {new Date(viewUser.created_at).toLocaleDateString()}</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and studio role.</DialogDescription>
          </DialogHeader>
          {editUser ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={editUser.full_name || ''} onChange={(event) => setEditUser({ ...editUser, full_name: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editUser.email} disabled />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={editUser.phone || ''} onChange={(event) => setEditUser({ ...editUser, phone: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Input value={editUser.department || ''} onChange={(event) => setEditUser({ ...editUser, department: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Studio Role</Label>
                <Select
                  value={getEffectiveStudioRole(editUser)}
                  onValueChange={(value) =>
                    setEditUser({
                      ...editUser,
                      studio_role: value as StudioRole,
                      role: getLegacyRoleFromStudioRole(value as StudioRole),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STUDIO_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">{icon}</div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function UserActions({
  user,
  effectiveRole,
  onView,
  onEdit,
  onSetRole,
  onToggleStatus,
}: {
  user: Profile
  effectiveRole: StudioRole
  onView: () => void
  onEdit: () => void
  onSetRole: (role: StudioRole) => void
  onToggleStatus: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onView}>
          <Eye className="mr-2 h-4 w-4" />
          View User
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>
          <Edit className="mr-2 h-4 w-4" />
          Edit User
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {STUDIO_ROLES.map((role) => (
          <DropdownMenuItem key={role} disabled={role === effectiveRole} onClick={() => onSetRole(role)}>
            <Shield className="mr-2 h-4 w-4" />
            Make {ROLE_LABELS[role]}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onToggleStatus}>
          {user.is_active ? (
            <>
              <UserX className="mr-2 h-4 w-4" />
              Deactivate
            </>
          ) : (
            <>
              <UserCheck className="mr-2 h-4 w-4" />
              Activate
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
