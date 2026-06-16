'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createAuditLog } from '@/lib/audit-log-client'
import { adminDbMutation } from '@/lib/admin-api-client'
import { ensureDefaultWorkflowStages } from '@/lib/business-logic-client'
import { toast } from 'sonner'
import {
  ClipboardList,
  Search,
  Filter,
  MoreHorizontal,
  Calendar,
  User,
  Clock,
  ChevronRight,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface WorkflowStage {
  id: string
  name: string
  description: string | null
  color: string
  sort_order: number
  is_active: boolean
}

interface Booking {
  id: string
  client_id: string
  service_id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  total_amount: number
  notes: string | null
  client?: {
    id: string
    profile?: {
      full_name: string | null
      email: string
      avatar_url: string | null
    }
  }
  service?: {
    id: string
    name: string
  }
}

interface JobWorkflow {
  id: string
  booking_id: string
  current_stage_id: string | null
  due_date: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  notes: string | null
  completed_at: string | null
  created_at: string
  booking?: Booking
  current_stage?: WorkflowStage
}

const priorityColors: Record<string, string> = {
  low: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  medium: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  urgent: 'bg-red-500/10 text-red-500 border-red-500/20',
}

export default function JobTrackerPage() {
  const [jobs, setJobs] = useState<JobWorkflow[]>([])
  const [stages, setStages] = useState<WorkflowStage[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board')
  const [selectedJob, setSelectedJob] = useState<JobWorkflow | null>(null)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newJob, setNewJob] = useState({
    booking_id: '',
    due_date: '',
    priority: 'medium',
    notes: '',
  })
  const supabase = createClient()

  useEffect(() => {
    initializeWorkflow()
  }, [])

  const initializeWorkflow = async () => {
    try {
      const workflowStages = await ensureDefaultWorkflowStages()
      setStages(workflowStages)
      await fetchJobs()
      await fetchBookings()
    } catch (error) {
      toast.error('Failed to initialize workflow stages')
      console.error(error)
      setLoading(false)
    }
  }

  const fetchStages = async () => {
    const { data, error } = await supabase
      .from('workflow_stages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    if (error) {
      console.error(error)
    } else {
      setStages(data || [])
    }
  }

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from('job_workflows')
      .select(`
        *,
        current_stage:workflow_stages(*),
        booking:bookings(
          *,
          client:clients(*, profile:profiles(*)),
          service:services(*)
        )
      `)
      .is('completed_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to load jobs')
      console.error(error)
    } else {
      setJobs(data || [])
    }
    setLoading(false)
  }

  const fetchBookings = async () => {
    // Fetch bookings that don't have a job workflow yet
    const { data: existingJobs } = await supabase
      .from('job_workflows')
      .select('booking_id')

    const existingBookingIds = existingJobs?.map((j) => j.booking_id) || []

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        client:clients(*, profile:profiles(*)),
        service:services(*)
      `)
      .eq('status', 'confirmed')
      .order('booking_date', { ascending: false })

    if (error) {
      console.error(error)
    } else {
      // Filter out bookings that already have workflows
      const availableBookings = (data || []).filter(
        (b) => !existingBookingIds.includes(b.id)
      )
      setBookings(availableBookings)
    }
  }

  const moveToStage = async (jobId: string, stageId: string) => {
    const job = jobs.find((j) => j.id === jobId)
    if (!job) return

    // Check if this is the final stage (Completed)
    const stage = stages.find((s) => s.id === stageId)
    const isCompleted = stage?.name.toLowerCase() === 'completed'

    try {
      await adminDbMutation({
        table: 'job_workflow_history',
        action: 'insert',
        payload: {
          job_workflow_id: jobId,
          from_stage_id: job.current_stage_id,
          to_stage_id: stageId,
        },
      })

      await adminDbMutation({
        table: 'job_workflows',
        action: 'update',
        id: jobId,
        payload: {
          current_stage_id: stageId,
          completed_at: isCompleted ? new Date().toISOString() : null,
        },
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to move job')
      setMoveDialogOpen(false)
      return
    }

      await createAuditLog({
        action: 'status_change',
        resource_type: 'job_workflow',
        resource_id: jobId,
        old_data: { current_stage_id: job.current_stage_id },
        new_data: { current_stage_id: stageId, stage_name: stage?.name },
      })
      toast.success(`Job moved to ${stage?.name}`)
      fetchJobs()
    setMoveDialogOpen(false)
  }

  const createJob = async () => {
    if (!newJob.booking_id) {
      toast.error('Please select a booking')
      return
    }

    const firstStage = stages[0]
    if (!firstStage) {
      toast.error('No workflow stages configured')
      return
    }

    try {
      await adminDbMutation({
        table: 'job_workflows',
        action: 'insert',
        payload: {
          booking_id: newJob.booking_id,
          current_stage_id: firstStage.id,
          due_date: newJob.due_date || null,
          priority: newJob.priority,
          notes: newJob.notes || null,
        },
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create job')
      console.error(error)
      return
    }

    await createAuditLog({
      action: 'create',
      resource_type: 'job_workflow',
      new_data: { booking_id: newJob.booking_id, stage_id: firstStage.id, priority: newJob.priority },
    })
    toast.success('Job created successfully')
    setCreateDialogOpen(false)
    setNewJob({ booking_id: '', due_date: '', priority: 'medium', notes: '' })
    fetchJobs()
    fetchBookings()
  }

  const updatePriority = async (jobId: string, priority: string) => {
    try {
      await adminDbMutation({
        table: 'job_workflows',
        action: 'update',
        id: jobId,
        payload: { priority },
      })
      await createAuditLog({
        action: 'update',
        resource_type: 'job_workflow',
        resource_id: jobId,
        new_data: { priority },
      })
      toast.success('Priority updated')
      fetchJobs()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update priority')
    }
  }

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.booking?.client?.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.booking?.service?.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStage = stageFilter === 'all' || job.current_stage_id === stageFilter
    const matchesPriority = priorityFilter === 'all' || job.priority === priorityFilter
    return matchesSearch && matchesStage && matchesPriority
  })

  const getJobsByStage = (stageId: string) =>
    filteredJobs.filter((job) => job.current_stage_id === stageId)

  const stats = {
    total: jobs.length,
    urgent: jobs.filter((j) => j.priority === 'urgent').length,
    overdue: jobs.filter((j) => j.due_date && new Date(j.due_date) < new Date()).length,
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
          <h1 className="text-2xl font-bold text-foreground">Job Tracker</h1>
          <p className="text-muted-foreground">Track jobs through your workflow stages</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setViewMode(viewMode === 'board' ? 'list' : 'board')}>
            {viewMode === 'board' ? 'List View' : 'Board View'}
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            Create Job
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ClipboardList className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Active Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.urgent}</p>
                <p className="text-xs text-muted-foreground">Urgent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.overdue}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by client or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      {viewMode === 'board' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <div key={stage.id} className="flex-shrink-0 w-80">
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <CardTitle className="text-sm font-medium">{stage.name}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {getJobsByStage(stage.id).length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                  {getJobsByStage(stage.id).map((job) => (
                    <Card
                      key={job.id}
                      className="bg-background border-border cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => {
                        setSelectedJob(job)
                        setMoveDialogOpen(true)
                      }}
                    >
                      <CardContent className="p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={job.booking?.client?.profile?.avatar_url || ''} />
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {job.booking?.client?.profile?.full_name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium truncate max-w-[150px]">
                              {job.booking?.client?.profile?.full_name || 'Unknown'}
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn('text-xs', priorityColors[job.priority])}
                          >
                            {job.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {job.booking?.service?.name}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {job.booking?.booking_date
                              ? new Date(job.booking.booking_date).toLocaleDateString()
                              : '-'}
                          </div>
                          {job.due_date && (
                            <div
                              className={cn(
                                'flex items-center gap-1',
                                new Date(job.due_date) < new Date() && 'text-red-500'
                              )}
                            >
                              <Clock className="w-3 h-3" />
                              Due: {new Date(job.due_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {getJobsByStage(stage.id).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No jobs in this stage
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>All Jobs</CardTitle>
            <CardDescription>{filteredJobs.length} active jobs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={job.booking?.client?.profile?.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {job.booking?.client?.profile?.full_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{job.booking?.client?.profile?.full_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{job.booking?.service?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge
                      variant="outline"
                      style={{
                        backgroundColor: `${job.current_stage?.color}15`,
                        color: job.current_stage?.color,
                        borderColor: `${job.current_stage?.color}30`,
                      }}
                    >
                      {job.current_stage?.name}
                    </Badge>
                    <Badge variant="outline" className={priorityColors[job.priority]}>
                      {job.priority}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedJob(job)
                            setMoveDialogOpen(true)
                          }}
                        >
                          <ChevronRight className="w-4 h-4 mr-2" />
                          Move to Stage
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {['low', 'medium', 'high', 'urgent'].map((p) => (
                          <DropdownMenuItem
                            key={p}
                            onClick={() => updatePriority(job.id, p)}
                          >
                            Set {p.charAt(0).toUpperCase() + p.slice(1)} Priority
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Move Stage Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Job</DialogTitle>
            <DialogDescription>
              Move {selectedJob?.booking?.client?.profile?.full_name}&apos;s job to a new stage
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {stages.map((stage) => (
              <Button
                key={stage.id}
                variant={selectedJob?.current_stage_id === stage.id ? 'default' : 'outline'}
                className="w-full justify-start"
                onClick={() => selectedJob && moveToStage(selectedJob.id, stage.id)}
              >
                <div
                  className="w-3 h-3 rounded-full mr-3"
                  style={{ backgroundColor: stage.color }}
                />
                {stage.name}
                {selectedJob?.current_stage_id === stage.id && (
                  <CheckCircle className="w-4 h-4 ml-auto" />
                )}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Job Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Job</DialogTitle>
            <DialogDescription>Create a new job from a confirmed booking</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Booking *</Label>
              <Select
                value={newJob.booking_id}
                onValueChange={(value) => setNewJob({ ...newJob, booking_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a booking" />
                </SelectTrigger>
                <SelectContent>
                  {bookings.map((booking) => (
                    <SelectItem key={booking.id} value={booking.id}>
                      {booking.client?.profile?.full_name} - {booking.service?.name} (
                      {new Date(booking.booking_date).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {bookings.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No confirmed bookings available. All bookings already have jobs.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={newJob.due_date}
                onChange={(e) => setNewJob({ ...newJob, due_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={newJob.priority}
                onValueChange={(value) => setNewJob({ ...newJob, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={newJob.notes}
                onChange={(e) => setNewJob({ ...newJob, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createJob} disabled={bookings.length === 0}>
              Create Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
