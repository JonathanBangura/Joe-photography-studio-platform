import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidVultWebhookAuth } from '@/lib/vult'

function money(value: unknown) {
  return Number(Number(value || 0).toFixed(2))
}

function getInvoiceTotalSle(invoice: any) {
  if (invoice?.total_amount_sle !== null && invoice?.total_amount_sle !== undefined) {
    return money(invoice.total_amount_sle)
  }

  const totalUsd = money(invoice?.total_amount || 0)
  const exchangeRate = money(invoice?.exchange_rate || 1)
  return money(totalUsd * exchangeRate)
}

async function updateWorkflowIfPossible(supabase: ReturnType<typeof createAdminClient>, bookingId: string | null, stageName: string) {
  if (!bookingId) return

  const { data: stage } = await supabase
    .from('workflow_stages')
    .select('*')
    .ilike('name', stageName)
    .maybeSingle()

  if (!stage) return

  const { data: workflow } = await supabase
    .from('job_workflows')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle()

  if (!workflow) return

  await supabase
    .from('job_workflows')
    .update({ current_stage_id: stage.id, updated_at: new Date().toISOString() })
    .eq('id', workflow.id)

  await supabase.from('job_workflow_history').insert({
    job_workflow_id: workflow.id,
    from_stage_id: workflow.current_stage_id,
    to_stage_id: stage.id,
    notes: `Moved by Vult webhook: ${stageName}`,
  })
}

