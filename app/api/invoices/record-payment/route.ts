import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function toNumber(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function derivePaymentStatus(totalAmount: number, paidAmount: number) {
  if (paidAmount >= totalAmount && totalAmount > 0) return "paid";
  if (paidAmount > 0) return "partial";
  return "pending";
}

function deriveDepositStatus(requiredAmount: number, paidAmount: number) {
  if (requiredAmount <= 0) return "waived";
  if (paidAmount >= requiredAmount) return "paid";
  if (paidAmount > 0) return "partial";
  return "required";
}

export async function POST(request: Request) {
  try {
    const authSupabase = await createClient();

    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();

    const invoiceId = String(body.invoice_id || "");
    const amount = toNumber(body.amount);

    if (!invoiceId || amount <= 0) {
      return NextResponse.json(
        { error: "Invoice ID and a valid amount are required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*, booking:bookings(id, deposit_required_amount)")
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 },
      );
    }

    const paymentMethod = String(body.payment_method || "Cash");
    const paymentChannel = body.payment_channel
      ? String(body.payment_channel)
      : paymentMethod;
    const paymentProcessor = body.payment_processor
      ? String(body.payment_processor)
      : paymentMethod === "Cash" || paymentMethod === "Bank Transfer"
        ? "Manual"
        : "Vult";

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        invoice_id: invoiceId,
        amount,
        payment_method: paymentMethod,
        payment_channel: paymentChannel,
        payment_processor: paymentProcessor,
        transaction_id: body.transaction_id || null,
        customer_reference:
          body.customer_reference || invoice.invoice_number || null,
        payment_status: body.payment_status || "completed",
        recorded_by: user.id,
        notes: body.notes || null,
        metadata: {
          source: "admin_invoice_payment",
          invoice_number: invoice.invoice_number,
          recorded_by_email: user.email,
        },
      })
      .select("*")
      .single();

    if (paymentError) {
      throw paymentError;
    }

    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("amount, payment_status")
      .eq("invoice_id", invoiceId);

    if (paymentsError) {
      throw paymentsError;
    }

    const paidAmount = (payments || [])
      .filter((item) => item.payment_status !== "failed")
      .reduce((sum, item) => sum + toNumber(item.amount), 0);

    const totalAmount = toNumber(invoice.total_amount);
    const invoiceStatus = derivePaymentStatus(totalAmount, paidAmount);

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
      .eq("id", invoiceId);

    if (updateInvoiceError) {
      throw updateInvoiceError;
    }

    if (invoice.booking_id) {
      const depositRequired = toNumber(invoice.booking?.deposit_required_amount);
      const depositStatus = deriveDepositStatus(depositRequired, paidAmount);

      await supabase
        .from("bookings")
        .update({
          deposit_paid_amount: paidAmount,
          deposit_status: depositStatus,
          deposit_payment_method: paymentChannel,
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.booking_id);
    }

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "record_payment",
      resource_type: "invoice",
      resource_id: invoiceId,
      new_data: {
        payment,
        paid_amount: paidAmount,
        invoice_status: invoiceStatus,
      },
      ip_address: request.headers.get("x-forwarded-for"),
      user_agent: request.headers.get("user-agent"),
    });

    return NextResponse.json({
      payment,
      paid_amount: paidAmount,
      payment_status: invoiceStatus,
    });
  } catch (error) {
    console.error("Record payment error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to record payment",
      },
      { status: 500 },
    );
  }
}
