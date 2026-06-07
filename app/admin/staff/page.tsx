'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Calendar,
  CalendarOff,
  Check,
  Clock,
  DollarSign,
  Edit,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Trash2,
  UserCog,
  X,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

interface StaffMember {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  role: 'admin' | 'staff' | 'client'
  studio_role?: string | null
  is_active: boolean
  hire_date: string | null
  hourly_rate: number | null
  department: string | null
  bio: string | null
  emergency_contact: string | null
  emergency_phone: string | null
  created_at: string
}

interface StaffSchedule {
  id: string
  staff_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_working: boolean
  created_at?: string
  updated_at?: string
}

interface TimeOffRequest {
  id: string
  staff_id: string
  start_date: string
  end_date: string
  reason: string | null
  status: 'pending' | 'approved' | 'rejected'
  approved_by?: string | null
  approved_at?: string | null
  notes?: string | null
  created_at: string
}

const departments = ['Photography', 'Editing', 'Sales', 'Marketing', 'Operations', 'Management']
const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const staffStudioRoles = [
  'super_admin',
  'studio_admin',
  'studio_manager',
  'photographer',
  'photo_editor',
  'receptionist',
  'finance_officer',
  'gallery_manager',
  'marketing_manager',
]

function defaultScheduleFor(staffId: string): StaffSchedule[] {
  return daysOfWeek.map((_, index) => ({
    id: `new-${staffId}-${index}`,
    staff_id: staffId,
    day_of_week: index,
    start_time: index === 0 ? '10:00' : '09:00',
    end_time: index === 0 ? '14:00' : '18:00',
    is_working: index !== 0,
  }))
}

function formatTime(value?: string | null) {
  if (!value) return ''
  return value.slice(0, 5)
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString()
}

function getStaffName(staff?: StaffMember | null) {
  return staff?.full_name || staff?.email || 'Unknown'
}

function isStudioStaff(member: StaffMember) {
  return member.role !== 'client' || staffStudioRoles.includes(member.studio_role || '')
}

