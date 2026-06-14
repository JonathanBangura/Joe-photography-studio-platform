import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Params = {
  params: Promise<{ token: string }>
}

function money(value: unknown) {
  return Number(Number(value || 0).toFixed(2))
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { token } = await params
    const supabase = createAdminClient()

    const { data: link, error: linkError } = await supabase
      .from('customer_payment_links')
      .select('*, invoice:invoices(*), booking:bookings(*, service:services(*)), client:clients(*)')
      .eq('token', token)
      .maybeSingle()

    if (linkError) throw linkError

    if (!link) {
      return NextResponse.json({ error: 'Payment link not found.' }, { status: 404 })
    }

    if (link.status !== 'active') {
      return NextResponse.json({ error: 'This payment link is no longer active.' }, { status: 403 })
    }

    if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'This payment link has expired.' }, { status: 403 })
    }

    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', link.invoice_id)
      .order('payment_date', { ascending: false })

    if (paymentsError) throw paymentsError

    const completedPayments = (payments || []).filter((payment) => payment.payment_status !== 'failed')
    const paidAmount = money(
      completedPayments.reduce((sum, payment) => {
        const applied = payment.applied_amount === null || payment.applied_amount === undefined
          ? payment.amount
          : payment.applied_amount
        return sum + Number(applied || 0)
      }, 0),
    )
    const tipAmount = money(completedPayments.reduce((sum, payment) => sum + Number(payment.tip_amount || 0), 0))
    const totalAmount = money(link.invoice?.total_amount || 0)
    const balanceAmount = money(Math.max(totalAmount - paidAmount, 0))

    return NextResponse.json({
      success: true,
      data: {
        link,
        invoice: link.invoice,
        booking: link.booking,
        client: link.client,
        payments: payments || [],
        totals: {
          total_amount: totalAmount,
          paid_amount: paidAmount,
          balance_amount: balanceAmount,
          tip_amount: tipAmount,
        },
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load payment link.' },
      { status: 500 },
    )
  }
}
