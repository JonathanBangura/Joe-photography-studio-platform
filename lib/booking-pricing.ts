export type ServicePricingType = 'fixed' | 'per_unit'

export type PriceableService = {
  base_price?: number | string | null
  base_price_sle?: number | string | null
  pricing_type?: string | null
  unit_label?: string | null
  minimum_quantity?: number | string | null
  maximum_quantity?: number | string | null
  quantity_step?: number | string | null
}

export type BookingPriceCalculation = {
  pricingType: ServicePricingType
  quantity: number
  unitPrice: number
  unitPriceSle: number
  subtotal: number
  total: number
  totalSle: number
  depositPercentage: number
  depositRequired: number
  depositRequiredSle: number
  balanceAfterDeposit: number
  balanceAfterDepositSle: number
}

function finiteNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function money(value: unknown) {
  return Number(finiteNumber(value).toFixed(2))
}

export function getServicePricingType(service?: PriceableService | null): ServicePricingType {
  return service?.pricing_type === 'per_unit' ? 'per_unit' : 'fixed'
}

export function getServiceUnitLabel(service?: PriceableService | null) {
  const label = String(service?.unit_label || '').trim()
  return label || 'edited photo'
}

export function getServiceQuantityRules(service?: PriceableService | null) {
  if (getServicePricingType(service) === 'fixed') {
    return { minimum: 1, maximum: 1, step: 1 }
  }

  const minimum = Math.max(1, Math.floor(finiteNumber(service?.minimum_quantity, 1)))
  const maximum = Math.max(minimum, Math.floor(finiteNumber(service?.maximum_quantity, 100)))
  const step = Math.max(1, Math.floor(finiteNumber(service?.quantity_step, 1)))

  return { minimum, maximum, step }
}

export function clampServiceQuantity(service: PriceableService | null | undefined, value: unknown) {
  const pricingType = getServicePricingType(service)
  if (pricingType === 'fixed') return 1

  const rules = getServiceQuantityRules(service)
  const requested = Math.floor(finiteNumber(value, rules.minimum))
  const clamped = Math.min(Math.max(requested, rules.minimum), rules.maximum)
  const stepsFromMinimum = Math.round((clamped - rules.minimum) / rules.step)

  return Math.min(rules.minimum + stepsFromMinimum * rules.step, rules.maximum)
}

export function validateServiceQuantity(service: PriceableService | null | undefined, value: unknown) {
  const pricingType = getServicePricingType(service)
  if (pricingType === 'fixed') return 1

  const rules = getServiceQuantityRules(service)
  const quantity = Number(value)

  if (!Number.isInteger(quantity)) {
    throw new Error('Please enter a whole number of edited photos.')
  }

  if (quantity < rules.minimum || quantity > rules.maximum) {
    throw new Error(`Photo quantity must be between ${rules.minimum} and ${rules.maximum}.`)
  }

  if ((quantity - rules.minimum) % rules.step !== 0) {
    throw new Error(`Photo quantity must increase in steps of ${rules.step}.`)
  }

  return quantity
}

export function calculateBookingPrice(params: {
  service: PriceableService
  quantity: unknown
  depositPercentage: unknown
  exchangeRate: unknown
}): BookingPriceCalculation {
  const pricingType = getServicePricingType(params.service)
  const quantity = clampServiceQuantity(params.service, params.quantity)
  const exchangeRate = Math.max(finiteNumber(params.exchangeRate, 24), 0) || 24
  const configuredLocalPrice = finiteNumber(params.service.base_price_sle, 0)
  const hasConfiguredLocalPrice = configuredLocalPrice > 0
  const unitPriceSle = hasConfiguredLocalPrice
    ? money(configuredLocalPrice)
    : money(finiteNumber(params.service.base_price) * exchangeRate)
  const unitPrice = hasConfiguredLocalPrice
    ? money(unitPriceSle / exchangeRate)
    : money(params.service.base_price)
  const subtotalSle = money(pricingType === 'per_unit' ? unitPriceSle * quantity : unitPriceSle)
  const subtotal = hasConfiguredLocalPrice
    ? money(subtotalSle / exchangeRate)
    : money(pricingType === 'per_unit' ? unitPrice * quantity : unitPrice)
  const depositPercentage = finiteNumber(params.depositPercentage, 50) === 30 ? 30 : 50
  const depositRequired = money((subtotal * depositPercentage) / 100)
  const totalSle = subtotalSle
  const depositRequiredSle = money((totalSle * depositPercentage) / 100)

  return {
    pricingType,
    quantity,
    unitPrice,
    unitPriceSle,
    subtotal,
    total: subtotal,
    totalSle,
    depositPercentage,
    depositRequired,
    depositRequiredSle,
    balanceAfterDeposit: money(subtotal - depositRequired),
    balanceAfterDepositSle: money(totalSle - depositRequiredSle),
  }
}
