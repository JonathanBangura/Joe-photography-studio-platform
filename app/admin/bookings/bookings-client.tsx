'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, Filter, Calendar, MoreHorizontal, Edit, Trash2, Eye, DollarSign, Copy, ExternalLink, Link2, RefreshCw, Power, CalendarClock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Booking, Service, Client } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { createAuditLog } from '@/lib/audit-log-client'
import { adminDbMutation } from '@/lib/admin-api-client'
import { moveBookingWorkflowToStage } from '@/lib/business-logic-client'
import { convertUsdToSle, formatSle, formatUsd } from '@/lib/currency'
import { getInvoicePaymentSummary } from '@/lib/payment-summary'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface StaffOption {
  id: string
  full_name: string | null
  email: string | null
  studio_role: string | null
}

interface StudioResource {
  id: string
  name: string
  type: 'indoor' | 'outdoor' | 'event' | 'desk'
  capacity: number
}

interface ExtendedClient extends Client {
  full_name?: string | null
  email?: string | null
  phone?: string | null
  profile?: { full_name: string | null; email: string | null; phone?: string | null }
}

interface ExtendedBooking extends Booking {
  booking_reference?: string | null
  booking_source?: 'online' | 'walk_in'
  deposit_percentage?: number | null
  deposit_required_amount?: number | null
  deposit_paid_amount?: number | null
  currency?: string | null
  payment_currency?: string | null
  exchange_rate?: number | null
  total_amount_sle?: number | null
  deposit_required_amount_sle?: number | null
  deposit_paid_amount_sle?: number | null
  deposit_payment_method?: string | null
  deposit_status?: 'required' | 'partial' | 'paid' | 'waived'
  service?: Service
  client?: ExtendedClient
  staff?: { full_name: string | null }
  resource?: StudioResource | null
  resource_id?: string | null
  booking_environment?: 'indoor' | 'outdoor' | 'event'
  privacy_level?: 'shared' | 'private'
  locks_indoor_studio?: boolean | null
  availability_override?: boolean | null
  override_reason?: string | null
  invoice?: {
    id: string
    total_amount?: number | null
    total_amount_sle?: number | null
    exchange_rate?: number | null
    payment_status?: string | null
    payments?: Array<{
      amount?: number | null
      applied_amount?: number | null
      tip_amount?: number | null
      payment_status?: string | null
    }>
  } | Array<{
    id: string
    total_amount?: number | null
    total_amount_sle?: number | null
    exchange_rate?: number | null
    payment_status?: string | null
    payments?: Array<{
      amount?: number | null
      applied_amount?: number | null
      tip_amount?: number | null
      payment_status?: string | null
    }>
  }> | null
}


interface CustomerPaymentLink {
  id: string
  booking_id: string | null
  invoice_id: string | null
  client_id: string | null
  token: string
  status: 'active' | 'disabled' | 'expired'
  expires_at: string | null
  payment_url: string
  created_at: string | null
  updated_at: string | null
}

interface BookingsClientProps {
  initialBookings: ExtendedBooking[]
  services: Service[]
  clients: ExtendedClient[]
  staff: StaffOption[]
  resources: StudioResource[]
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-500',
  confirmed: 'bg-green-500/10 text-green-500',
  in_progress: 'bg-blue-500/10 text-blue-500',
  completed: 'bg-primary/10 text-primary',
  cancelled: 'bg-destructive/10 text-destructive',
}

const depositColors: Record<string, string> = {
  required: 'bg-amber-500/10 text-amber-600',
  partial: 'bg-blue-500/10 text-blue-600',
  paid: 'bg-green-500/10 text-green-600',
  waived: 'bg-muted text-muted-foreground',
}

function getClientName(client?: ExtendedClient | null) {
  return client?.full_name || client?.profile?.full_name || client?.email || client?.profile?.email || 'Unknown Client'
}

function getClientEmail(client?: ExtendedClient | null) {
  return client?.email || client?.profile?.email || ''
}

function addMinutes(time: string, minutes: number) {
  const [hours, mins] = time.split(':').map(Number)
  const date = new Date(2000, 0, 1, hours || 0, mins || 0)
  date.setMinutes(date.getMinutes() + minutes)
  return date.toTimeString().slice(0, 5)
}

function getBookingInvoice(booking?: ExtendedBooking | null) {
  if (!booking?.invoice) return null
  return Array.isArray(booking.invoice) ? booking.invoice[0] || null : booking.invoice
}

function getBookingRate(booking: ExtendedBooking) {
  return Number(booking.exchange_rate || getBookingInvoice(booking)?.exchange_rate || 24)
}

function getBookingTotalSle(booking: ExtendedBooking) {
  return Number(
    booking.total_amount_sle ||
      Number(booking.total_amount || 0) * getBookingRate(booking),
  )
}

function getBookingDepositRequiredSle(booking: ExtendedBooking) {
  return Number(
    booking.deposit_required_amount_sle ||
      Number(booking.deposit_required_amount || 0) * getBookingRate(booking),
  )
}

function getBookingDepositPaidSle(booking: ExtendedBooking) {
  const invoice = getBookingInvoice(booking)
  if (invoice) {
    const summary = getInvoicePaymentSummary(invoice)
    return Math.min(summary.paidSle, getBookingDepositRequiredSle(booking))
  }

  return Number(
    booking.deposit_paid_amount_sle ||
      Number(booking.deposit_paid_amount || 0) * getBookingRate(booking),
  )
}

