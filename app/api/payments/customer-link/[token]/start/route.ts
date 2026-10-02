import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createVultPaymentLink,
  mapPaymentMethodToVultType,
  type VultCurrency,
} from '@/lib/vult'

type Params = {
  params: Promise<{ token: string }>
}

const allowedMethods = new Set(['vult_app', 'mobile_money', 'card'])

function money(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? Number(number.toFixed(2)) : 0
}

function createOrderId() {
  const now = new Date()
  const date = now.toISOString().slice(2, 10).replace(/-/g, '')
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()

  return `JOESTUDIO-${date}-${random}`
}

function isExpired(value?: string | null) {
  if (!value) return false
  return new Date(value).getTime() < Date.now()
}

function getExchangeRate(invoice: any, booking: any) {
  const rate = Number(invoice?.exchange_rate || booking?.exchange_rate || 24)
  return Number.isFinite(rate) && rate > 0 ? rate : 24
}

function getInvoiceTotalSle(invoice: any, exchangeRate: number) {
  if (invoice?.total_amount_sle !== null && invoice?.total_amount_sle !== undefined) {
    return money(invoice.total_amount_sle)
  }

  const totalUsd = money(invoice?.total_amount || 0)
  return money(totalUsd * exchangeRate)
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { token } = await params
    const body = await request.json()
    const supabase = createAdminClient()

    const enteredAmount = money(body.amount)
    const paymentMethod = String(body.payment_method || '').trim()

    if (!enteredAmount || enteredAmount <= 0) {
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
    if (isExpired(link.expires_at)) {
      return NextResponse.json({ error: 'This payment link has expired. Please contact the studio.' }, { status: 403 })
    }

    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', link.invoice_id)

    if (paymentsError) throw paymentsError

    const paidAmountSle = money(
      (payments || [])
        .filter((payment) => payment.payment_status !== 'failed')
        .reduce((sum, payment) => {
          const applied = payment.applied_amount === null || payment.applied_amount === undefined
            ? payment.amount
            : payment.applied_amount
          return sum + Number(applied || 0)
        }, 0),
    )

    const exchangeRate = getExchangeRate(link.invoice, link.booking)
    const totalAmountSle = getInvoiceTotalSle(link.invoice, exchangeRate)
    const balanceAmountSle = money(Math.max(totalAmountSle - paidAmountSle, 0))

    const isCardPayment = paymentMethod === 'card'
    const processorCurrency: VultCurrency = isCardPayment ? 'USD' : 'SLE'
    const processorAmount = enteredAmount

    const rawAmountSle = money(
      isCardPayment ? processorAmount * exchangeRate : processorAmount,
    )

    // USD is charged to two decimal places. Snap a near-full card payment to
    // the exact SLE balance when the only difference is USD-cent rounding.
    const oneUsdCentInSle = exchangeRate / 100
    const amountSle =
      isCardPayment && Math.abs(rawAmountSle - balanceAmountSle) <= oneUsdCentInSle
        ? balanceAmountSle
        : rawAmountSle

    const appliedAmountSle = money(Math.min(amountSle, balanceAmountSle))
    const tipAmountSle = money(Math.max(amountSle - balanceAmountSle, 0))
    const orderId = createOrderId()
    const vultType = mapPaymentMethodToVultType(paymentMethod)

    const vult = await createVultPaymentLink({
      orderId,
      amount: processorAmount,
      type: vultType,
      currency: processorCurrency,
    })

    const { data: order, error: orderError } = await supabase
      .from('payment_orders')
      .insert({
        payment_link_id: link.id,
        booking_id: link.booking_id,
        invoice_id: link.invoice_id,
        client_id: link.client_id,
        order_id: orderId,

        // Existing JoeStudio accounting stays in SLE so current invoice,
        // finance, payment-history and webhook logic remain compatible.
        amount: amountSle,
        applied_amount: appliedAmountSle,
        tip_amount: tipAmountSle,
        currency: 'SLE',

        payment_method: paymentMethod,
        processor: 'vult',
        processor_request_id: vult.requestId || null,
        payment_url: vult.link,
        status: 'pending',
        metadata: {
          source: 'customer_payment_link',
          vult_type: vultType,
          vult_code: vult.code,
          vult_qr_code: vult.qrCode,
          vult_response: vult.result,
          vult_request_body: vult.requestBody,

          processor_currency: processorCurrency,
          processor_amount: processorAmount,
          accounting_currency: 'SLE',
          accounting_amount_sle: amountSle,
          exchange_rate: exchangeRate,

          balance_before_payment_sle: balanceAmountSle,
          invoice_total_sle: totalAmountSle,
          paid_before_payment_sle: paidAmountSle,
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
      payment_method: paymentMethod,
      vult_type: vultType,
      checkout_url: vult.link,
      payment_url: vult.link,
      payment_code: vult.code,
      qr_code: vult.qrCode,

      // Actual processor amount/currency.
      amount: processorAmount,
      currency: processorCurrency,

      // JoeStudio accounting remains SLE.
      amount_sle: amountSle,
      applied_amount: appliedAmountSle,
      tip_amount: tipAmountSle,
      exchange_rate: exchangeRate,

      message: paymentMethod === 'mobile_money'
        ? 'Mobile money payment code generated.'
        : paymentMethod === 'vult_app'
          ? 'Vult App payment link generated.'
          : 'Card checkout link generated in USD.',
    })
  } catch (error) {
    console.error('Start Vult payment error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to start payment.' },
      { status: 500 },
    )
  }
}
