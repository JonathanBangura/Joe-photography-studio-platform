import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmailSafely } from '@/lib/mail'
import { getInternalNotificationRecipients } from '@/lib/notification-recipients'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminContext } from '@/lib/admin-auth'

function buildPaymentUrl(request: NextRequest, token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  return `${appUrl.replace(/\/$/, '')}/pay/${token}`
}

function generateToken() {
  return randomBytes(18).toString('base64url').toUpperCase()
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

function getInvoiceTotalSle(invoice: any) {
  if (invoice?.total_amount_sle !== null && invoice?.total_amount_sle !== undefined) {
    return Number(invoice.total_amount_sle || 0)
  }

  return Number(invoice?.total_amount || 0) * Number(invoice?.exchange_rate || invoice?.booking?.exchange_rate || 1)
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
    const context = await requireAdminContext()
    if ("error" in context) return context.error
    const supabase = context.supabase
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
    const context = await requireAdminContext()
    if ("error" in context) return context.error

    const body = await request.json()
    const supabase = context.supabase

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

    const paymentLink = await getPaymentLinkWithUrl(request, data)
    if (!paymentLink) {
      throw new Error('Payment link could not be prepared for email delivery.')
    }

    const customerEmail = String(invoice.client?.email || '').trim().toLowerCase()
    const customerName = String(invoice.client?.full_name || 'there').trim()
    const bookingReference = String(invoice.booking?.booking_reference || invoice.invoice_number || '').trim()
    const shouldSendEmail = body.send_email !== false
    const emailNotification = shouldSendEmail
      ? await sendEmailSafely({
          to: customerEmail,
          subject: `JoeStudio payment link${bookingReference ? `: ${bookingReference}` : ''}`,
          html: `
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
              <h2>Your JoeStudio payment link</h2>
              <p>Hello ${escapeHtml(customerName || 'there')},</p>
              <p>Please use the secure link below to complete your payment.</p>
              <div style="margin:20px 0;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px">
                <p><strong>Invoice:</strong> ${escapeHtml(invoice.invoice_number || 'Invoice')}</p>
                <p><strong>Booking Reference:</strong> ${escapeHtml(bookingReference || 'N/A')}</p>
                <p><strong>Amount Due:</strong> ${escapeHtml(formatSle(getInvoiceTotalSle(invoice)))}</p>
              </div>
              <p>
                <a href="${paymentLink.payment_url}" style="display:inline-block;padding:12px 18px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px">
                  Open Payment Link
                </a>
              </p>
              <p style="font-size:13px;color:#6b7280">If the button does not open, copy and paste this link into your browser:<br />${paymentLink.payment_url}</p>
              <p>Regards,<br />JoeStudio Photography</p>
            </div>
          `,
        })
      : {
          sent: false,
          skipped: true,
          reason: 'Payment link email was disabled for this request.',
        }

    const internalRecipients = await getInternalNotificationRecipients(supabase, [
      'super_admin',
      'studio_admin',
      'studio_manager',
      'receptionist',
    ])
    const internalEmailNotification = await sendEmailSafely({
      to: internalRecipients,
      subject: `Payment link ready${bookingReference ? `: ${bookingReference}` : ''}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <h2>Payment Link Ready</h2>
          <p><strong>Client:</strong> ${escapeHtml(customerName || 'Client')}</p>
          <p><strong>Email:</strong> ${escapeHtml(customerEmail || 'N/A')}</p>
          <p><strong>Invoice:</strong> ${escapeHtml(invoice.invoice_number || 'Invoice')}</p>
          <p><strong>Booking Reference:</strong> ${escapeHtml(bookingReference || 'N/A')}</p>
          <p><strong>Amount Due:</strong> ${escapeHtml(formatSle(getInvoiceTotalSle(invoice)))}</p>
          <p><strong>Customer Email Sent:</strong> ${emailNotification.sent ? 'Yes' : 'No'}</p>
          <p><strong>Payment Link:</strong> <a href="${paymentLink.payment_url}">${paymentLink.payment_url}</a></p>
        </div>
      `,
    })

    await supabase.from('audit_logs').insert({
      user_id: context.user.id,
      action: existing && regenerate ? 'regenerate_payment_link' : existing ? 'update_payment_link' : 'create_payment_link',
      resource_type: 'payment_link',
      resource_id: data.id,
      new_data: {
        payment_link: data,
        payment_url: paymentLink.payment_url,
        email_notifications: {
          customer: emailNotification,
          internal: internalEmailNotification,
        },
      },
      ip_address: request.headers.get('x-forwarded-for'),
      user_agent: request.headers.get('user-agent'),
    })

    return NextResponse.json({
      success: true,
      data: paymentLink,
      email_notification: emailNotification,
      internal_email_notification: internalEmailNotification,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create payment link' },
      { status: 500 },
    )
  }
}
