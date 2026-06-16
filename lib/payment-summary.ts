export type PaymentLike = {
  amount?: number | string | null
  applied_amount?: number | string | null
  tip_amount?: number | string | null
  payment_status?: string | null
}

export type InvoiceLike = {
  total_amount?: number | string | null
  total_amount_sle?: number | string | null
  exchange_rate?: number | string | null
  payment_status?: string | null
  payments?: PaymentLike[] | null
  booking?: {
    exchange_rate?: number | string | null
  } | null
}

export function moneyNumber(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? Number(number.toFixed(2)) : 0
}

export function getInvoiceExchangeRate(invoice: InvoiceLike) {
  return moneyNumber(invoice.exchange_rate || invoice.booking?.exchange_rate || 24) || 24
}

export function getInvoiceTotalSle(invoice: InvoiceLike) {
  const storedTotal = moneyNumber(invoice.total_amount_sle)
  if (storedTotal > 0) return storedTotal

  return moneyNumber(moneyNumber(invoice.total_amount) * getInvoiceExchangeRate(invoice))
}

export function getAppliedPaymentAmount(payment: PaymentLike) {
  if (payment.applied_amount !== null && payment.applied_amount !== undefined) {
    return moneyNumber(payment.applied_amount)
  }

  return moneyNumber(payment.amount)
}

export function isCompletedPayment(payment: PaymentLike) {
  return !["failed", "cancelled", "pending"].includes(
    String(payment.payment_status || "completed").toLowerCase(),
  )
}

export function getInvoicePaymentSummary(
  invoice: InvoiceLike,
  payments: PaymentLike[] = invoice.payments || [],
) {
  const completedPayments = payments.filter(isCompletedPayment)
  const totalSle = getInvoiceTotalSle(invoice)
  const paidSle = moneyNumber(
    completedPayments.reduce(
      (sum, payment) => sum + getAppliedPaymentAmount(payment),
      0,
    ),
  )
  const tipsSle = moneyNumber(
    completedPayments.reduce(
      (sum, payment) => sum + moneyNumber(payment.tip_amount),
      0,
    ),
  )
  const balanceSle = moneyNumber(Math.max(totalSle - paidSle, 0))
  const status =
    balanceSle <= 0 && totalSle > 0
      ? "paid"
      : paidSle > 0
        ? "partial"
        : invoice.payment_status || "pending"

  return {
    totalSle,
    paidSle,
    tipsSle,
    balanceSle,
    exchangeRate: getInvoiceExchangeRate(invoice),
    status,
  }
}
