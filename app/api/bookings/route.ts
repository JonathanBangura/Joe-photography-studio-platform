import { NextRequest, NextResponse } from 'next/server'
import { sendEmailSafely } from '@/lib/mail'
import { getInternalNotificationRecipients } from '@/lib/notification-recipients'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const WORKFLOW_STAGES = [
  { name: 'Booking Received', description: 'Booking has been created and is awaiting confirmation.', color: '#F59E0B', sort_order: 1 },
  { name: 'Deposit Paid', description: 'Client deposit has been received.', color: '#3B82F6', sort_order: 2 },
  { name: 'Shoot Scheduled', description: 'Session has been confirmed and scheduled.', color: '#8B5CF6', sort_order: 3 },
  { name: 'Shoot Completed', description: 'Photo session has been completed.', color: '#06B6D4', sort_order: 4 },
  { name: 'Photos Uploaded', description: 'Photo previews have been uploaded.', color: '#14B8A6', sort_order: 5 },
  { name: 'Customer Selection', description: 'Client is selecting preferred photos.', color: '#6366F1', sort_order: 6 },
  { name: 'Editing In Progress', description: 'Selected photos are being edited.', color: '#F97316', sort_order: 7 },
  { name: 'Final Delivery', description: 'Final edited photos are ready for delivery.', color: '#22C55E', sort_order: 8 },
  { name: 'Job Closed', description: 'Job has been completed and closed.', color: '#10B981', sort_order: 9 },
]

type BookingEnvironment = 'indoor' | 'outdoor' | 'event'
type PrivacyLevel = 'shared' | 'private'

type ExistingBooking = {
  id: string
  resource_id: string | null
  staff_id: string | null
  booking_environment: BookingEnvironment | null
  privacy_level: PrivacyLevel | null
  locks_indoor_studio: boolean | null
  studio_resources?: { id: string; name: string; type: string } | null
}

function addMinutes(time: string, minutes: number) {
  const [hours, mins] = time.split(':').map(Number)
  const date = new Date(2000, 0, 1, hours || 0, mins || 0)
  date.setMinutes(date.getMinutes() + minutes)
  return date.toTimeString().slice(0, 5)
}

function invoiceNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `INV-${stamp}-${Math.floor(1000 + Math.random() * 9000)}`
}

function bookingReference() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `BK-${stamp}-${Math.floor(1000 + Math.random() * 9000)}`
}

async function getCurrencySettings(supabase: ReturnType<typeof createAdminClient>) {
  const defaults = {
    base_currency: 'USD',
    local_currency: 'SLE',
    payment_currency: 'SLE',
    usd_to_sle_rate: 24,
    price_display_mode: 'both',
  }

  const { data } = await supabase
    .from('business_settings')
    .select('key, value')
    .in('key', ['base_currency', 'local_currency', 'payment_currency', 'usd_to_sle_rate', 'price_display_mode'])

  const settings: Record<string, any> = { ...defaults }
  ;(data || []).forEach((item) => {
    settings[item.key] = item.value
  })

  return {
    ...defaults,
    ...settings,
    usd_to_sle_rate: Number(settings.usd_to_sle_rate || defaults.usd_to_sle_rate),
  }
}

function toSle(usdAmount: number, exchangeRate: number) {
  return Number((Number(usdAmount || 0) * Number(exchangeRate || 0)).toFixed(2))
}

function paymentLinkToken() {
  const random = Math.random().toString(36).slice(2, 10).toUpperCase()
  const time = Date.now().toString(36).toUpperCase()
  return `PAY-${time}-${random}`
}