function getResourcesForEnvironment(resources: StudioResource[], environment: string) {
  return resources.filter((resource) => {
    if (environment === 'indoor') return resource.type === 'indoor' || resource.type === 'desk'
    return resource.type === environment
  })
}

function isResourceRequired(environment: string) {
  return environment !== 'outdoor'
}

export function BookingsClient({ initialBookings, services, clients, staff, resources }: BookingsClientProps) {
  const router = useRouter()
  const [bookings, setBookings] = useState(initialBookings)
  const [studioResources, setStudioResources] = useState(resources)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currencyRate, setCurrencyRate] = useState(24)
  const [clientMode, setClientMode] = useState<'existing' | 'new'>('new')
  const [selectedBooking, setSelectedBooking] = useState<ExtendedBooking | null>(null)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editBooking, setEditBooking] = useState({
    id: '',
    booking_date: '',
    start_time: '',
    end_time: '',
    status: 'pending',
    staff_id: '',
    resource_id: '',
    booking_environment: 'indoor',
    privacy_level: 'shared',
    location: '',
    total_amount: '',
    deposit_percentage: '50',
    deposit_required_amount: '',
    deposit_paid_amount: '',
    deposit_payment_method: '',
    deposit_status: 'required',
    notes: '',
    availability_override: false,
    override_reason: '',
  })

  const [paymentLink, setPaymentLink] = useState<CustomerPaymentLink | null>(null)
  const [paymentLinkLoading, setPaymentLinkLoading] = useState(false)
  const [paymentLinkSaving, setPaymentLinkSaving] = useState(false)
  const [paymentLinkExpiry, setPaymentLinkExpiry] = useState('')

  useEffect(() => {
    setStudioResources(resources)
  }, [resources])

  useEffect(() => {
    if (studioResources.length > 0) return

    fetch('/api/admin/studio-resources', { cache: 'no-store' })
      .then((response) => response.json())
      .then((result) => {
        if (Array.isArray(result?.resources)) {
          setStudioResources(result.resources)
        }
      })
      .catch((error) => {
        console.error('Studio resources load error:', error)
      })
  }, [studioResources.length])

  useEffect(() => {
    fetch('/api/business-settings')
      .then((response) => response.json())
      .then((result) => {
        const rate = Number(result?.settings?.usd_to_sle_rate || 24)
        if (Number.isFinite(rate) && rate > 0) setCurrencyRate(rate)
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (selectedBooking?.id && isViewOpen) {
      loadPaymentLink(selectedBooking.id)
    } else {
      setPaymentLink(null)
      setPaymentLinkExpiry('')
    }
  }, [selectedBooking?.id, isViewOpen])

  const [newBooking, setNewBooking] = useState({
    existing_client_id: '',
    full_name: '',
    email: '',
    phone: '',
    service_id: '',
    staff_id: '',
    resource_id: '',
    booking_environment: 'indoor',
    privacy_level: 'shared',
    availability_override: false,
    override_reason: '',
    booking_date: '',
    start_time: '',
    location: 'Studio',
    notes: '',
    deposit_percentage: '50',
    deposit_paid_amount: '',
    deposit_payment_method: 'cash',
    transaction_id: '',
  })


  async function loadPaymentLink(bookingId: string) {
    setPaymentLinkLoading(true)
    try {
      const response = await fetch(`/api/admin/payment-links?booking_id=${bookingId}`, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to load payment link')
      setPaymentLink(result.data || null)
      setPaymentLinkExpiry(result.data?.expires_at ? String(result.data.expires_at).slice(0, 16) : '')
    } catch (error) {
      console.error('Load payment link error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load payment link')
    } finally {
      setPaymentLinkLoading(false)
    }
  }

  async function createOrUpdatePaymentLink(options?: { regenerate?: boolean; status?: 'active' | 'disabled' | 'expired' }) {
    if (!selectedBooking?.id) return

    setPaymentLinkSaving(true)
    try {
      const isPatch = Boolean(paymentLink?.id) && !options?.regenerate
      const response = await fetch(
        isPatch ? `/api/admin/payment-links/${paymentLink?.id}` : '/api/admin/payment-links',
        {
          method: isPatch ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            booking_id: selectedBooking.id,
            expires_at: paymentLinkExpiry || null,
            status: options?.status,
            regenerate: Boolean(options?.regenerate),
          }),
        },
      )

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to update payment link')

      setPaymentLink(result.data || null)
      setPaymentLinkExpiry(result.data?.expires_at ? String(result.data.expires_at).slice(0, 16) : '')
      toast.success(options?.regenerate ? 'Payment link regenerated' : options?.status === 'disabled' ? 'Payment link disabled' : 'Payment link updated')
    } catch (error) {
      console.error('Payment link update error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update payment link')
    } finally {
      setPaymentLinkSaving(false)
    }
  }

  async function copyPaymentLink() {
    if (!paymentLink?.payment_url) return
    await navigator.clipboard.writeText(paymentLink.payment_url)
    toast.success('Payment link copied')
  }

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      getClientName(booking.client).toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.service?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.booking_reference?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const selectedService = services.find((service) => service.id === newBooking.service_id)
  const totalAmount = Number(selectedService?.base_price || 0)
  const depositRequired = Number(((totalAmount * Number(newBooking.deposit_percentage || 50)) / 100).toFixed(2))
  const totalAmountSle = convertUsdToSle(totalAmount, currencyRate)
  const depositRequiredSle = convertUsdToSle(depositRequired, currencyRate)

  const resetForm = () => {
    setClientMode('new')
    setNewBooking({
      existing_client_id: '',
      full_name: '',
      email: '',
      phone: '',
      service_id: '',
      staff_id: '',
      resource_id: '',
      booking_environment: 'indoor',
      privacy_level: 'shared',
      availability_override: false,
      override_reason: '',
      booking_date: '',
      start_time: '',
      location: 'Studio',
      notes: '',
      deposit_percentage: '50',
      deposit_paid_amount: '',
      deposit_payment_method: 'cash',
      transaction_id: '',
    })
  }

  const handleCreateBooking = async () => {
    if (!newBooking.service_id || !newBooking.booking_date || !newBooking.start_time) {
      toast.error('Please select service, date and time')
      return
    }

    if (isResourceRequired(newBooking.booking_environment) && !newBooking.resource_id) {
      toast.error('Please select a resource for indoor studio or event bookings')
      return
    }
    if (clientMode === 'existing' && !newBooking.existing_client_id) {
      toast.error('Please select an existing client')
      return
    }
    if (clientMode === 'new' && (!newBooking.full_name || (!newBooking.email && !newBooking.phone))) {
      toast.error('Please enter client name and email or phone')
      return
    }

    setIsLoading(true)

    try {
let existingClient = clients.find(
  (client) => client.id === newBooking.existing_client_id
)

const endTime = addMinutes(
  newBooking.start_time,
  Number(selectedService?.duration_minutes || 60)
)

// ======================================
// VALIDATE BOOKING AVAILABILITY
// ======================================

const validationResponse = await fetch(
  '/api/admin/bookings/validate',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      booking_date: newBooking.booking_date,
      start_time: newBooking.start_time,
      end_time: endTime,
      resource_id: newBooking.resource_id || null,
      staff_id: newBooking.staff_id || null,
      booking_environment:
        newBooking.booking_environment,
      privacy_level:
        newBooking.privacy_level,
    }),
  }
)

