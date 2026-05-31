'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Users,
  Search,
  MoreHorizontal,
  Mail,
  Phone,
  Shield,
  UserCheck,
  UserX,
  Edit,
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
import { ROLE_LABELS, type StudioRole } from '@/lib/permissions'

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
}

const studioRoles: StudioRole[] = [
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

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [editUser, setEditUser] = useState<Profile | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to load users')
      console.error(error)
    } else {
      setUsers((data || []) as Profile[])
    }
    setLoading(false)
  }

  const updateUserStudioRole = async (userId: string, studioRole: StudioRole) => {
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
    } else {
      toast.success('User role updated')
      fetchUsers()
    }
  }

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) {
      toast.error('Failed to update user status')
    } else {
      toast.success(isActive ? 'User activated' : 'User deactivated')
      fetchUsers()
    }
  }

  const handleEditSave = async () => {
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
    } else {
      toast.success('User updated successfully')
      setEditDialogOpen(false)
      fetchUsers()
    }
  }

  const filteredUsers = users.filter((user) => {
    const effectiveRole = getEffectiveStudioRole(user)
    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'all' || effectiveRole === roleFilter
    return matchesSearch && matchesRole
  })

  const stats = {
    total: users.length,
    superAdmins: users.filter((user) => getEffectiveStudioRole(user) === 'super_admin').length,
    admins: users.filter((user) => ['studio_admin', 'studio_manager'].includes(getEffectiveStudioRole(user))).length,
    staff: users.filter((user) => !['super_admin', 'studio_admin', 'studio_manager', 'viewer'].includes(getEffectiveStudioRole(user))).length,
    active: users.filter((user) => user.is_active).length,
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
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground">Manage users, active status, and studio-level access roles.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Users className="w-5 h-5 text-primary" /></div>
              <div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total Users</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10"><Shield className="w-5 h-5 text-red-500" /></div>
              <div><p className="text-2xl font-bold">{stats.superAdmins}</p><p className="text-xs text-muted-foreground">Super Admins</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10"><Shield className="w-5 h-5 text-amber-500" /></div>
              <div><p className="text-2xl font-bold">{stats.admins}</p><p className="text-xs text-muted-foreground">Admins/Managers</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><Users className="w-5 h-5 text-blue-500" /></div>
              <div><p className="text-2xl font-bold">{stats.staff}</p><p className="text-xs text-muted-foreground">Studio Staff</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10"><UserCheck className="w-5 h-5 text-emerald-500" /></div>
              <div><p className="text-2xl font-bold">{stats.active}</p><p className="text-xs text-muted-foreground">Active</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search users..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-10" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Filter by role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Studio Roles</SelectItem>
                {studioRoles.map((role) => <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>{filteredUsers.length} users found</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Studio Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
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
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.avatar_url || ''} />
                          <AvatarFallback className="bg-primary/10 text-primary">{user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.full_name || 'Unnamed'}</p>
                          <p className="text-sm text-muted-foreground">{user.department || 'No department'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm"><Mail className="w-3 h-3 text-muted-foreground" />{user.email}</div>
                        {user.phone && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="w-3 h-3" />{user.phone}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={roleColors[effectiveRole]}>{ROLE_LABELS[effectiveRole]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? 'default' : 'secondary'}>{user.is_active ? 'Active' : 'Inactive'}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditUser({ ...user, studio_role: effectiveRole }); setEditDialogOpen(true) }}>
                            <Edit className="w-4 h-4 mr-2" />Edit User
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {studioRoles.map((role) => (
                            <DropdownMenuItem key={role} onClick={() => updateUserStudioRole(user.id, role)}>
                              <Shield className="w-4 h-4 mr-2" />Make {ROLE_LABELS[role]}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => toggleUserStatus(user.id, !user.is_active)}>
                            {user.is_active ? <><UserX className="w-4 h-4 mr-2" />Deactivate</> : <><UserCheck className="w-4 h-4 mr-2" />Activate</>}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and studio role.</DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div className="space-y-2"><Label>Full Name</Label><Input value={editUser.full_name || ''} onChange={(event) => setEditUser({ ...editUser, full_name: event.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={editUser.email} disabled /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={editUser.phone || ''} onChange={(event) => setEditUser({ ...editUser, phone: event.target.value })} /></div>
              <div className="space-y-2"><Label>Department</Label><Input value={editUser.department || ''} onChange={(event) => setEditUser({ ...editUser, department: event.target.value })} /></div>
              <div className="space-y-2">
                <Label>Studio Role</Label>
                <Select value={getEffectiveStudioRole(editUser)} onValueChange={(value: StudioRole) => setEditUser({ ...editUser, studio_role: value, role: getLegacyRoleFromStudioRole(value) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{studioRoles.map((role) => <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
