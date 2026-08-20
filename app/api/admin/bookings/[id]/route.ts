import { NextResponse } from 'next/server'
import { requireAdminContext } from '@/lib/admin-auth'
import {
  getServicePricingType,
  getServiceUnitLabel,
  money,
  validateServiceQuantity,
} from '@/lib/booking-pricing'
import { getInvoicePaymentSummary } from '@/lib/payment-summary'

const BOOKING_STATUSES = new Set(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'])
const ENVIRONMENTS = new Set(['indoor', 'outdoor', 'event'])
const PRIVACY_LEVELS = new Set(['shared', 'private'])

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] || null : value
}

function invoiceFinancials(subtotal: number, subtotalSle: number, exchangeRate: number, invoice: any) {
  const discountType = String(invoice?.discount_type || 'none')
  const discountValue = money(invoice?.discount_value)
  const discountAmount = discountType === 'percentage'
    ? money(subtotal * Math.min(Math.max(discountValue, 0), 100) / 100)
    : discountType === 'fixed'
      ? money(Math.min(Math.max(discountValue, 0), subtotal))
      : 0
  const taxAmount = money(invoice?.tax_amount)
  const discountAmountSle = discountType === 'percentage'
    ? money(subtotalSle * Math.min(Math.max(discountValue, 0), 100) / 100)
    : money(discountAmount * exchangeRate)
  const taxAmountSle = invoice?.tax_amount_sle !== null && invoice?.tax_amount_sle !== undefined
    ? money(invoice.tax_amount_sle)
    : money(taxAmount * exchangeRate)
  const totalSle = money(Math.max(subtotalSle - discountAmountSle + taxAmountSle, 0))
  const total = money(totalSle / exchangeRate)

  return { discountAmount, discountAmountSle, taxAmount, taxAmountSle, total, totalSle }
}

