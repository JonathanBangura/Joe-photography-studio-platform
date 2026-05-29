'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  UserCog,
  Search,
  Plus,
  MoreHorizontal,
  Mail,
  Phone,
  Calendar,
  Clock,
  DollarSign,
  Edit,
  Trash2,
  CalendarOff,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface StaffMember {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  role: 'admin' | 'staff'
  is_active: boolean
  hire_date: string | null
  hourly_rate: number | null
  department: string | null
  bio: string | null
  emergency_contact: string | null
  emergency_phone: string | null
  created_at: string
}

interface TimeOffRequest {
  id: string
  staff_id: string
  start_date: string
  end_date: string
  reason: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  staff?: StaffMember
}

const departments = ['Photography', 'Editing', 'Sales', 'Marketing', 'Operations', 'Management']
const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchStaff()
    fetchTimeOffRequests()
  }, [])

  const fetchStaff = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['admin', 'staff'])
      .order('full_name', { ascending: true })

    if (error) {
      toast.error('Failed to load staff')
      console.error(error)
    } else {
      setStaff(data || [])
    }
    setLoading(false)
  }

  const fetchTimeOffRequests = async () => {
    const { data, error } = await supabase
      .from('time_off_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error(error)
    } else {
      setTimeOffRequests(data || [])
    }
  }

  const handleEditSave = async () => {
    if (!editStaff) return

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editStaff.full_name,
        phone: editStaff.phone,
        department: editStaff.department,
        hire_date: editStaff.hire_date,
        hourly_rate: editStaff.hourly_rate,
        bio: editStaff.bio,
        emergency_contact: editStaff.emergency_contact,
        emergency_phone: editStaff.emergency_phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editStaff.id)

    if (error) {
      toast.error('Failed to update staff member')
    } else {
      toast.success('Staff member updated')
      setEditDialogOpen(false)
      fetchStaff()
    }
  }

  const handleTimeOffAction = async (requestId: string, status: 'approved' | 'rejected') => {
    const { data: userData } = await supabase.auth.getUser()
    
    const { error } = await supabase
      .from('time_off_requests')
      .update({
        status,
        approved_by: userData?.user?.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    if (error) {
      toast.error('Failed to update request')
    } else {
      toast.success(`Request ${status}`)
      fetchTimeOffRequests()
    }
  }

  const filteredStaff = staff.filter((member) =>
    member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.department?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const pendingRequests = timeOffRequests.filter((r) => r.status === 'pending')

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
          <h1 className="text-2xl font-bold text-foreground">Staff Management</h1>
          <p className="text-muted-foreground">Manage staff members, schedules, and time off</p>
        </div>
      </div>

      <Tabs defaultValue="staff" className="space-y-6">
        <TabsList>
          <TabsTrigger value="staff">Staff Directory</TabsTrigger>
          <TabsTrigger value="timeoff" className="relative">
            Time Off Requests
            {pendingRequests.length > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <UserCog className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{staff.length}</p>
                    <p className="text-xs text-muted-foreground">Total Staff</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <UserCog className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{staff.filter((s) => s.is_active).length}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Calendar className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{pendingRequests.length}</p>
                    <p className="text-xs text-muted-foreground">Pending Requests</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <DollarSign className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      ${staff.reduce((sum, s) => sum + (s.hourly_rate || 0), 0).toFixed(0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Hourly (Total)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search staff by name, email, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Staff Table */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Staff Directory</CardTitle>
              <CardDescription>{filteredStaff.length} staff members</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Hire Date</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={member.avatar_url || ''} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {member.full_name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.full_name || 'Unnamed'}</p>
                            <Badge variant="outline" className="text-xs">
                              {member.role}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{member.department || '-'}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            {member.email}
                          </div>
                          {member.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              {member.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {member.hire_date
                          ? new Date(member.hire_date).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {member.hourly_rate ? `$${member.hourly_rate}/hr` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.is_active ? 'default' : 'secondary'}>
                          {member.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditStaff(member)
                                setEditDialogOpen(true)
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Clock className="w-4 h-4 mr-2" />
                              View Schedule
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <CalendarOff className="w-4 h-4 mr-2" />
                              Request Time Off
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeoff" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Time Off Requests</CardTitle>
              <CardDescription>Review and manage staff time off requests</CardDescription>
            </CardHeader>
            <CardContent>
              {timeOffRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarOff className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No time off requests</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeOffRequests.map((request) => {
                      const staffMember = staff.find((s) => s.id === request.staff_id)
                      return (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                  {staffMember?.full_name?.charAt(0) || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">
                                {staffMember?.full_name || 'Unknown'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{new Date(request.start_date).toLocaleDateString()}</TableCell>
                          <TableCell>{new Date(request.end_date).toLocaleDateString()}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {request.reason || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                request.status === 'approved'
                                  ? 'default'
                                  : request.status === 'rejected'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {request.status === 'pending' && (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleTimeOffAction(request.id, 'approved')}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive"
                                  onClick={() => handleTimeOffAction(request.id, 'rejected')}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Staff Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
            <DialogDescription>Update staff information and employment details</DialogDescription>
          </DialogHeader>
          {editStaff && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={editStaff.full_name || ''}
                  onChange={(e) => setEditStaff({ ...editStaff, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editStaff.email} disabled />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={editStaff.phone || ''}
                  onChange={(e) => setEditStaff({ ...editStaff, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={editStaff.department || ''}
                  onValueChange={(value) => setEditStaff({ ...editStaff, department: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Hire Date</Label>
                <Input
                  type="date"
                  value={editStaff.hire_date || ''}
                  onChange={(e) => setEditStaff({ ...editStaff, hire_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Hourly Rate ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editStaff.hourly_rate || ''}
                  onChange={(e) =>
                    setEditStaff({ ...editStaff, hourly_rate: parseFloat(e.target.value) || null })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Emergency Contact</Label>
                <Input
                  value={editStaff.emergency_contact || ''}
                  onChange={(e) => setEditStaff({ ...editStaff, emergency_contact: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Emergency Phone</Label>
                <Input
                  value={editStaff.emergency_phone || ''}
                  onChange={(e) => setEditStaff({ ...editStaff, emergency_phone: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Bio</Label>
                <Textarea
                  value={editStaff.bio || ''}
                  onChange={(e) => setEditStaff({ ...editStaff, bio: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          )}
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