function appBaseUrl(request: NextRequest) {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`
  )
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatSle(value: unknown) {
  return `SLE ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatBookingDate(value: string) {
  if (!value) return 'To be confirmed'
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function normalizeEnvironment(value: unknown): BookingEnvironment {
  return value === 'outdoor' || value === 'event' ? value : 'indoor'
}

function normalizePrivacy(value: unknown): PrivacyLevel {
  return value === 'private' ? 'private' : 'shared'
}

function isIndoorLike(booking: ExistingBooking) {
  return booking.booking_environment === 'indoor' || booking.studio_resources?.type === 'indoor' || booking.studio_resources?.type === 'desk'
}

async function ensureWorkflowStage(supabase: ReturnType<typeof createAdminClient>, stageName: string) {
  const { data: existing } = await supabase
    .from('workflow_stages')
    .select('*')
    .ilike('name', stageName)
    .maybeSingle()

  if (existing) return existing

  const stage = WORKFLOW_STAGES.find((item) => item.name.toLowerCase() === stageName.toLowerCase()) || WORKFLOW_STAGES[0]
  const { data, error } = await supabase.from('workflow_stages').insert(stage).select('*').single()
  if (error) throw error
  return data
}

async function assertAvailability(params: {
  supabase: ReturnType<typeof createAdminClient>
  bookingDate: string
  startTime: string
  endTime: string
  resourceId: string | null
  staffId: string | null
  bookingEnvironment: BookingEnvironment
  privacyLevel: PrivacyLevel
  allowOverride: boolean
}) {
  const {
    supabase,
    bookingDate,
    startTime,
    endTime,
    resourceId,
    staffId,
    bookingEnvironment,
    privacyLevel,
    allowOverride,
  } = params

  if (allowOverride) return

  const { data: resource, error: resourceError } = resourceId
    ? await supabase.from('studio_resources').select('*').eq('id', resourceId).eq('is_active', true).maybeSingle()
    : { data: null, error: null }

  if (resourceError) throw resourceError

  if (!resourceId && bookingEnvironment !== 'outdoor') {
    throw new Error('Please select a studio resource for indoor/private bookings.')
  }

  const { data: overlapping, error } = await supabase
    .from('bookings')
    .select('id, resource_id, staff_id, booking_environment, privacy_level, locks_indoor_studio, studio_resources(id, name, type)')
    .eq('booking_date', bookingDate)
    .not('status', 'eq', 'cancelled')
    .lt('start_time', endTime)
    .gt('end_time', startTime)

  if (error) throw error

  const existing = (overlapping || []) as ExistingBooking[]
  const newIsIndoor = bookingEnvironment === 'indoor' || resource?.type === 'indoor' || resource?.type === 'desk'

  if (newIsIndoor && privacyLevel === 'private') {
    const indoorConflict = existing.find(isIndoorLike)
    if (indoorConflict) {
      throw new Error('Private indoor booking unavailable: another indoor booking already exists during this time.')
    }
  }

  if (newIsIndoor && privacyLevel === 'shared') {
    const privateIndoorLock = existing.find((booking) => booking.locks_indoor_studio && isIndoorLike(booking))
    if (privateIndoorLock) {
      throw new Error('Indoor studio unavailable: a private indoor session has locked the studio during this time.')
    }
  }

  if (resourceId) {
    const sameResourceCount = existing.filter((booking) => booking.resource_id === resourceId).length
    const capacity = Number(resource?.capacity || 1)
    if (sameResourceCount >= capacity) {
      throw new Error(`${resource?.name || 'Selected resource'} is already fully booked for this time.`)
    }
  }

  if (staffId) {
    const staffConflict = existing.find((booking) => booking.staff_id === staffId)
    if (staffConflict) {
      throw new Error('Selected photographer/staff member is already assigned to another booking at this time.')
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createAdminClient()
    const isPortalBooking = body.portal_booking === true

    const serviceId = String(body.service_id || '')
    const bookingDate = String(body.booking_date || '')
    const startTime = String(body.start_time || '')
    let fullName = String(body.full_name || body.name || '').trim()
    let email = String(body.email || '').trim().toLowerCase()
    let phone = String(body.phone || '').trim()
    let authUserId: string | null = null

    if (isPortalBooking) {
      const authSupabase = await createClient()
      const {
        data: { user },
      } = await authSupabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Please sign in to book from the client portal.' }, { status: 401 })
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, is_active, studio_role')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) throw profileError

      if (!profile || profile.is_active === false) {
        return NextResponse.json({ error: 'Your client profile is inactive or unavailable.' }, { status: 403 })
      }

      authUserId = user.id
      fullName = fullName || String(profile.full_name || user.user_metadata?.full_name || user.email || '').trim()
      email = email || String(profile.email || user.email || '').trim().toLowerCase()
      phone = phone || String(profile.phone || '').trim()
    }

    if (!serviceId || !bookingDate || !startTime || !fullName || (!email && !phone)) {
      return NextResponse.json(
        { error: 'Missing required booking fields. Name plus email or phone is required.' },
        { status: 400 }
      )
    }

    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .single()

    if (serviceError || !service) {
      return NextResponse.json({ error: 'Selected service/package was not found.' }, { status: 404 })
    }

    const currencySettings = await getCurrencySettings(supabase)
    const exchangeRate = Number(body.exchange_rate || currencySettings.usd_to_sle_rate || 24)

    const bookingEnvironment = normalizeEnvironment(body.booking_environment)
    const privacyLevel = normalizePrivacy(body.privacy_level)
    const resourceId = body.resource_id ? String(body.resource_id) : null
    const staffId = body.staff_id ? String(body.staff_id) : null
    const allowOverride = Boolean(body.availability_override)
    const endTime = body.end_time || addMinutes(startTime, Number(service.duration_minutes || 60))

    await assertAvailability({
      supabase,
      bookingDate,
      startTime,
      endTime,
      resourceId,
      staffId,
      bookingEnvironment,
      privacyLevel,
      allowOverride,
    })

    let client = null
    if (authUserId) {
      const { data } = await supabase.from('clients').select('*').eq('profile_id', authUserId).maybeSingle()
      client = data
    }
    if (!client && email) {
      const { data } = await supabase.from('clients').select('*').eq('email', email).maybeSingle()
      client = data
    }
    if (!client && phone) {
      const { data } = await supabase.from('clients').select('*').eq('phone', phone).maybeSingle()
      client = data
    }

    if (client) {
      await supabase
        .from('clients')
        .update({
          full_name: fullName,
          email: email || client.email,
          phone: phone || client.phone,
          profile_id: client.profile_id || authUserId || null,
          address: body.address || body.location || client.address || null,
          city: body.city || client.city || null,
          preferred_contact: body.preferred_contact || client.preferred_contact || 'phone',
          updated_at: new Date().toISOString(),
        })
        .eq('id', client.id)
    } else {
      const { data: createdClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          profile_id: authUserId,
          full_name: fullName,
          email: email || null,
          phone: phone || null,
          address: body.address || body.location || null,
          city: body.city || null,
          preferred_contact: body.preferred_contact || 'phone',
          notes: body.client_notes || null,
        })
        .select('*')
        .single()

      if (clientError) throw clientError
      client = createdClient
    }

    const depositPercentage = Number(body.deposit_percentage || 50)
    const totalAmount = Number(body.total_amount || service.base_price || 0)
    const totalAmountSle = Number(body.total_amount_sle || toSle(totalAmount, exchangeRate))
    const depositRequiredAmount = Number(((totalAmount * depositPercentage) / 100).toFixed(2))
    const depositRequiredAmountSle = Number(body.deposit_required_amount_sle || toSle(depositRequiredAmount, exchangeRate))
    const depositPaidAmount = Number(body.deposit_paid_amount || 0)
    const depositPaidAmountSle = Number(body.deposit_paid_amount_sle || toSle(depositPaidAmount, exchangeRate))
    const depositStatus = depositPaidAmount >= depositRequiredAmount ? 'paid' : depositPaidAmount > 0 ? 'partial' : 'required'
    const bookingSource = body.booking_source === 'walk_in' ? 'walk_in' : 'online'
    const reference = bookingReference()

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        client_id: client.id,
        service_id: serviceId,
        staff_id: staffId,
        resource_id: resourceId,
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        location: body.location || (bookingEnvironment === 'outdoor' ? 'Outdoor' : 'Studio'),
        status: depositPaidAmount > 0 || bookingSource === 'walk_in' ? 'confirmed' : 'pending',
        total_amount: totalAmount,
        currency: currencySettings.base_currency,
        payment_currency: 'SLE',
        exchange_rate: exchangeRate,
        total_amount_sle: totalAmountSle,
        booking_source: bookingSource,
        booking_reference: reference,
        booking_environment: bookingEnvironment,
        privacy_level: privacyLevel,
        locks_indoor_studio: bookingEnvironment === 'indoor' && privacyLevel === 'private',
        availability_override: allowOverride,
        override_reason: allowOverride ? body.override_reason || 'Admin override' : null,
        deposit_percentage: depositPercentage,
        deposit_required_amount: depositRequiredAmount,
        deposit_required_amount_sle: depositRequiredAmountSle,
        deposit_paid_amount: depositPaidAmount,
        deposit_paid_amount_sle: depositPaidAmountSle,
        deposit_payment_method: body.deposit_payment_method || null,
        deposit_status: depositStatus,
        created_by: authUserId || body.created_by || null,
        notes: body.notes || null,
      })
      .select('*')
      .single()

    if (bookingError) throw bookingError

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 7)

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        booking_id: booking.id,
        client_id: client.id,
        invoice_number: invoiceNumber(),

        subtotal_amount: totalAmount,
        subtotal_amount_sle: totalAmountSle,
        currency: currencySettings.base_currency,
        payment_currency: 'SLE',
        exchange_rate: exchangeRate,
        discount_type: 'none',
        discount_value: 0,
        discount_amount: 0,
        discount_amount_sle: 0,
        discount_reason: null,

        amount: totalAmount,
        tax_amount: 0,
        tax_amount_sle: 0,
        total_amount: totalAmount,
        total_amount_sle: totalAmountSle,
        payment_status: depositPaidAmount >= totalAmount ? 'paid' : depositPaidAmount > 0 ? 'partial' : 'pending',
        due_date: dueDate.toISOString().slice(0, 10),
        paid_date: depositPaidAmount >= totalAmount ? new Date().toISOString().slice(0, 10) : null,
        notes: `Deposit required: ${depositPercentage}% ($${depositRequiredAmount} / SLE ${depositRequiredAmountSle}). Booking ref: ${reference}`,
      })
      .select('*')
      .single()

    if (invoiceError) throw invoiceError

    const token = paymentLinkToken()
    const { data: paymentLink, error: paymentLinkError } = await supabase
      .from('customer_payment_links')
      .insert({
        booking_id: booking.id,
        invoice_id: invoice.id,
        client_id: client.id,
        token,
        status: 'active',
        metadata: {
          booking_reference: reference,
          created_from: bookingSource,
        },
      })
      .select('*')
      .single()

    if (paymentLinkError) throw paymentLinkError

    const paymentLinkUrl = `${appBaseUrl(request)}/pay/${token}`

    let payment = null
    if (depositPaidAmount > 0) {
      const { data: createdPayment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          invoice_id: invoice.id,
          amount: depositPaidAmountSle,
          applied_amount: depositPaidAmountSle,
          tip_amount: 0,
          currency: 'SLE',
          payment_method: body.deposit_payment_method || 'cash',
          transaction_id: body.transaction_id || null,
          notes: `Deposit payment for booking ${reference}`,
        })
        .select('*')
        .single()

      if (paymentError) throw paymentError
      payment = createdPayment
    }

    const initialStage = await ensureWorkflowStage(
      supabase,
      depositPaidAmount > 0 ? 'Deposit Paid' : 'Booking Received'
    )

    const { data: workflow, error: workflowError } = await supabase
      .from('job_workflows')
      .insert({
        booking_id: booking.id,
        current_stage_id: initialStage.id,
        due_date: bookingDate,
        priority: body.priority || 'medium',
        notes: bookingSource === 'walk_in' ? 'Created from front desk walk-in' : 'Created from online booking checkout',
      })
      .select('*')
      .single()

    if (workflowError) throw workflowError

    const customerEmail = String(client.email || email || '').trim().toLowerCase()
    const customerEmailNotification = await sendEmailSafely({
      to: customerEmail,
      subject: `JoeStudio booking received: ${reference}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <h2>Your JoeStudio booking has been received</h2>
          <p>Hello ${escapeHtml(client.full_name || fullName || 'there')},</p>
          <p>Thank you for booking with JoeStudio. We have received your booking request and created your payment link.</p>
          <div style="margin:20px 0;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px">
            <p><strong>Booking Reference:</strong> ${escapeHtml(reference)}</p>
            <p><strong>Package:</strong> ${escapeHtml(service.name || 'Photography session')}</p>
            <p><strong>Date:</strong> ${escapeHtml(formatBookingDate(bookingDate))}</p>
            <p><strong>Time:</strong> ${escapeHtml(startTime)} - ${escapeHtml(endTime)}</p>
            <p><strong>Location:</strong> ${escapeHtml(booking.location || 'Studio')}</p>
            <p><strong>Total:</strong> ${escapeHtml(formatSle(totalAmountSle))}</p>
            <p><strong>Required Deposit:</strong> ${escapeHtml(formatSle(depositRequiredAmountSle))}</p>
          </div>
          <p>Please use the secure link below to complete your payment:</p>
          <p>
            <a href="${paymentLinkUrl}" style="display:inline-block;padding:12px 18px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px">
              Pay Booking Deposit
            </a>
          </p>
          <p style="font-size:13px;color:#6b7280">If the button does not open, copy and paste this link into your browser:<br />${paymentLinkUrl}</p>
          <p>Regards,<br />JoeStudio Photography</p>
        </div>
      `,
    })

    const internalRecipients = await getInternalNotificationRecipients(supabase, [
      'super_admin',
      'studio_admin',
      'studio_manager',
      'receptionist',
    ])
    const internalEmailNotification = await sendEmailSafely({
      to: internalRecipients,
      subject: `New booking received: ${reference}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <h2>New Booking Received</h2>
          <p><strong>Booking Reference:</strong> ${escapeHtml(reference)}</p>
          <p><strong>Client:</strong> ${escapeHtml(client.full_name || fullName || 'Client')}</p>
          <p><strong>Email:</strong> ${escapeHtml(customerEmail || 'N/A')}</p>
          <p><strong>Phone:</strong> ${escapeHtml(client.phone || phone || 'N/A')}</p>
          <p><strong>Package:</strong> ${escapeHtml(service.name || 'Photography session')}</p>
          <p><strong>Date:</strong> ${escapeHtml(formatBookingDate(bookingDate))}</p>
          <p><strong>Time:</strong> ${escapeHtml(startTime)} - ${escapeHtml(endTime)}</p>
          <p><strong>Source:</strong> ${escapeHtml(bookingSource.replace('_', ' '))}</p>
          <p><strong>Total:</strong> ${escapeHtml(formatSle(totalAmountSle))}</p>
          <p><strong>Required Deposit:</strong> ${escapeHtml(formatSle(depositRequiredAmountSle))}</p>
          <p><strong>Payment Link:</strong> <a href="${paymentLinkUrl}">${paymentLinkUrl}</a></p>
        </div>
      `,
    })

    await supabase.from('audit_logs').insert({
      user_id: body.created_by || null,
      action: 'create',
      resource_type: 'booking',
      resource_id: booking.id,
      new_data: {
        booking,
        client,
        invoice,
        payment,
        workflow,
        paymentLink,
        email_notifications: {
          customer: customerEmailNotification,
          internal: internalEmailNotification,
        },
      },
      ip_address: request.headers.get('x-forwarded-for'),
      user_agent: request.headers.get('user-agent'),
    })

    return NextResponse.json({
      booking,
      client,
      invoice,
      payment,
      workflow,
      payment_link: { ...paymentLink, url: paymentLinkUrl },
      email_notifications: {
        customer: customerEmailNotification,
        internal: internalEmailNotification,
      },
    })
  } catch (error) {
    console.error('Booking API error:', error)
    const message = error instanceof Error ? error.message : 'Unable to create booking'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
