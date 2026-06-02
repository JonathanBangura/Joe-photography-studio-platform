'use client'

import { useState } from 'react'
import { Plus, Search, Filter, Calendar, MoreHorizontal, Edit, Trash2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Booking, Service, Client } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { createAuditLog } from '@/lib/audit-log-client'
import { createInvoiceForBooking, createWorkflowForBooking, moveBookingWorkflowToStage } from '@/lib/business-logic-client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface BookingsClientProps {
  initialBookings: (Booking & { service?: Service; client?: Client & { profile?: { full_name: string; email: string } }; staff?: { full_name: string } })[]
  services: Service[]
  clients: (Client & { profile?: { full_name: string; email: string } })[]
}

const statusColors = {
  pending: 'bg-amber-500/10 text-amber-500',
  confirmed: 'bg-green-500/10 text-green-500',
  in_progress: 'bg-blue-500/10 text-blue-500',
  completed: 'bg-primary/10 text-primary',
  cancelled: 'bg-destructive/10 text-destructive',
}

export function BookingsClient({ initialBookings, services, clients }: BookingsClientProps) {
  const router = useRouter()
  const [bookings, setBookings] = useState(initialBookings)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // New booking form state
  const [newBooking, setNewBooking] = useState({
    client_id: '',
    service_id: '',
    booking_date: '',
    start_time: '',
    end_time: '',
    location: '',
    notes: '',
  })

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.client?.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.service?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleCreateBooking = async () => {
    if (!newBooking.client_id || !newBooking.service_id || !newBooking.booking_date || !newBooking.start_time) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsLoading(true)
    const supabase = createClient()

    const selectedService = services.find(s => s.id === newBooking.service_id)
    
    const totalAmount = Number(selectedService?.base_price || 0)

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        ...newBooking,
        total_amount: totalAmount,
        status: 'pending',
      })
      .select('*, service:services(*), client:clients(*, profile:profiles(*))')
      .single()

    if (error) {
      toast.error('Failed to create booking')
      setIsLoading(false)
      return
    }

    try {
      await createInvoiceForBooking({
        bookingId: data.id,
        clientId: newBooking.client_id,
        totalAmount,
        notes: `Auto-created from booking ${data.id}`,
      })

      await createWorkflowForBooking({
        bookingId: data.id,
        bookingDate: newBooking.booking_date,
        priority: 'medium',
        notes: 'Auto-created from booking',
      })

      await createAuditLog({
        action: 'create',
        resource_type: 'booking',
        resource_id: data.id,
        new_data: data,
      })
    } catch (businessError) {
      console.error('Booking business automation failed:', businessError)
      toast.warning('Booking created, but invoice/workflow automation needs review')
    }

    setBookings([data, ...bookings])
    setIsCreateOpen(false)
    setNewBooking({
      client_id: '',
      service_id: '',
      booking_date: '',
      start_time: '',
      end_time: '',
      location: '',
      notes: '',
    })
    toast.success('Booking created successfully')
    setIsLoading(false)
    router.refresh()
  }

  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    const supabase = createClient()
    
    const oldBooking = bookings.find((booking) => booking.id === bookingId)

    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', bookingId)

    if (error) {
      toast.error('Failed to update status')
      return
    }

    try {
      if (newStatus === 'confirmed') {
        await moveBookingWorkflowToStage(bookingId, 'Shoot Scheduled', 'Booking confirmed')
      }
      if (newStatus === 'in_progress') {
        await moveBookingWorkflowToStage(bookingId, 'Shoot Scheduled', 'Booking is now in progress')
      }
      if (newStatus === 'completed') {
        await moveBookingWorkflowToStage(bookingId, 'Job Closed', 'Booking completed')
      }

      await createAuditLog({
        action: 'status_change',
        resource_type: 'booking',
        resource_id: bookingId,
        old_data: oldBooking ? { status: oldBooking.status } : null,
        new_data: { status: newStatus },
      })
    } catch (businessError) {
      console.error('Booking status automation failed:', businessError)
    }

    setBookings(bookings.map(b => 
      b.id === bookingId ? { ...b, status: newStatus as Booking['status'] } : b
    ))
    toast.success('Status updated')
    router.refresh()
  }

  const handleDeleteBooking = async (bookingId: string) => {
    const supabase = createClient()
    
    const oldBooking = bookings.find((booking) => booking.id === bookingId)

    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId)

    if (error) {
      toast.error('Failed to delete booking')
      return
    }

    await createAuditLog({
      action: 'delete',
      resource_type: 'booking',
      resource_id: bookingId,
      old_data: oldBooking || null,
    })

    setBookings(bookings.filter(b => b.id !== bookingId))
    toast.success('Booking deleted')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Bookings</h1>
          <p className="text-muted-foreground mt-1">
            Manage all photography sessions and appointments.
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Booking
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Booking</DialogTitle>
              <DialogDescription>
                Schedule a new photography session for a client.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Client *</Label>
                <Select
                  value={newBooking.client_id}
                  onValueChange={(value) => setNewBooking({ ...newBooking, client_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.profile?.full_name || client.profile?.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Service *</Label>
                <Select
                  value={newBooking.service_id}
                  onValueChange={(value) => setNewBooking({ ...newBooking, service_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - ${service.base_price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={newBooking.booking_date}
                    onChange={(e) => setNewBooking({ ...newBooking, booking_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start Time *</Label>
                  <Input
                    type="time"
                    value={newBooking.start_time}
                    onChange={(e) => setNewBooking({ ...newBooking, start_time: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={newBooking.end_time}
                    onChange={(e) => setNewBooking({ ...newBooking, end_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    placeholder="Studio or address"
                    value={newBooking.location}
                    onChange={(e) => setNewBooking({ ...newBooking, location: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Any additional notes..."
                  value={newBooking.notes}
                  onChange={(e) => setNewBooking({ ...newBooking, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateBooking} disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Booking'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by client or service..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            All Bookings ({filteredBookings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No bookings found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{booking.client?.profile?.full_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{booking.client?.profile?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{booking.service?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{new Date(booking.booking_date).toLocaleDateString()}</p>
                          <p className="text-xs text-muted-foreground">{booking.start_time?.slice(0, 5)}</p>
                        </div>
                      </TableCell>
                      <TableCell>{booking.location || 'Studio'}</TableCell>
                      <TableCell>${booking.total_amount?.toLocaleString() || 0}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${statusColors[booking.status]}`}>
                          {booking.status.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Booking
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleUpdateStatus(booking.id, 'confirmed')}
                              disabled={booking.status === 'confirmed'}
                            >
                              Confirm
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleUpdateStatus(booking.id, 'completed')}
                              disabled={booking.status === 'completed'}
                            >
                              Mark Complete
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteBooking(booking.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