const validationResult =
  await validationResponse.json()

if (!validationResponse.ok) {
  throw new Error(
    validationResult.reason ||
      'Booking validation failed'
  )
}

// Conflict found
if (
  !validationResult.available &&
  !newBooking.availability_override
) {
  toast.error(
    validationResult.reason ||
      'Selected slot is unavailable'
  )

  setIsLoading(false)
  return
}

// Admin override
if (
  !validationResult.available &&
  newBooking.availability_override
) {
  if (!newBooking.override_reason.trim()) {
    toast.error(
      'Please enter an override reason'
    )

    setIsLoading(false)
    return
  }

  toast.warning(
    `Override used: ${
      validationResult.reason ||
      'Conflict detected'
    }`
  )
}

// ======================================
// CREATE BOOKING
// ======================================

const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_source: 'walk_in',
          service_id: newBooking.service_id,
          booking_date: newBooking.booking_date,
          start_time: newBooking.start_time,
          end_time: endTime,
          staff_id: newBooking.staff_id || null,
          resource_id: newBooking.resource_id || null,
          booking_environment: newBooking.booking_environment,
          privacy_level: newBooking.privacy_level,
          availability_override: newBooking.availability_override,
          override_reason: newBooking.override_reason || null,
          full_name: clientMode === 'existing' ? getClientName(existingClient) : newBooking.full_name,
          email: clientMode === 'existing' ? getClientEmail(existingClient) : newBooking.email,
          phone: clientMode === 'existing' ? (existingClient?.phone || existingClient?.profile?.phone || '') : newBooking.phone,
          location: newBooking.location || 'Studio',
          notes: newBooking.notes,
          deposit_percentage: Number(newBooking.deposit_percentage),
          deposit_paid_amount:
            Number(newBooking.deposit_paid_amount || 0) / currencyRate,
          deposit_paid_amount_sle: Number(newBooking.deposit_paid_amount || 0),
          deposit_payment_method: newBooking.deposit_payment_method,
          transaction_id: newBooking.transaction_id || null,
        }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to create booking')

      const enrichedBooking = {
        ...result.booking,
        service: selectedService,
        client: result.client,
        staff: staff.find((member) => member.id === newBooking.staff_id) || null,
        resource: studioResources.find((resource) => resource.id === newBooking.resource_id) || null,
      }

      setBookings([enrichedBooking, ...bookings])
      setIsCreateOpen(false)
      resetForm()
      toast.success('Walk-in booking created successfully')
      router.refresh()
    } catch (error) {
      console.error('Create walk-in booking error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create booking')
    } finally {
      setIsLoading(false)
    }
  }


  const handleViewBooking = (booking: ExtendedBooking) => {
    setSelectedBooking(booking)
    setIsViewOpen(true)
  }

  const handleEditBooking = (booking: ExtendedBooking) => {
    setSelectedBooking(booking)
    setEditBooking({
      id: booking.id,
      booking_date: booking.booking_date || '',
      start_time: booking.start_time?.slice(0, 5) || '',
      end_time: booking.end_time?.slice(0, 5) || '',
      status: booking.status || 'pending',
      staff_id: booking.staff_id || '',
      resource_id: booking.resource_id || '',
      booking_environment: booking.booking_environment || 'indoor',
      privacy_level: booking.privacy_level || 'shared',
      location: booking.location || '',
      total_amount: String(booking.total_amount || ''),
      deposit_percentage: String(booking.deposit_percentage || 50),
      deposit_required_amount: String(booking.deposit_required_amount || 0),
      deposit_paid_amount: String(booking.deposit_paid_amount || 0),
      deposit_payment_method: booking.deposit_payment_method || '',
      deposit_status: booking.deposit_status || 'required',
      notes: booking.notes || '',
      availability_override: Boolean(booking.availability_override),
      override_reason: booking.override_reason || '',
    })
    setIsEditOpen(true)
  }

  const handleSaveBooking = async () => {
    if (!editBooking.id) return
    if (!editBooking.booking_date || !editBooking.start_time || !editBooking.end_time) {
      toast.error('Please enter date, start time and end time')
      return
    }

    setIsLoading(true)
    const oldBooking = bookings.find((booking) => booking.id === editBooking.id)

    const totalAmountValue = Number(editBooking.total_amount || 0)
    const depositPercentageValue = Number(editBooking.deposit_percentage || 0)
    const depositRequiredValue = editBooking.deposit_required_amount
      ? Number(editBooking.deposit_required_amount)
      : Number(((totalAmountValue * depositPercentageValue) / 100).toFixed(2))
    const depositPaidValue = Number(editBooking.deposit_paid_amount || 0)
    const exchangeRateValue = Number(oldBooking?.exchange_rate || currencyRate || 24)
    const depositStatusValue = editBooking.deposit_status || (
      depositPaidValue <= 0 ? 'required' : depositPaidValue >= depositRequiredValue ? 'paid' : 'partial'
    )

    const payload = {
      booking_date: editBooking.booking_date,
      start_time: editBooking.start_time,
      end_time: editBooking.end_time,
      status: editBooking.status,
      staff_id: editBooking.staff_id || null,
      resource_id: editBooking.resource_id || null,
      booking_environment: editBooking.booking_environment,
      privacy_level: editBooking.privacy_level,
      locks_indoor_studio: editBooking.booking_environment === 'indoor' && editBooking.privacy_level === 'private',
      location: editBooking.location || null,
      total_amount: totalAmountValue,
      total_amount_sle: convertUsdToSle(totalAmountValue, exchangeRateValue),
      exchange_rate: exchangeRateValue,
      payment_currency: 'SLE',
      deposit_percentage: depositPercentageValue,
      deposit_required_amount: depositRequiredValue,
      deposit_required_amount_sle: convertUsdToSle(
        depositRequiredValue,
        exchangeRateValue,
      ),
      deposit_paid_amount: depositPaidValue,
      deposit_paid_amount_sle: convertUsdToSle(
        depositPaidValue,
        exchangeRateValue,
      ),
      deposit_payment_method: editBooking.deposit_payment_method || null,
      deposit_status: depositStatusValue,
      notes: editBooking.notes || null,
      availability_override: editBooking.availability_override,
      override_reason: editBooking.override_reason || null,
      updated_at: new Date().toISOString(),
    }

    try {
      await adminDbMutation({
        table: 'bookings',
        action: 'update',
        id: editBooking.id,
        payload,
      })
    } catch (error) {
      console.error('Update booking error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update booking')
      setIsLoading(false)
      return
    }

    try {
      await createAuditLog({
        action: 'update',
        resource_type: 'booking',
        resource_id: editBooking.id,
        old_data: oldBooking || null,
        new_data: payload,
      })
      if (editBooking.status === 'confirmed') await moveBookingWorkflowToStage(editBooking.id, 'Shoot Scheduled', 'Booking confirmed')
      if (editBooking.status === 'completed') await moveBookingWorkflowToStage(editBooking.id, 'Job Closed', 'Booking completed')
    } catch (businessError) {
      console.error('Booking update automation failed:', businessError)
    }

    const updatedBookings = bookings.map((booking) => {
      if (booking.id !== editBooking.id) return booking
      return {
        ...booking,
        ...payload,
        status: payload.status as Booking['status'],
        staff: staff.find((member) => member.id === payload.staff_id) || null,
        resource: studioResources.find((resource) => resource.id === payload.resource_id) || null,
      } as ExtendedBooking
    })

    setBookings(updatedBookings)
    const updatedSelected = updatedBookings.find((booking) => booking.id === editBooking.id) || null
    setSelectedBooking(updatedSelected)
    setIsEditOpen(false)
    toast.success('Booking updated successfully')
    router.refresh()
    setIsLoading(false)
  }

  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    const oldBooking = bookings.find((booking) => booking.id === bookingId)

    try {
      await adminDbMutation({
        table: 'bookings',
        action: 'update',
        id: bookingId,
        payload: { status: newStatus },
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status')
      return
    }

    try {
      if (newStatus === 'confirmed') await moveBookingWorkflowToStage(bookingId, 'Shoot Scheduled', 'Booking confirmed')
      if (newStatus === 'in_progress') await moveBookingWorkflowToStage(bookingId, 'Shoot Scheduled', 'Booking is now in progress')
      if (newStatus === 'completed') await moveBookingWorkflowToStage(bookingId, 'Job Closed', 'Booking completed')

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

    setBookings(bookings.map((booking) => booking.id === bookingId ? { ...booking, status: newStatus as Booking['status'] } : booking))
    toast.success('Status updated')
    router.refresh()
  }

  const handleDeleteBooking = async (bookingId: string) => {
    const oldBooking = bookings.find((booking) => booking.id === bookingId)

    try {
      await adminDbMutation({
        table: 'bookings',
        action: 'delete',
        id: bookingId,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete booking')
      return
    }

    await createAuditLog({ action: 'delete', resource_type: 'booking', resource_id: bookingId, old_data: oldBooking || null })
    setBookings(bookings.filter((booking) => booking.id !== bookingId))
    toast.success('Booking deleted')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Bookings</h1>
          <p className="text-muted-foreground mt-1">Manage online bookings and front desk walk-in bookings.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> New Walk-In Booking</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Walk-In Booking</DialogTitle>
              <DialogDescription>Use this for front desk bookings where staff enters the client, photographer and deposit details.</DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <Label>Client Type</Label>
                <Select value={clientMode} onValueChange={(value) => setClientMode(value as 'existing' | 'new')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New Client</SelectItem>
                    <SelectItem value="existing">Existing Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {clientMode === 'existing' ? (
                <div className="space-y-2">
                  <Label>Existing Client *</Label>
                  <Select value={newBooking.existing_client_id} onValueChange={(value) => setNewBooking({ ...newBooking, existing_client_id: value })}>
                    <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>{getClientName(client)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2 md:col-span-1"><Label>Full Name *</Label><Input value={newBooking.full_name} onChange={(e) => setNewBooking({ ...newBooking, full_name: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Phone</Label><Input value={newBooking.phone} onChange={(e) => setNewBooking({ ...newBooking, phone: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Email</Label><Input type="email" value={newBooking.email} onChange={(e) => setNewBooking({ ...newBooking, email: e.target.value })} /></div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Package *</Label>
                  <Select value={newBooking.service_id} onValueChange={(value) => setNewBooking({ ...newBooking, service_id: value })}>
                    <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
                    <SelectContent>{services.map((service) => <SelectItem key={service.id} value={service.id}>{service.name} - {formatUsd(Number(service.base_price || 0))} / {formatSle(convertUsdToSle(Number(service.base_price || 0), currencyRate))}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Photographer</Label>
                  <Select value={newBooking.staff_id} onValueChange={(value) => setNewBooking({ ...newBooking, staff_id: value })}>
                    <SelectTrigger><SelectValue placeholder="Assign photographer" /></SelectTrigger>
                    <SelectContent>{staff.map((member) => <SelectItem key={member.id} value={member.id}>{member.full_name || member.email}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-4">
                <div className="font-medium">Studio Availability Rules</div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Environment</Label>
                    <Select
                      value={newBooking.booking_environment}
                      onValueChange={(value) =>
                        setNewBooking({
                          ...newBooking,
                          booking_environment: value,
                          privacy_level: value === 'indoor' ? newBooking.privacy_level : 'shared',
                          resource_id: '',
                        })
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="indoor">Indoor Studio</SelectItem>
                        <SelectItem value="outdoor">Outdoor Shoot</SelectItem>
                        <SelectItem value="event">Event Coverage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Privacy</Label>
                    <Select
                      value={newBooking.privacy_level}
                      onValueChange={(value) => setNewBooking({ ...newBooking, privacy_level: value, resource_id: '' })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shared">Shared Resource</SelectItem>
                        <SelectItem value="private" disabled={newBooking.booking_environment !== 'indoor'}>Private Indoor Studio Lock</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Resource {isResourceRequired(newBooking.booking_environment) ? '*' : '(optional)'}</Label>
                    <Select
                      value={newBooking.resource_id || 'none'}
                      onValueChange={(value) => setNewBooking({ ...newBooking, resource_id: value === 'none' ? '' : value })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select resource" /></SelectTrigger>
                      <SelectContent>
                        {isResourceRequired(newBooking.booking_environment) ? (
                          <SelectItem value="none" disabled>Select resource</SelectItem>
                        ) : (
                          <SelectItem value="none">No specific resource</SelectItem>
                        )}
                        {getResourcesForEnvironment(studioResources, newBooking.booking_environment).map((resource) => (
                          <SelectItem key={resource.id} value={resource.id}>{resource.name}</SelectItem>
                        ))}
                        {getResourcesForEnvironment(studioResources, newBooking.booking_environment).length === 0 && isResourceRequired(newBooking.booking_environment) && (
                          <SelectItem value="__empty" disabled>No active resources configured</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {getResourcesForEnvironment(studioResources, newBooking.booking_environment).length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        {isResourceRequired(newBooking.booking_environment)
                          ? 'Add an active studio resource before creating this booking type.'
                          : 'Outdoor bookings can continue without assigning a resource.'}
                      </p>
                    )}
                  </div>
                </div>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={newBooking.availability_override}
                    onChange={(event) => setNewBooking({ ...newBooking, availability_override: event.target.checked })}
                    className="mt-1"
                  />
                  <span>Allow admin override if the selected slot/resource is already booked.</span>
                </label>
                {newBooking.availability_override && (
                  <div className="space-y-2">
                    <Label>Override Reason</Label>
                    <Input
                      value={newBooking.override_reason}
                      onChange={(event) => setNewBooking({ ...newBooking, override_reason: event.target.value })}
                      placeholder="Example: manager approved special arrangement"
                    />
                  </div>
                )}
                {newBooking.booking_environment === 'indoor' && newBooking.privacy_level === 'private' && (
                  <p className="text-sm text-amber-600">Private indoor booking locks all indoor rooms for this date/time. Outdoor shoots can still be booked.</p>
                )}
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Date *</Label><Input type="date" value={newBooking.booking_date} onChange={(e) => setNewBooking({ ...newBooking, booking_date: e.target.value })} /></div>
                <div className="space-y-2"><Label>Start Time *</Label><Input type="time" value={newBooking.start_time} onChange={(e) => setNewBooking({ ...newBooking, start_time: e.target.value })} /></div>
                <div className="space-y-2"><Label>Location</Label><Input value={newBooking.location} onChange={(e) => setNewBooking({ ...newBooking, location: e.target.value })} /></div>
              </div>

              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center gap-2 font-medium"><DollarSign className="w-4 h-4" /> Deposit & Payment</div>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Deposit %</Label>
                    <Select value={newBooking.deposit_percentage} onValueChange={(value) => setNewBooking({ ...newBooking, deposit_percentage: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="30">30%</SelectItem><SelectItem value="50">50%</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Required</Label>
                    <Input value={`${formatSle(depositRequiredSle)} (${formatUsd(depositRequired)})`} readOnly />
                  </div>
                  <div className="space-y-2"><Label>Paid Now (SLE)</Label><Input type="number" min="0" value={newBooking.deposit_paid_amount} onChange={(e) => setNewBooking({ ...newBooking, deposit_paid_amount: e.target.value })} /></div>
                  <div className="space-y-2">
                    <Label>Method</Label>
                    <Select value={newBooking.deposit_payment_method} onValueChange={(value) => setNewBooking({ ...newBooking, deposit_payment_method: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="vult_mastercard">Vult Mastercard</SelectItem>
                        <SelectItem value="orange_money">Orange Money</SelectItem>
                        <SelectItem value="afrimoney">Afrimoney</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Package total: {formatSle(totalAmountSle)} ({formatUsd(totalAmount)}) at 1 USD = SLE {currencyRate.toLocaleString()}.
                </p>
                <div className="space-y-2"><Label>Transaction Reference</Label><Input placeholder="Receipt/reference number" value={newBooking.transaction_id} onChange={(e) => setNewBooking({ ...newBooking, transaction_id: e.target.value })} /></div>
              </div>

              <div className="space-y-2"><Label>Notes</Label><Textarea value={newBooking.notes} onChange={(e) => setNewBooking({ ...newBooking, notes: e.target.value })} /></div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateBooking} disabled={isLoading}>{isLoading ? 'Creating...' : 'Create Walk-In Booking'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by client, package or reference..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
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

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" /> All Bookings ({filteredBookings.length})</CardTitle></CardHeader>
        <CardContent>
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12"><Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" /><p className="text-muted-foreground">No bookings found</p></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead><TableHead>Package</TableHead><TableHead>Date & Time</TableHead><TableHead>Source</TableHead><TableHead>Deposit</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell><div><p className="font-medium">{getClientName(booking.client)}</p><p className="text-xs text-muted-foreground">{getClientEmail(booking.client) || booking.booking_reference}</p></div></TableCell>
                      <TableCell>{booking.service?.name || 'N/A'}</TableCell>
                      <TableCell><div><p className="font-medium">{new Date(booking.booking_date).toLocaleDateString()}</p><p className="text-xs text-muted-foreground">{booking.start_time?.slice(0, 5)} • {booking.staff?.full_name || 'Unassigned'}</p></div></TableCell>
                      <TableCell><span className="capitalize text-xs px-2 py-1 rounded bg-muted">{(booking.booking_source || 'online').replace('_', ' ')}</span></TableCell>
                      <TableCell><div className="space-y-1"><span className={`px-2 py-1 rounded text-xs font-medium capitalize ${depositColors[booking.deposit_status || 'required']}`}>{booking.deposit_status || 'required'}</span><p className="text-xs text-muted-foreground">{formatSle(getBookingDepositPaidSle(booking))} / {formatSle(getBookingDepositRequiredSle(booking))}</p></div></TableCell>
                      <TableCell><span className={`px-2 py-1 rounded text-xs font-medium capitalize ${statusColors[booking.status] || statusColors.pending}`}>{booking.status.replace('_', ' ')}</span></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewBooking(booking)}><Eye className="w-4 h-4 mr-2" />View Details</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditBooking(booking)}><Edit className="w-4 h-4 mr-2" />Edit Booking</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(booking.id, 'confirmed')} disabled={booking.status === 'confirmed'}>Confirm</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(booking.id, 'completed')} disabled={booking.status === 'completed'}>Mark Complete</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteBooking(booking.id)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
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

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>{selectedBooking?.booking_reference || 'View booking information'}</DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-5 py-2">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-lg border p-4 space-y-2">
                  <h3 className="font-semibold">Client</h3>
                  <p className="font-medium">{getClientName(selectedBooking.client)}</p>
                  <p className="text-sm text-muted-foreground">{getClientEmail(selectedBooking.client) || 'No email'}</p>
                  <p className="text-sm text-muted-foreground">{selectedBooking.client?.phone || selectedBooking.client?.profile?.phone || 'No phone'}</p>
                </div>
                <div className="rounded-lg border p-4 space-y-2">
                  <h3 className="font-semibold">Package</h3>
                  <p className="font-medium">{selectedBooking.service?.name || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">
                    Total: {formatSle(getBookingTotalSle(selectedBooking))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatUsd(Number(selectedBooking.total_amount || 0))} at 1 USD = SLE {getBookingRate(selectedBooking).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Status: {selectedBooking.status?.replace('_', ' ')}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-lg border p-4 space-y-2">
                  <h3 className="font-semibold">Schedule</h3>
                  <p>{new Date(selectedBooking.booking_date).toLocaleDateString()}</p>
                  <p className="text-sm text-muted-foreground">{selectedBooking.start_time?.slice(0, 5)} - {selectedBooking.end_time?.slice(0, 5)}</p>
                  <p className="text-sm text-muted-foreground">Photographer: {selectedBooking.staff?.full_name || 'Unassigned'}</p>
                </div>
                <div className="rounded-lg border p-4 space-y-2">
                  <h3 className="font-semibold">Studio Resource</h3>
                  <p>{selectedBooking.resource?.name || 'No resource assigned'}</p>
                  <p className="text-sm text-muted-foreground">Environment: {selectedBooking.booking_environment || 'indoor'}</p>
                  <p className="text-sm text-muted-foreground">Privacy: {selectedBooking.privacy_level || 'shared'}</p>
                  {selectedBooking.locks_indoor_studio && <p className="text-sm text-amber-600">Private booking locks the indoor studio.</p>}
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-2">
                <h3 className="font-semibold">Deposit</h3>
                <div className="grid sm:grid-cols-4 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Required</span><p className="font-medium">{formatSle(getBookingDepositRequiredSle(selectedBooking))}</p></div>
                  <div><span className="text-muted-foreground">Paid</span><p className="font-medium">{formatSle(getBookingDepositPaidSle(selectedBooking))}</p></div>
                  <div><span className="text-muted-foreground">Method</span><p className="font-medium capitalize">{selectedBooking.deposit_payment_method?.replace('_', ' ') || 'N/A'}</p></div>
                  <div><span className="text-muted-foreground">Status</span><p className="font-medium capitalize">{selectedBooking.deposit_status || 'required'}</p></div>
                </div>
                {getBookingInvoice(selectedBooking) && (
                  <div className="grid gap-3 border-t pt-3 text-sm sm:grid-cols-3">
                    <div>
                      <span className="text-muted-foreground">Invoice Paid</span>
                      <p className="font-medium">
                        {formatSle(
                          getInvoicePaymentSummary(getBookingInvoice(selectedBooking)!).paidSle,
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Balance</span>
                      <p className="font-medium">
                        {formatSle(
                          getInvoicePaymentSummary(getBookingInvoice(selectedBooking)!).balanceSle,
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tips</span>
                      <p className="font-medium">
                        {formatSle(
                          getInvoicePaymentSummary(getBookingInvoice(selectedBooking)!).tipsSle,
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>



              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 font-semibold">
                      <Link2 className="h-4 w-4" /> Customer Payment Link
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Copy this link for WhatsApp, resend by email later, or extend expiry if the customer lost access.
                    </p>
                  </div>
                  {paymentLink?.status && (
                    <span className={`rounded px-2 py-1 text-xs font-medium capitalize ${paymentLink.status === 'active' ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                      {paymentLink.status}
                    </span>
                  )}
                </div>

                {paymentLinkLoading ? (
                  <p className="text-sm text-muted-foreground">Loading payment link...</p>
                ) : paymentLink ? (
                  <div className="space-y-3">
                    <div className="rounded-md bg-muted p-3 text-sm break-all">
                      {paymentLink.payment_url}
                    </div>
                    <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                      <div className="space-y-2">
                        <Label>Expiry Date</Label>
                        <Input
                          type="datetime-local"
                          value={paymentLinkExpiry}
                          onChange={(event) => setPaymentLinkExpiry(event.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Leave blank for no expiry. Expired/disabled links cannot be used by customers.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => createOrUpdatePaymentLink()}
                        disabled={paymentLinkSaving}
                      >
                        <CalendarClock className="mr-2 h-4 w-4" />
                        Save Expiry
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={copyPaymentLink}>
                        <Copy className="mr-2 h-4 w-4" /> Copy Link
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => window.open(paymentLink.payment_url, '_blank')}>
                        <ExternalLink className="mr-2 h-4 w-4" /> Open
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => createOrUpdatePaymentLink({ regenerate: true })} disabled={paymentLinkSaving}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
                      </Button>
                      {paymentLink.status === 'disabled' ? (
                        <Button size="sm" onClick={() => createOrUpdatePaymentLink({ status: 'active' })} disabled={paymentLinkSaving}>
                          <Power className="mr-2 h-4 w-4" /> Enable
                        </Button>
                      ) : (
                        <Button variant="destructive" size="sm" onClick={() => createOrUpdatePaymentLink({ status: 'disabled' })} disabled={paymentLinkSaving}>
                          <Power className="mr-2 h-4 w-4" /> Disable
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      No customer payment link exists yet for this booking.
                    </p>
                    <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                      <div className="space-y-2">
                        <Label>Expiry Date</Label>
                        <Input
                          type="datetime-local"
                          value={paymentLinkExpiry}
                          onChange={(event) => setPaymentLinkExpiry(event.target.value)}
                        />
                      </div>
                      <Button onClick={() => createOrUpdatePaymentLink()} disabled={paymentLinkSaving}>
                        <Link2 className="mr-2 h-4 w-4" /> Create Link
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {selectedBooking.notes && (
                <div className="rounded-lg border p-4 space-y-2">
                  <h3 className="font-semibold">Notes</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedBooking.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
            {selectedBooking && <Button onClick={() => handleEditBooking(selectedBooking)}>Edit Booking</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Booking</DialogTitle>
            <DialogDescription>Update schedule, photographer, resource, status and deposit information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Date *</Label><Input type="date" value={editBooking.booking_date} onChange={(e) => setEditBooking({ ...editBooking, booking_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Start *</Label><Input type="time" value={editBooking.start_time} onChange={(e) => setEditBooking({ ...editBooking, start_time: e.target.value })} /></div>
              <div className="space-y-2"><Label>End *</Label><Input type="time" value={editBooking.end_time} onChange={(e) => setEditBooking({ ...editBooking, end_time: e.target.value })} /></div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editBooking.status} onValueChange={(value) => setEditBooking({ ...editBooking, status: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Photographer</Label>
                <Select value={editBooking.staff_id} onValueChange={(value) => setEditBooking({ ...editBooking, staff_id: value })}>
                  <SelectTrigger><SelectValue placeholder="Assign photographer" /></SelectTrigger>
                  <SelectContent>{staff.map((member) => <SelectItem key={member.id} value={member.id}>{member.full_name || member.email}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-4">
              <div className="font-medium">Resource & Privacy</div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Environment</Label>
                  <Select value={editBooking.booking_environment} onValueChange={(value) => setEditBooking({ ...editBooking, booking_environment: value, privacy_level: value === 'indoor' ? editBooking.privacy_level : 'shared', resource_id: '' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="indoor">Indoor Studio</SelectItem><SelectItem value="outdoor">Outdoor Shoot</SelectItem><SelectItem value="event">Event Coverage</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Privacy</Label>
                  <Select value={editBooking.privacy_level} onValueChange={(value) => setEditBooking({ ...editBooking, privacy_level: value, resource_id: '' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="shared">Shared Resource</SelectItem><SelectItem value="private" disabled={editBooking.booking_environment !== 'indoor'}>Private Indoor Studio Lock</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Resource {isResourceRequired(editBooking.booking_environment) ? '*' : '(optional)'}</Label>
                  <Select
                    value={editBooking.resource_id || 'none'}
                    onValueChange={(value) => setEditBooking({ ...editBooking, resource_id: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select resource" /></SelectTrigger>
                    <SelectContent>
                      {isResourceRequired(editBooking.booking_environment) ? (
                        <SelectItem value="none" disabled>Select resource</SelectItem>
                      ) : (
                        <SelectItem value="none">No specific resource</SelectItem>
                      )}
                      {getResourcesForEnvironment(studioResources, editBooking.booking_environment).map((resource) => (
                        <SelectItem key={resource.id} value={resource.id}>{resource.name}</SelectItem>
                      ))}
                      {getResourcesForEnvironment(studioResources, editBooking.booking_environment).length === 0 && isResourceRequired(editBooking.booking_environment) && (
                        <SelectItem value="__empty" disabled>No active resources configured</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {getResourcesForEnvironment(studioResources, editBooking.booking_environment).length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      {isResourceRequired(editBooking.booking_environment)
                        ? 'Add an active studio resource before saving this booking type.'
                        : 'Outdoor bookings can continue without assigning a resource.'}
                    </p>
                  )}
                </div>
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={editBooking.availability_override} onChange={(event) => setEditBooking({ ...editBooking, availability_override: event.target.checked })} className="mt-1" />
                <span>Allow override if this resource/time conflicts.</span>
              </label>
              {editBooking.availability_override && <Input placeholder="Override reason" value={editBooking.override_reason} onChange={(e) => setEditBooking({ ...editBooking, override_reason: e.target.value })} />}
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Total Amount (USD)</Label><Input type="number" value={editBooking.total_amount} onChange={(e) => setEditBooking({ ...editBooking, total_amount: e.target.value })} /></div>
              <div className="space-y-2"><Label>Deposit %</Label><Input type="number" value={editBooking.deposit_percentage} onChange={(e) => setEditBooking({ ...editBooking, deposit_percentage: e.target.value })} /></div>
              <div className="space-y-2"><Label>Deposit Required (USD)</Label><Input type="number" value={editBooking.deposit_required_amount} onChange={(e) => setEditBooking({ ...editBooking, deposit_required_amount: e.target.value })} /></div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Deposit Paid (USD)</Label>
                <Input type="number" value={editBooking.deposit_paid_amount} readOnly />
                <p className="text-xs text-muted-foreground">
                  Record new payments from the invoice to keep the ledger synchronized.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Deposit Status</Label>
                <Select value={editBooking.deposit_status} onValueChange={(value) => setEditBooking({ ...editBooking, deposit_status: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="required">Required</SelectItem><SelectItem value="partial">Partial</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="waived">Waived</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={editBooking.deposit_payment_method} onValueChange={(value) => setEditBooking({ ...editBooking, deposit_payment_method: value })}>
                  <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                  <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="vult_mastercard">Vult Mastercard</SelectItem><SelectItem value="orange_money">Orange Money</SelectItem><SelectItem value="afrimoney">Afrimoney</SelectItem><SelectItem value="bank_transfer">Bank Transfer</SelectItem></SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2"><Label>Location</Label><Input value={editBooking.location} onChange={(e) => setEditBooking({ ...editBooking, location: e.target.value })} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={editBooking.notes} onChange={(e) => setEditBooking({ ...editBooking, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveBooking} disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
