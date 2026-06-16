import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  getInvoicePaymentSummary,
  getInvoiceTotalSle,
  moneyNumber,
} from "@/lib/payment-summary"

function deriveDepositStatus(requiredAmount: number, paidAmount: number) {
  if (requiredAmount <= 0) return "waived"
  if (paidAmount >= requiredAmount) return "paid"
  if (paidAmount > 0) return "partial"
  return "required"
}

async function moveWorkflowToDepositPaid(
  supabase: ReturnType<typeof createAdminClient>,
  bookingId: string,
) {
  const { data: stage } = await supabase
    .from("workflow_stages")
    .select("id")
    .ilike("name", "Deposit Paid")
    .maybeSingle()

  if (!stage) return

  const { data: workflow } = await supabase
    .from("job_workflows")
    .select("*")
    .eq("booking_id", bookingId)
    .maybeSingle()

  if (!workflow || workflow.current_stage_id === stage.id) return

  await supabase.from("job_workflow_history").insert({
    job_workflow_id: workflow.id,
    from_stage_id: workflow.current_stage_id,
    to_stage_id: stage.id,
    notes: "Deposit requirement satisfied by recorded payment",
  })

  await supabase
    .from("job_workflows")
    .update({
      current_stage_id: stage.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", workflow.id)
}

export async function POST(request: Request) {
  try {
    const authSupabase = await createClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const invoiceId = String(body.invoice_id || "")
    const amount = moneyNumber(body.amount)

    if (!invoiceId || amount <= 0) {
      return NextResponse.json(
        { error: "Invoice ID and a valid SLE amount are required" },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*, booking:bookings(*)")
      .eq("id", invoiceId)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    const transactionId = body.transaction_id
      ? String(body.transaction_id).trim()
      : null

    if (transactionId) {
      const { data: duplicate } = await supabase
        .from("payments")
        .select("id")
        .eq("invoice_id", invoiceId)
        .eq("transaction_id", transactionId)
        .maybeSingle()

      if (duplicate) {
        return NextResponse.json(
          { error: "This transaction reference has already been recorded" },
          { status: 409 },
        )
      }
    }

    const { data: existingPayments, error: existingPaymentsError } =
      await supabase
        .from("payments")
        .select("*")
        .eq("invoice_id", invoiceId)

    if (existingPaymentsError) throw existingPaymentsError

    const before = getInvoicePaymentSummary(invoice, existingPayments || [])
    const appliedAmount = moneyNumber(Math.min(amount, before.balanceSle))
    const tipAmount = moneyNumber(Math.max(amount - before.balanceSle, 0))
    const paymentMethod = String(body.payment_method || "Cash")
    const paymentChannel = String(body.payment_channel || paymentMethod)
    const paymentProcessor = String(
      body.payment_processor ||
        (["Cash", "Bank Transfer"].includes(paymentMethod)
          ? "Manual"
          : "Vult"),
    )

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        invoice_id: invoiceId,
        amount,
        applied_amount: appliedAmount,
        tip_amount: tipAmount,
        currency: "SLE",
        payment_method: paymentMethod,
        payment_channel: paymentChannel,
        payment_processor: paymentProcessor,
        transaction_id: transactionId,
        customer_reference:
          body.customer_reference || invoice.invoice_number || null,
        payment_status: "completed",
        recorded_by: user.id,
        notes: body.notes || null,
        metadata: {
          source: "admin_invoice_payment",
          currency: "SLE",
          invoice_number: invoice.invoice_number,
          balance_before_payment: before.balanceSle,
          recorded_by_email: user.email,
        },
      })
      .select("*")
      .single()

    if (paymentError) throw paymentError

    const after = getInvoicePaymentSummary(invoice, [
      ...(existingPayments || []),
      payment,
    ])
    const invoiceStatus = after.status === "paid" ? "paid" : after.paidSle > 0 ? "partial" : "pending"

    const { error: updateInvoiceError } = await supabase
      .from("invoices")
      .update({
        payment_status: invoiceStatus,
        paid_date:
          invoiceStatus === "paid"
            ? new Date().toISOString().slice(0, 10)
            : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId)

    if (updateInvoiceError) throw updateInvoiceError

    let depositStatus = null
    if (invoice.booking_id && invoice.booking) {
      const exchangeRate =
        moneyNumber(invoice.booking.exchange_rate || invoice.exchange_rate) || 24
      const requiredSle = moneyNumber(
        invoice.booking.deposit_required_amount_sle ||
          moneyNumber(invoice.booking.deposit_required_amount) * exchangeRate,
      )
      const paidTowardDepositSle = moneyNumber(
        Math.min(after.paidSle, requiredSle || after.paidSle),
      )
      const paidTowardDepositUsd = moneyNumber(
        paidTowardDepositSle / exchangeRate,
      )
      depositStatus = deriveDepositStatus(requiredSle, paidTowardDepositSle)

      const bookingUpdate: Record<string, unknown> = {
        deposit_paid_amount: paidTowardDepositUsd,
        deposit_paid_amount_sle: paidTowardDepositSle,
        deposit_status: depositStatus,
        deposit_payment_method: paymentChannel,
        updated_at: new Date().toISOString(),
      }

      if (
        depositStatus === "paid" &&
        !["completed", "cancelled"].includes(invoice.booking.status)
      ) {
        bookingUpdate.status = "confirmed"
      }

      const { error: bookingError } = await supabase
        .from("bookings")
        .update(bookingUpdate)
        .eq("id", invoice.booking_id)

      if (bookingError) throw bookingError

      if (depositStatus === "paid") {
        await moveWorkflowToDepositPaid(supabase, invoice.booking_id)
      }
    }

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "record_payment",
      resource_type: "invoice",
      resource_id: invoiceId,
      new_data: {
        payment,
        currency: "SLE",
        invoice_total_sle: getInvoiceTotalSle(invoice),
        applied_amount: appliedAmount,
        tip_amount: tipAmount,
        paid_amount_sle: after.paidSle,
        balance_sle: after.balanceSle,
        invoice_status: invoiceStatus,
        deposit_status: depositStatus,
      },
      ip_address: request.headers.get("x-forwarded-for"),
      user_agent: request.headers.get("user-agent"),
    })

    return NextResponse.json({
      payment,
      summary: after,
      payment_status: invoiceStatus,
      deposit_status: depositStatus,
    })
  } catch (error) {
    console.error("Record payment error:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to record payment",
      },
      { status: 500 },
    )
  }
}
