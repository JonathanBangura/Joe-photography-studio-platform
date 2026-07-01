import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmailSafely } from '@/lib/mail'
import { getInternalNotificationRecipients } from '@/lib/notification-recipients'
import { requireAdminContext } from '@/lib/admin-auth'

type Params = {
  params: Promise<{ id: string }>
}

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

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const context = await requireAdminContext()
    if ("error" in context) return context.error

    const { id } = await params
    const body = await request.json()
    const supabase = context.supabase

    const { data: oldData } = await supabase
      .from('customer_payment_links')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!oldData) {
      return NextResponse.json({ error: 'Payment link not found' }, { status: 404 })
    }

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if ('expires_at' in body) {
      payload.expires_at = body.expires_at ? new Date(body.expires_at).toISOString() : null
    }

    if ('status' in body) {
      const status = String(body.status || '').toLowerCase()
      if (!['active', 'disabled', 'expired'].includes(status)) {
        return NextResponse.json({ error: 'Invalid payment link status' }, { status: 400 })
      }
      payload.status = status
    }

    if (body.regenerate) {
      payload.token = generateToken()
      payload.status = 'active'
    }

    const { data, error } = await supabase
      .from('customer_payment_links')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error

    const paymentUrl = buildPaymentUrl(request, data.token)
    const shouldSendEmail = body.send_email === true || body.regenerate === true
    let emailNotification: any = {
      sent: false,
      skipped: true,
      reason: 'Payment link email was not requested for this update.',
    }
    let internalEmailNotification: any = {
      sent: false,
      skipped: true,
      reason: 'Internal payment link email was not needed for this update.',
    }

    if (shouldSendEmail) {
      const { data: invoice } = await supabase
        .from('invoices')
        .select('*, client:clients(*), booking:bookings(*)')
        .eq('id', data.invoice_id)
        .maybeSingle()

      const customerEmail = String(invoice?.client?.email || '').trim().toLowerCase()
      const customerName = String(invoice?.client?.full_name || 'there').trim()
      const bookingReference = String(invoice?.booking?.booking_reference || invoice?.invoice_number || '').trim()

      emailNotification = await sendEmailSafely({
        to: customerEmail,
        subject: `JoeStudio payment link${bookingReference ? `: ${bookingReference}` : ''}`,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
            <h2>Your JoeStudio payment link</h2>
            <p>Hello ${escapeHtml(customerName || 'there')},</p>
            <p>Your payment link has been updated. Please use the secure link below to complete your payment.</p>
            <div style="margin:20px 0;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px">
              <p><strong>Invoice:</strong> ${escapeHtml(invoice?.invoice_number || 'Invoice')}</p>
              <p><strong>Booking Reference:</strong> ${escapeHtml(bookingReference || 'N/A')}</p>
              <p><strong>Amount Due:</strong> ${escapeHtml(formatSle(getInvoiceTotalSle(invoice)))}</p>
            </div>
            <p>
              <a href="${paymentUrl}" style="display:inline-block;padding:12px 18px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px">
                Open Payment Link
              </a>
            </p>
            <p style="font-size:13px;color:#6b7280">If the button does not open, copy and paste this link into your browser:<br />${paymentUrl}</p>
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
      internalEmailNotification = await sendEmailSafely({
        to: internalRecipients,
        subject: `Payment link updated${bookingReference ? `: ${bookingReference}` : ''}`,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
            <h2>Payment Link Updated</h2>
            <p><strong>Client:</strong> ${escapeHtml(customerName || 'Client')}</p>
            <p><strong>Email:</strong> ${escapeHtml(customerEmail || 'N/A')}</p>
            <p><strong>Invoice:</strong> ${escapeHtml(invoice?.invoice_number || 'Invoice')}</p>
            <p><strong>Booking Reference:</strong> ${escapeHtml(bookingReference || 'N/A')}</p>
            <p><strong>Amount Due:</strong> ${escapeHtml(formatSle(getInvoiceTotalSle(invoice)))}</p>
            <p><strong>Customer Email Sent:</strong> ${emailNotification.sent ? 'Yes' : 'No'}</p>
            <p><strong>Payment Link:</strong> <a href="${paymentUrl}">${paymentUrl}</a></p>
          </div>
        `,
      })
    }

    await supabase.from('audit_logs').insert({
      user_id: context.user.id,
      action: body.regenerate ? 'regenerate_payment_link' : 'update_payment_link',
      resource_type: 'payment_link',
      resource_id: id,
      old_data: oldData,
      new_data: {
        payment_link: data,
        payment_url: paymentUrl,
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
      data: {
        ...data,
        payment_url: paymentUrl,
      },
      email_notification: emailNotification,
      internal_email_notification: internalEmailNotification,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update payment link' },
      { status: 500 },
    )
  }
}
