import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createVultPaymentLink, mapPaymentMethodToVultType } from '@/lib/vult'

type Params = {
  params: Promise<{ token: string }>
}

const allowedMethods = new Set(['vult_app', 'mobile_money', 'card'])

function money(value: unknown) {
  return Number(Number(value || 0).toFixed(2))
}

function createOrderId() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
  const random = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `JSP-${stamp}-${random}`
}

function isExpired(value?: string | null) {
  if (!value) return false
  return new Date(value).getTime() < Date.now()
}

function getInvoiceTotalSle(invoice: any) {
  if (invoice?.total_amount_sle !== null && invoice?.total_amount_sle !== undefined) {
    return money(invoice.total_amount_sle)
  }

  const totalUsd = money(invoice?.total_amount || 0)
  const exchangeRate = money(invoice?.exchange_rate || 1)
  return money(totalUsd * exchangeRate)
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { token } = await params
    const body = await request.json()
    const supabase = createAdminClient()

    const amount = money(body.amount)
    const paymentMethod = String(body.payment_method || '').trim()

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Enter a valid payment amount.' }, { status: 400 })
    }

    if (!allowedMethods.has(paymentMethod)) {
      return NextResponse.json({ error: 'Please select Vult App, Mobile Money, or Card.' }, { status: 400 })
    }

    const { data: link, error: linkError } = await supabase
      .from('customer_payment_links')
      .select('*, invoice:invoices(*), booking:bookings(*), client:clients(*)')
      .eq('token', token)
      .maybeSingle()

    if (linkError) throw linkError
    if (!link) return NextResponse.json({ error: 'Payment link not found.' }, { status: 404 })
    if (link.status !== 'active') return NextResponse.json({ error: 'This payment link is not active.' }, { status: 403 })
    if (isExpired(link.expires_at)) return NextResponse.json({ error: 'This payment link has expired. Please contact the studio.' }, { status: 403 })

    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', link.invoice_id)

    if (paymentsError) throw paymentsError

    const paidAmount = money(
      (payments || [])
        .filter((payment) => payment.payment_status !== 'failed')
        .reduce((sum, payment) => {
          const applied = payment.applied_amount === null || payment.applied_amount === undefined
            ? payment.amount
            : payment.applied_amount
          return sum + Number(applied || 0)
        }, 0),
    )

    const totalAmount = getInvoiceTotalSle(link.invoice)
    const balanceAmount = money(Math.max(totalAmount - paidAmount, 0))
    const appliedAmount = money(Math.min(amount, balanceAmount))
    const tipAmount = money(Math.max(amount - balanceAmount, 0))
    const orderId = createOrderId()
    const vultType = mapPaymentMethodToVultType(paymentMethod)

    const vult = await createVultPaymentLink({
      orderId,
      amount,
      type: vultType,
    })

    const { data: order, error: orderError } = await supabase
      .from('payment_orders')
      .insert({
        payment_link_id: link.id,
        booking_id: link.booking_id,
        invoice_id: link.invoice_id,
        client_id: link.client_id,
        order_id: orderId,
        amount,
        applied_amount: appliedAmount,
        tip_amount: tipAmount,
        currency: 'SLE',
        payment_method: paymentMethod,
        processor: 'vult',
        processor_request_id: null,
        payment_url: vult.link,
        status: 'pending',
        metadata: {
          source: 'customer_payment_link',
          vult_type: vultType,
          vult_code: vult.code,
          vult_response: vult.result,
          balance_before_payment: balanceAmount,
          invoice_total_sle: totalAmount,
          paid_before_payment: paidAmount,
        },
      })
      .select('*')
      .single()

    if (orderError) throw orderError

    await supabase.from('audit_logs').insert({
      action: 'create_vult_payment_order',
      resource_type: 'payment_order',
      resource_id: order.id,
      new_data: order,
      ip_address: request.headers.get('x-forwarded-for'),
      user_agent: request.headers.get('user-agent'),
    })

    return NextResponse.json({
      success: true,
      order,
      checkout_url: vult.link,
      payment_code: vult.code,
      message: vult.code
        ? 'Mobile money payment code generated.'
        : 'Vult payment link generated.',
    })
  } catch (error) {
    console.error('Start Vult payment error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to start payment.' },
      { status: 500 },
    )
  }
}