function nullableString(value: unknown) {
  const text = String(value || '').trim()
  return text || null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await requireAdminContext()
    if ('error' in context) return context.error

    const { id } = await params
    const { data, error } = await context.supabase
      .from('booking_price_adjustments')
      .select('*')
      .eq('booking_id', id)
      .order('changed_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ adjustments: data || [] })
  } catch (error) {
    console.error('Booking price adjustment load error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load price history.' },
      { status: 500 },
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await requireAdminContext()
    if ('error' in context) return context.error

    const { id } = await params
    const body = await request.json()
    const supabase = context.supabase

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, service:services(*), invoice:invoices(*, payments(*))')
      .eq('id', id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
    }

    const service = relationOne(booking.service)
    if (!service) {
      return NextResponse.json({ error: 'The service linked to this booking no longer exists.' }, { status: 409 })
    }

    const invoice = relationOne<any>(booking.invoice)
    const exchangeRate = money(booking.exchange_rate || invoice?.exchange_rate || 24) || 24
    const pricingType = booking.pricing_type_snapshot || getServicePricingType(service)
    const pricingService = {
      ...service,
      pricing_type: pricingType,
      base_price: booking.unit_price ?? service.base_price,
      base_price_sle: booking.unit_price_sle ?? service.base_price_sle,
    }
    const previousQuantity = Number(booking.service_quantity || 1)
    let newQuantity = previousQuantity
    try {
      newQuantity = validateServiceQuantity(
        pricingService,
        body.service_quantity ?? previousQuantity,
      )
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid photo quantity.' },
        { status: 400 },
      )
    }
    const previousDepositPercentage = Number(booking.deposit_percentage || 50)
    const depositPercentage = Number(body.deposit_percentage) === 30 ? 30 : 50
    const configuredUnitPriceSle = money(pricingService.base_price_sle)
    const unitPriceSle = configuredUnitPriceSle > 0
      ? configuredUnitPriceSle
      : money(pricingService.base_price * exchangeRate)
    const unitPrice = money(pricingService.base_price || unitPriceSle / exchangeRate)
    const subtotalSle = money(pricingType === 'per_unit' ? unitPriceSle * newQuantity : unitPriceSle)
    const subtotal = configuredUnitPriceSle > 0
      ? money(subtotalSle / exchangeRate)
      : money(pricingType === 'per_unit' ? unitPrice * newQuantity : unitPrice)
    const financials = invoiceFinancials(subtotal, subtotalSle, exchangeRate, invoice)
    const totalAmount = financials.total
    const totalAmountSle = financials.totalSle
    const depositRequiredAmountSle = money(totalAmountSle * depositPercentage / 100)
    const depositRequiredAmount = money(depositRequiredAmountSle / exchangeRate)
    const paymentSummary = invoice
      ? getInvoicePaymentSummary(
          { ...invoice, total_amount: totalAmount, total_amount_sle: totalAmountSle },
          invoice.payments || [],
        )
      : null
    const paidSle = money(paymentSummary?.paidSle || booking.deposit_paid_amount_sle || 0)
    const depositPaidSle = money(Math.min(paidSle, depositRequiredAmountSle))
    const depositPaidAmount = money(depositPaidSle / exchangeRate)
    const outstandingAmountSle = money(Math.max(totalAmountSle - paidSle, 0))
    const depositTopUpSle = money(Math.max(depositRequiredAmountSle - paidSle, 0))
    const depositStatus = depositRequiredAmountSle <= 0
      ? 'waived'
      : paidSle >= depositRequiredAmountSle
        ? 'paid'
        : paidSle > 0
          ? 'partial'
          : 'required'
    const invoiceStatus = totalAmountSle > 0 && paidSle >= totalAmountSle
      ? 'paid'
      : paidSle > 0
        ? 'partial'
        : 'pending'
    const previousTotalAmount = money(booking.total_amount)
    const previousTotalAmountSle = money(booking.total_amount_sle || previousTotalAmount * exchangeRate)
    const pricingChanged = previousQuantity !== newQuantity
      || previousDepositPercentage !== depositPercentage
      || previousTotalAmount !== totalAmount
    const reason = String(body.amendment_reason || '').trim()

    if (pricingChanged && reason.length < 3) {
      return NextResponse.json(
        { error: 'Please enter a short reason for this quantity or price change.' },
        { status: 400 },
      )
    }

    if (pricingChanged) {
      const { error: auditTableError } = await supabase
        .from('booking_price_adjustments')
        .select('id')
        .limit(1)

      if (auditTableError) {
        return NextResponse.json(
          { error: 'Run supabase/booking-quantity-pricing-setup.sql before changing booking quantities.' },
          { status: 409 },
        )
      }
    }

    const status = BOOKING_STATUSES.has(String(body.status)) ? String(body.status) : booking.status
    const bookingEnvironment = ENVIRONMENTS.has(String(body.booking_environment))
      ? String(body.booking_environment)
      : booking.booking_environment || 'indoor'
    const privacyLevel = PRIVACY_LEVELS.has(String(body.privacy_level))
      ? String(body.privacy_level)
      : booking.privacy_level || 'shared'
    const now = new Date().toISOString()
    const bookingUpdate = {
      booking_date: body.booking_date || booking.booking_date,
      start_time: body.start_time || booking.start_time,
      end_time: body.end_time || booking.end_time,
      status,
      staff_id: nullableString(body.staff_id),
      resource_id: nullableString(body.resource_id),
      booking_environment: bookingEnvironment,
      privacy_level: privacyLevel,
      locks_indoor_studio: bookingEnvironment === 'indoor' && privacyLevel === 'private',
      location: nullableString(body.location),
      notes: nullableString(body.notes),
      availability_override: Boolean(body.availability_override),
      override_reason: nullableString(body.override_reason),
      service_quantity: newQuantity,
      unit_price: unitPrice,
      unit_price_sle: unitPriceSle,
      pricing_type_snapshot: pricingType,
      unit_label_snapshot: booking.unit_label_snapshot || getServiceUnitLabel(service),
      total_amount: totalAmount,
      total_amount_sle: totalAmountSle,
      deposit_percentage: depositPercentage,
      deposit_required_amount: depositRequiredAmount,
      deposit_required_amount_sle: depositRequiredAmountSle,
      deposit_paid_amount: depositPaidAmount,
      deposit_paid_amount_sle: depositPaidSle,
      deposit_status: depositStatus,
      updated_at: now,
    }
    const bookingRollback = Object.fromEntries(
      Object.keys(bookingUpdate).map((key) => [key, booking[key]]),
    )

    const { error: updateBookingError } = await supabase
      .from('bookings')
      .update(bookingUpdate)
      .eq('id', id)

    if (updateBookingError) throw updateBookingError

    let invoiceUpdate: Record<string, unknown> | null = null
    let invoiceRollback: Record<string, unknown> | null = null
    if (invoice) {
      invoiceUpdate = {
        subtotal_amount: subtotal,
        subtotal_amount_sle: subtotalSle,
        amount: totalAmount,
        discount_amount: financials.discountAmount,
        discount_amount_sle: financials.discountAmountSle,
        total_amount: totalAmount,
        total_amount_sle: totalAmountSle,
        payment_status: invoiceStatus,
        paid_date: invoiceStatus === 'paid' ? new Date().toISOString().slice(0, 10) : null,
        updated_at: now,
      }
      invoiceRollback = Object.fromEntries(
        Object.keys(invoiceUpdate).map((key) => [key, invoice[key]]),
      )
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update(invoiceUpdate)
        .eq('id', invoice.id)

      if (invoiceError) {
        await supabase.from('bookings').update(bookingRollback).eq('id', id)
        throw invoiceError
      }
    }

    let priceAdjustment = null
    if (pricingChanged) {
      const { data, error: adjustmentError } = await supabase
        .from('booking_price_adjustments')
        .insert({
          booking_id: id,
          previous_quantity: previousQuantity,
          new_quantity: newQuantity,
          unit_price: unitPrice,
          unit_price_sle: unitPriceSle,
          previous_total_amount: previousTotalAmount,
          new_total_amount: totalAmount,
          previous_total_amount_sle: previousTotalAmountSle,
          new_total_amount_sle: totalAmountSle,
          previous_deposit_percentage: previousDepositPercentage,
          new_deposit_percentage: depositPercentage,
          deposit_required_amount_sle: depositRequiredAmountSle,
          amount_paid_sle: paidSle,
          deposit_top_up_sle: depositTopUpSle,
          outstanding_amount_sle: outstandingAmountSle,
          reason,
          changed_by: context.user.id,
        })
        .select('*')
        .single()

      if (adjustmentError) {
        await supabase.from('bookings').update(bookingRollback).eq('id', id)
        if (invoice && invoiceRollback) {
          await supabase.from('invoices').update(invoiceRollback).eq('id', invoice.id)
        }
        throw adjustmentError
      }
      priceAdjustment = data
    }

    const { data: updatedBooking, error: reloadError } = await supabase
      .from('bookings')
      .select('*, service:services(*), client:clients(*, profile:profiles(*)), staff:profiles(*), resource:studio_resources(*), invoice:invoices(*, payments(*))')
      .eq('id', id)
      .single()

    if (reloadError) throw reloadError

    await supabase.from('audit_logs').insert({
      user_id: context.user.id,
      action: pricingChanged ? 'booking_price_amendment' : 'update',
      resource_type: 'booking',
      resource_id: id,
      old_data: booking,
      new_data: {
        booking: updatedBooking,
        price_adjustment: priceAdjustment,
      },
      ip_address: request.headers.get('x-forwarded-for'),
      user_agent: request.headers.get('user-agent'),
    })

    return NextResponse.json({
      booking: updatedBooking,
      price_adjustment: priceAdjustment,
      pricing_summary: {
        pricing_type: pricingType,
        quantity: newQuantity,
        unit_price: unitPrice,
        total_amount: totalAmount,
        total_amount_sle: totalAmountSle,
        amount_paid_sle: paidSle,
        deposit_required_amount_sle: depositRequiredAmountSle,
        deposit_top_up_sle: depositTopUpSle,
        outstanding_amount_sle: outstandingAmountSle,
      },
    })
  } catch (error) {
    console.error('Admin booking update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update booking.' },
      { status: 500 },
    )
  }
}