export default function StaffPage() {
  const supabase = createClient()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [schedules, setSchedules] = useState<StaffSchedule[]>([])
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [scheduleStaff, setScheduleStaff] = useState<StaffMember | null>(null)
  const [scheduleDraft, setScheduleDraft] = useState<StaffSchedule[]>([])
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [timeOffDialogOpen, setTimeOffDialogOpen] = useState(false)
  const [timeOffDraft, setTimeOffDraft] = useState({
    staff_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  })

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadData() {
    setLoading(true)
    await Promise.all([fetchStaff(), fetchSchedules(), fetchTimeOffRequests()])
    setLoading(false)
  }

  async function fetchStaff() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true })

    if (error) {
      toast.error('Failed to load staff')
      console.error(error)
      return
    }

    setStaff(((data || []) as StaffMember[]).filter(isStudioStaff))
  }

  async function fetchSchedules() {
    const { data, error } = await supabase
      .from('staff_schedules')
      .select('*')
      .order('day_of_week', { ascending: true })

    if (error) {
      console.error(error)
      return
    }

    setSchedules((data || []) as StaffSchedule[])
  }

  async function fetchTimeOffRequests() {
    const { data, error } = await supabase
      .from('time_off_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      return
    }

    setTimeOffRequests((data || []) as TimeOffRequest[])
  }

  async function handleEditSave() {
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
      return
    }

    toast.success('Staff member updated')
    setEditDialogOpen(false)
    fetchStaff()
  }

  function openSchedule(member: StaffMember) {
    const existing = schedules.filter((schedule) => schedule.staff_id === member.id)
    const merged = defaultScheduleFor(member.id).map((fallback) => {
      const existingDay = existing.find((item) => item.day_of_week === fallback.day_of_week)
      return existingDay || fallback
    })
    setScheduleStaff(member)
    setScheduleDraft(merged)
    setScheduleDialogOpen(true)
  }

  function updateScheduleDay(dayOfWeek: number, patch: Partial<StaffSchedule>) {
    setScheduleDraft((current) =>
      current.map((item) => (item.day_of_week === dayOfWeek ? { ...item, ...patch } : item)),
    )
  }

  async function saveSchedule() {
    if (!scheduleStaff) return
    setSavingSchedule(true)

    const rows = scheduleDraft.map((item) => ({
      staff_id: scheduleStaff.id,
      day_of_week: item.day_of_week,
      start_time: item.start_time,
      end_time: item.end_time,
      is_working: item.is_working,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase
      .from('staff_schedules')
      .upsert(rows, { onConflict: 'staff_id,day_of_week' })

    if (error) {
      console.error(error)
      toast.error('Failed to save schedule. Ensure staff_schedules has a unique constraint on (staff_id, day_of_week).')
      setSavingSchedule(false)
      return
    }

    toast.success('Schedule saved')
    setScheduleDialogOpen(false)
    setSavingSchedule(false)
    fetchSchedules()
  }

  async function submitTimeOff() {
    if (!timeOffDraft.staff_id || !timeOffDraft.start_date || !timeOffDraft.end_date) {
      toast.error('Select staff, start date, and end date')
      return
    }

    const { error } = await supabase.from('time_off_requests').insert({
      staff_id: timeOffDraft.staff_id,
      start_date: timeOffDraft.start_date,
      end_date: timeOffDraft.end_date,
      reason: timeOffDraft.reason || null,
      status: 'pending',
    })

    if (error) {
      console.error(error)
      toast.error('Failed to create time-off request')
      return
    }

    toast.success('Time-off request created')
    setTimeOffDialogOpen(false)
    setTimeOffDraft({ staff_id: '', start_date: '', end_date: '', reason: '' })
    fetchTimeOffRequests()
  }

  async function handleTimeOffAction(requestId: string, status: 'approved' | 'rejected') {
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
      return
    }

    toast.success(`Request ${status}`)
    fetchTimeOffRequests()
  }

  async function deleteTimeOff(requestId: string) {
    const { error } = await supabase.from('time_off_requests').delete().eq('id', requestId)
    if (error) {
      toast.error('Failed to delete request')
      return
    }
    toast.success('Time-off request deleted')
    fetchTimeOffRequests()
  }

  const filteredStaff = useMemo(
    () =>
      staff.filter((member) =>
        [member.full_name, member.email, member.department, member.studio_role]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(searchQuery.toLowerCase())),
      ),
    [staff, searchQuery],
  )

  const pendingRequests = timeOffRequests.filter((request) => request.status === 'pending')
  const approvedRequests = timeOffRequests.filter((request) => request.status === 'approved')
  const activeStaff = staff.filter((member) => member.is_active)
  const scheduledStaffIds = new Set(schedules.map((schedule) => schedule.staff_id))

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
          <h1 className="text-2xl font-bold text-foreground">Staff Scheduling</h1>
          <p className="text-muted-foreground">Manage staff details, working hours, availability, and time off.</p>
        </div>
        <Button onClick={() => setTimeOffDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Time Off
        </Button>
      </div>

      <Tabs defaultValue="staff" className="space-y-6">
        <TabsList>
          <TabsTrigger value="staff">Staff Directory</TabsTrigger>
          <TabsTrigger value="schedules">Weekly Schedules</TabsTrigger>
          <TabsTrigger value="timeoff" className="relative">
            Time Off Requests
            {pendingRequests.length > 0 && (
              <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                {pendingRequests.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <UserCog className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{staff.length}</p>
                    <p className="text-xs text-muted-foreground">Total Staff</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-500/10 p-2">
                    <Check className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{activeStaff.length}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-500/10 p-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{scheduledStaffIds.size}</p>
                    <p className="text-xs text-muted-foreground">With Schedule</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-500/10 p-2">
                    <CalendarOff className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{approvedRequests.length}</p>
                    <p className="text-xs text-muted-foreground">Approved Leave</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search staff by name, email, department, or studio role..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Staff Directory</CardTitle>
              <CardDescription>{filteredStaff.length} staff members</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Studio Role</TableHead>
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
                      <TableCell className="capitalize">{(member.studio_role || 'staff').replaceAll('_', ' ')}</TableCell>
                      <TableCell>{member.department || '-'}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {member.email}
                          </div>
                          {member.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {member.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(member.hire_date)}</TableCell>
                      <TableCell>{member.hourly_rate ? `$${member.hourly_rate}/hr` : '-'}</TableCell>
                      <TableCell>
                        <Badge variant={member.is_active ? 'default' : 'secondary'}>
                          {member.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditStaff(member)
                                setEditDialogOpen(true)
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openSchedule(member)}>
                              <Clock className="mr-2 h-4 w-4" />
                              Edit Schedule
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setTimeOffDraft({
                                  staff_id: member.id,
                                  start_date: '',
                                  end_date: '',
                                  reason: '',
                                })
                                setTimeOffDialogOpen(true)
                              }}
                            >
                              <CalendarOff className="mr-2 h-4 w-4" />
                              Add Time Off
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

        <TabsContent value="schedules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Staff Schedules</CardTitle>
              <CardDescription>These working hours are used by the availability engine.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    {daysOfWeek.map((day) => (
                      <TableHead key={day}>{day.slice(0, 3)}</TableHead>
                    ))}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{getStaffName(member)}</p>
                          <p className="text-xs capitalize text-muted-foreground">{(member.studio_role || member.role).replaceAll('_', ' ')}</p>
                        </div>
                      </TableCell>
                      {daysOfWeek.map((day, dayIndex) => {
                        const schedule = schedules.find((item) => item.staff_id === member.id && item.day_of_week === dayIndex)
                        return (
                          <TableCell key={day} className="text-xs">
                            {schedule ? (
                              schedule.is_working ? (
                                <span>{formatTime(schedule.start_time)}-{formatTime(schedule.end_time)}</span>
                              ) : (
                                <span className="text-muted-foreground">Off</span>
                              )
                            ) : (
                              <span className="text-muted-foreground">Not set</span>
                            )}
                          </TableCell>
                        )
                      })}
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => openSchedule(member)}>
                          <Clock className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeoff" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Time Off Requests</CardTitle>
                <CardDescription>Review and manage staff leave/time off.</CardDescription>
              </div>
              <Button onClick={() => setTimeOffDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Time Off
              </Button>
            </CardHeader>
            <CardContent>
              {timeOffRequests.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <CalendarOff className="mx-auto mb-4 h-12 w-12 opacity-50" />
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
                      const staffMember = staff.find((item) => item.id === request.staff_id)
                      return (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary/10 text-xs text-primary">
                                  {staffMember?.full_name?.charAt(0) || staffMember?.email?.charAt(0)?.toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{getStaffName(staffMember)}</span>
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(request.start_date)}</TableCell>
                          <TableCell>{formatDate(request.end_date)}</TableCell>
                          <TableCell className="max-w-[260px] truncate">{request.reason || '-'}</TableCell>
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
                            <div className="flex items-center justify-end gap-2">
                              {request.status === 'pending' && (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => handleTimeOffAction(request.id, 'approved')}>
                                    Approve
                                  </Button>
                                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleTimeOffAction(request.id, 'rejected')}>
                                    Reject
                                  </Button>
                                </>
                              )}
                              <Button size="icon" variant="ghost" onClick={() => deleteTimeOff(request.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
            <DialogDescription>Update staff information and employment details.</DialogDescription>
          </DialogHeader>
          {editStaff && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={editStaff.full_name || ''} onChange={(event) => setEditStaff({ ...editStaff, full_name: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editStaff.email} disabled />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={editStaff.phone || ''} onChange={(event) => setEditStaff({ ...editStaff, phone: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={editStaff.department || ''} onValueChange={(value) => setEditStaff({ ...editStaff, department: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((department) => (
                      <SelectItem key={department} value={department}>
                        {department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Hire Date</Label>
                <Input type="date" value={editStaff.hire_date || ''} onChange={(event) => setEditStaff({ ...editStaff, hire_date: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Hourly Rate</Label>
                <Input type="number" step="0.01" value={editStaff.hourly_rate || ''} onChange={(event) => setEditStaff({ ...editStaff, hourly_rate: Number(event.target.value) || null })} />
              </div>
              <div className="space-y-2">
                <Label>Emergency Contact</Label>
                <Input value={editStaff.emergency_contact || ''} onChange={(event) => setEditStaff({ ...editStaff, emergency_contact: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Emergency Phone</Label>
                <Input value={editStaff.emergency_phone || ''} onChange={(event) => setEditStaff({ ...editStaff, emergency_phone: event.target.value })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Bio</Label>
                <Textarea value={editStaff.bio || ''} onChange={(event) => setEditStaff({ ...editStaff, bio: event.target.value })} rows={3} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Weekly Schedule</DialogTitle>
            <DialogDescription>
              Set working days and hours for {getStaffName(scheduleStaff)}. These hours are used to check photographer availability.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {scheduleDraft.map((day) => (
              <div key={day.day_of_week} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[130px_90px_1fr_1fr] sm:items-center">
                <div className="font-medium">{daysOfWeek[day.day_of_week]}</div>
                <div className="flex items-center gap-2">
                  <Switch checked={day.is_working} onCheckedChange={(checked) => updateScheduleDay(day.day_of_week, { is_working: checked })} />
                  <span className="text-sm text-muted-foreground">{day.is_working ? 'On' : 'Off'}</span>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Start</Label>
                  <Input type="time" value={formatTime(day.start_time)} disabled={!day.is_working} onChange={(event) => updateScheduleDay(day.day_of_week, { start_time: event.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End</Label>
                  <Input type="time" value={formatTime(day.end_time)} disabled={!day.is_working} onChange={(event) => updateScheduleDay(day.day_of_week, { end_time: event.target.value })} />
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)} disabled={savingSchedule}>Cancel</Button>
            <Button onClick={saveSchedule} disabled={savingSchedule}>{savingSchedule ? 'Saving...' : 'Save Schedule'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={timeOffDialogOpen} onOpenChange={setTimeOffDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Time Off</DialogTitle>
            <DialogDescription>Create leave/time-off for staff. Approved requests block availability.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Staff Member</Label>
              <Select value={timeOffDraft.staff_id} onValueChange={(value) => setTimeOffDraft({ ...timeOffDraft, staff_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((member) => (
                    <SelectItem key={member.id} value={member.id}>{getStaffName(member)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={timeOffDraft.start_date} onChange={(event) => setTimeOffDraft({ ...timeOffDraft, start_date: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={timeOffDraft.end_date} onChange={(event) => setTimeOffDraft({ ...timeOffDraft, end_date: event.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea value={timeOffDraft.reason} onChange={(event) => setTimeOffDraft({ ...timeOffDraft, reason: event.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTimeOffDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitTimeOff}>Create Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