export async function POST(request: Request) {
  try {
    if (!isValidVultWebhookAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json()
    const orderId = String(payload.orderId || '').trim()
    const vultRequestId = String(payload.vultRequestId || '').trim()
    const status = String(payload.status || '').trim().toLowerCase()

    if (!orderId || !status) {
      return NextResponse.json({ error: 'orderId and status are required.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: order, error: orderError } = await supabase
      .from('payment_orders')
      .select('*, invoice:invoices(*), booking:bookings(*), client:clients(*)')
      .eq('order_id', orderId)
      .maybeSingle()

    if (orderError) throw orderError
    if (!order) return NextResponse.json({ error: 'Payment order not found.' }, { status: 404 })

    if (order.status === 'completed') {
      return NextResponse.json({ success: true, message: 'Order already completed.' })
    }

    if (status === 'failed') {
      const { data: updatedOrder, error: updateError } = await supabase
        .from('payment_orders')
        .update({
          status: 'failed',
          processor_request_id: vultRequestId || order.processor_request_id,
          metadata: {
            ...(order.metadata || {}),
            webhook_payload: payload,
            failed_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)
        .select('*')
        .single()

      if (updateError) throw updateError

      await supabase.from('audit_logs').insert({
        action: 'vult_payment_failed',
        resource_type: 'payment_order',
        resource_id: order.id,
        old_data: order,
        new_data: updatedOrder,
        ip_address: request.headers.get('x-forwarded-for'),
        user_agent: request.headers.get('user-agent'),
      })

      return NextResponse.json({ success: true })
    }

    if (status !== 'completed') {
      return NextResponse.json({ success: true, message: 'Webhook status ignored.' })
    }

    const invoiceTotalSle = getInvoiceTotalSle(order.invoice)

    const { data: existingPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', order.invoice_id)

    if (paymentsError) throw paymentsError

    const paidBefore = money(
      (existingPayments || [])
        .filter((payment) => payment.payment_status !== 'failed')
        .reduce((sum, payment) => {
          const applied = payment.applied_amount === null || payment.applied_amount === undefined
            ? payment.amount
            : payment.applied_amount
          return sum + Number(applied || 0)
        }, 0),
    )

    const balanceBefore = money(Math.max(invoiceTotalSle - paidBefore, 0))
    const appliedAmount = money(Math.min(Number(order.amount || 0), balanceBefore))
    const tipAmount = money(Math.max(Number(order.amount || 0) - balanceBefore, 0))

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        invoice_id: order.invoice_id,
        payment_order_id: order.id,
        amount: order.amount,
        applied_amount: appliedAmount,
        tip_amount: tipAmount,
        currency: 'SLE',
        payment_method: order.payment_method || 'vult',
        payment_channel:
          order.payment_method === 'card'
            ? 'Card'
            : order.payment_method === 'mobile_money'
              ? 'Mobile Money'
              : 'Vult App',
        payment_processor: 'Vult',
        transaction_id: vultRequestId || order.order_id,
        customer_reference: order.order_id,
        payment_status: 'completed',
        notes: tipAmount > 0
          ? `Vult payment completed. SLE ${tipAmount.toLocaleString()} recorded as tip.`
          : 'Vult payment completed.',
        metadata: {
          webhook_payload: payload,
          order_id: order.order_id,
          balance_before_payment: balanceBefore,
        },
      })
      .select('*')
      .single()

    if (paymentError) throw paymentError

    const paidAfter = money(paidBefore + appliedAmount)
    const newInvoiceStatus = paidAfter >= invoiceTotalSle ? 'paid' : paidAfter > 0 ? 'partial' : 'pending'

    const { data: updatedInvoice, error: invoiceError } = await supabase
      .from('invoices')
      .update({
        payment_status: newInvoiceStatus,
        paid_date: newInvoiceStatus === 'paid' ? new Date().toISOString().slice(0, 10) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.invoice_id)
      .select('*')
      .single()

    if (invoiceError) throw invoiceError

    const booking = order.booking
    const depositRequiredSle = money(
      booking?.deposit_required_amount_sle ??
      (Number(booking?.deposit_required_amount || 0) * Number(booking?.exchange_rate || order.invoice?.exchange_rate || 1)),
    )

    const depositPaidSle = money(Math.min(paidAfter, depositRequiredSle || paidAfter))
    const bookingExchangeRate = money(
      booking?.exchange_rate || order.invoice?.exchange_rate || 24,
    ) || 24
    const depositPaidUsd = money(depositPaidSle / bookingExchangeRate)
    const depositStatus = depositRequiredSle <= 0
      ? 'paid'
      : depositPaidSle >= depositRequiredSle
        ? 'paid'
        : depositPaidSle > 0
          ? 'partial'
          : 'required'

    let updatedBooking = null
    if (order.booking_id) {
      const { data, error } = await supabase
        .from('bookings')
        .update({
          status: depositStatus === 'paid' ? 'confirmed' : booking?.status || 'pending',
          deposit_paid_amount: depositPaidUsd,
          deposit_paid_amount_sle: depositPaidSle,
          deposit_status: depositStatus,
          deposit_payment_method: order.payment_method || 'vult',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.booking_id)
        .select('*')
        .single()

      if (error) throw error
      updatedBooking = data
    }

    const { data: updatedOrder, error: orderUpdateError } = await supabase
      .from('payment_orders')
      .update({
        status: 'completed',
        processor_request_id: vultRequestId || order.processor_request_id,
        applied_amount: appliedAmount,
        tip_amount: tipAmount,
        metadata: {
          ...(order.metadata || {}),
          webhook_payload: payload,
          completed_at: new Date().toISOString(),
          payment_id: payment.id,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .select('*')
      .single()

    if (orderUpdateError) throw orderUpdateError

    await updateWorkflowIfPossible(supabase, order.booking_id, depositStatus === 'paid' ? 'Deposit Paid' : 'Booking Received')

    await supabase.from('audit_logs').insert({
      action: 'vult_payment_completed',
      resource_type: 'payment_order',
      resource_id: order.id,
      old_data: order,
      new_data: {
        payment,
        order: updatedOrder,
        invoice: updatedInvoice,
        booking: updatedBooking,
      },
      ip_address: request.headers.get('x-forwarded-for'),
      user_agent: request.headers.get('user-agent'),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Vult webhook error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to process webhook.' },
      { status: 500 },
    )
  }
}
