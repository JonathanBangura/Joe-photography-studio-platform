export type PriceDisplayMode = 'usd_only' | 'sle_only' | 'both'

export type CurrencySettings = {
  base_currency: string
  local_currency: string
  payment_currency: string
  usd_to_sle_rate: number
  price_display_mode: PriceDisplayMode
}

export const defaultCurrencySettings: CurrencySettings = {
  base_currency: 'USD',
  local_currency: 'SLE',
  payment_currency: 'SLE',
  usd_to_sle_rate: 24,
  price_display_mode: 'both',
}

export function normalizeCurrencySettings(settings: Partial<CurrencySettings> | Record<string, unknown> | null | undefined): CurrencySettings {
  const mode = String(settings?.price_display_mode || defaultCurrencySettings.price_display_mode)
  return {
    base_currency: String(settings?.base_currency || defaultCurrencySettings.base_currency).toUpperCase(),
    local_currency: String(settings?.local_currency || defaultCurrencySettings.local_currency).toUpperCase(),
    payment_currency: String(settings?.payment_currency || defaultCurrencySettings.payment_currency).toUpperCase(),
    usd_to_sle_rate: Number(settings?.usd_to_sle_rate || defaultCurrencySettings.usd_to_sle_rate),
    price_display_mode: mode === 'usd_only' || mode === 'sle_only' || mode === 'both' ? mode : 'both',
  }
}

export function convertUsdToSle(usdAmount: number, exchangeRate: number) {
  return Number((Number(usdAmount || 0) * Number(exchangeRate || 0)).toFixed(2))
}

export function formatUsd(amount: number) {
  return `$${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatSle(amount: number) {
  return `SLE ${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatDisplayPrice(usdAmount: number, settings: Partial<CurrencySettings> | Record<string, unknown> | null | undefined, prefix = '') {
  const normalized = normalizeCurrencySettings(settings)
  const usd = Number(usdAmount || 0)
  const sle = convertUsdToSle(usd, normalized.usd_to_sle_rate)

  if (normalized.price_display_mode === 'usd_only') return `${prefix}${formatUsd(usd)}`
  if (normalized.price_display_mode === 'sle_only') return `${prefix}${formatSle(sle)}`
  return `${prefix}${formatUsd(usd)} / ${formatSle(sle)}`
}

export function formatDisplayAmounts(
  usdAmount: number,
  sleAmount: number,
  settings: Partial<CurrencySettings> | Record<string, unknown> | null | undefined,
  prefix = '',
) {
  const normalized = normalizeCurrencySettings(settings)
  const usd = Number(usdAmount || 0)
  const sle = Number(sleAmount || 0)

  if (normalized.price_display_mode === 'usd_only') return `${prefix}${formatUsd(usd)}`
  if (normalized.price_display_mode === 'sle_only') return `${prefix}${formatSle(sle)}`
  return `${prefix}${formatUsd(usd)} / ${formatSle(sle)}`
}

export function formatDualAmount(usdAmount: number, exchangeRate: number) {
  return `${formatUsd(usdAmount)} / ${formatSle(convertUsdToSle(usdAmount, exchangeRate))}`
}
