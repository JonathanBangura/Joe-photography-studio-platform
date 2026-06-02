import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createAdminClient()

    const serviceId = String(body.service_id || '')
    const bookingDate = String(body.booking_date || '')
    const startTime = String(body.start_time || '')
    const fullName = String(body.full_name || body.name || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const phone = String(body.phone || '').trim()

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

    let client = null
    if (email) {
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
          profile_id: body.profile_id || null,
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
    const depositRequiredAmount = Number(((totalAmount * depositPercentage) / 100).toFixed(2))
    const depositPaidAmount = Number(body.deposit_paid_amount || 0)
    const depositStatus = depositPaidAmount >= depositRequiredAmount ? 'paid' : depositPaidAmount > 0 ? 'partial' : 'required'
    const bookingSource = body.booking_source === 'walk_in' ? 'walk_in' : 'online'
    const endTime = body.end_time || addMinutes(startTime, Number(service.duration_minutes || 60))
    const reference = bookingReference()

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        client_id: client.id,
        service_id: serviceId,
        staff_id: body.staff_id || null,
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        location: body.location || 'Studio',
        status: depositPaidAmount > 0 || bookingSource === 'walk_in' ? 'confirmed' : 'pending',
        total_amount: totalAmount,
        booking_source: bookingSource,
        booking_reference: reference,
        deposit_percentage: depositPercentage,
        deposit_required_amount: depositRequiredAmount,
        deposit_paid_amount: depositPaidAmount,
        deposit_payment_method: body.deposit_payment_method || null,
        deposit_status: depositStatus,
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
        amount: totalAmount,
        tax_amount: 0,
        total_amount: totalAmount,
        payment_status: depositPaidAmount >= totalAmount ? 'paid' : depositPaidAmount > 0 ? 'partial' : 'pending',
        due_date: dueDate.toISOString().slice(0, 10),
        paid_date: depositPaidAmount >= totalAmount ? new Date().toISOString().slice(0, 10) : null,
        notes: `Deposit required: ${depositPercentage}% (${depositRequiredAmount}). Booking ref: ${reference}`,
      })
      .select('*')
      .single()

    if (invoiceError) throw invoiceError

    let payment = null
    if (depositPaidAmount > 0) {
      const { data: createdPayment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          invoice_id: invoice.id,
          amount: depositPaidAmount,
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

    await supabase.from('audit_logs').insert({
      user_id: body.created_by || null,
      action: 'create',
      resource_type: 'booking',
      resource_id: booking.id,
      new_data: { booking, client, invoice, payment, workflow },
      ip_address: request.headers.get('x-forwarded-for'),
      user_agent: request.headers.get('user-agent'),
    })

    return NextResponse.json({ booking, client, invoice, payment, workflow })
  } catch (error) {
    console.error('Booking API error:', error)
    const message = error instanceof Error ? error.message : 'Unable to create booking'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
