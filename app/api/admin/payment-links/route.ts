import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function buildPaymentUrl(request: NextRequest, token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  return `${appUrl.replace(/\/$/, '')}/pay/${token}`
}

function generateToken() {
  return randomBytes(18).toString('base64url').toUpperCase()
}

async function findInvoiceForBooking(supabase: ReturnType<typeof createAdminClient>, bookingId: string) {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, client:clients(*), booking:bookings(*)')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

async function findInvoice(supabase: ReturnType<typeof createAdminClient>, invoiceId?: string | null, bookingId?: string | null) {
  if (invoiceId) {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, client:clients(*), booking:bookings(*)')
      .eq('id', invoiceId)
      .maybeSingle()

    if (error) throw error
    return data
  }

  if (bookingId) return findInvoiceForBooking(supabase, bookingId)
  return null
}

async function getPaymentLinkWithUrl(request: NextRequest, link: any) {
  if (!link) return null
  return {
    ...link,
    payment_url: buildPaymentUrl(request, link.token),
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const bookingId = request.nextUrl.searchParams.get('booking_id')
    const invoiceId = request.nextUrl.searchParams.get('invoice_id')

    if (!bookingId && !invoiceId) {
      return NextResponse.json({ error: 'booking_id or invoice_id is required' }, { status: 400 })
    }

    let query = supabase
      .from('customer_payment_links')
      .select('*, invoice:invoices(*), booking:bookings(*), client:clients(*)')
      .order('created_at', { ascending: false })
      .limit(1)

    if (invoiceId) query = query.eq('invoice_id', invoiceId)
    if (!invoiceId && bookingId) query = query.eq('booking_id', bookingId)

    const { data, error } = await query.maybeSingle()
    if (error) throw error

    return NextResponse.json({ success: true, data: await getPaymentLinkWithUrl(request, data) })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load payment link' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createAdminClient()

    const bookingId = body.booking_id ? String(body.booking_id) : null
    const invoiceId = body.invoice_id ? String(body.invoice_id) : null
    const expiresAt = body.expires_at ? new Date(body.expires_at).toISOString() : null
    const regenerate = Boolean(body.regenerate)

    const invoice = await findInvoice(supabase, invoiceId, bookingId)

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found for this booking/payment link request.' }, { status: 404 })
    }

    const resolvedBookingId = invoice.booking_id || bookingId
    const resolvedInvoiceId = invoice.id
    const resolvedClientId = invoice.client_id || invoice.booking?.client_id || null

    const { data: existing, error: existingError } = await supabase
      .from('customer_payment_links')
      .select('*')
      .eq('invoice_id', resolvedInvoiceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingError) throw existingError

    let data = existing

    if (existing && !regenerate) {
      const { data: updated, error: updateError } = await supabase
        .from('customer_payment_links')
        .update({
          status: 'active',
          expires_at: expiresAt ?? existing.expires_at,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('*')
        .single()

      if (updateError) throw updateError
      data = updated
    } else if (existing && regenerate) {
      const { data: updated, error: updateError } = await supabase
        .from('customer_payment_links')
        .update({
          token: generateToken(),
          status: 'active',
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('*')
        .single()

      if (updateError) throw updateError
      data = updated
    } else {
      const { data: created, error: createError } = await supabase
        .from('customer_payment_links')
        .insert({
          booking_id: resolvedBookingId,
          invoice_id: resolvedInvoiceId,
          client_id: resolvedClientId,
          token: generateToken(),
          status: 'active',
          expires_at: expiresAt,
        })
        .select('*')
        .single()

      if (createError) throw createError
      data = created
    }

    await supabase.from('audit_logs').insert({
      action: existing && regenerate ? 'regenerate_payment_link' : existing ? 'update_payment_link' : 'create_payment_link',
      resource_type: 'payment_link',
      resource_id: data.id,
      new_data: data,
      ip_address: request.headers.get('x-forwarded-for'),
      user_agent: request.headers.get('user-agent'),
    })

    return NextResponse.json({ success: true, data: await getPaymentLinkWithUrl(request, data) })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create payment link' },
      { status: 500 },
    )
  }
}
