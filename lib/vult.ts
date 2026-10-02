import crypto from 'crypto'

export type VultPaymentType = 'card' | 'in-app' | 'momo'
export type VultCurrency = 'SLE' | 'USD'

export type VultPaymentLinkRequest = {
  merchantId: string
  type: VultPaymentType
  payload: {
    orderId: string
    currency: VultCurrency
    amount: string
  }
}

export type VultPaymentLinkResponse = {
  data?: Record<string, unknown> | null
  [key: string]: unknown
}

export function getVultApiBaseUrl() {
  return process.env.VULT_API_BASE_URL || 'https://stage.vultme.io/api'
}

export function mapPaymentMethodToVultType(method: string): VultPaymentType {
  if (method === 'card') return 'card'
  if (method === 'mobile_money' || method === 'momo') return 'momo'
  return 'in-app'
}

export function normalizePrivateKey(value?: string | null) {
  if (!value) return ''

  const trimmed = value.trim()

  if (trimmed.includes('BEGIN PRIVATE KEY')) {
    return trimmed.replace(/\\n/g, '\n')
  }

  try {
    return Buffer.from(trimmed, 'base64').toString('utf8').replace(/\\n/g, '\n')
  } catch {
    return trimmed.replace(/\\n/g, '\n')
  }
}

export function createVultSignature(requestBody: VultPaymentLinkRequest) {
  const privateKey = normalizePrivateKey(process.env.VULT_PRIVATE_KEY)

  if (!privateKey) {
    throw new Error('VULT_PRIVATE_KEY is not configured')
  }

  const stringifiedBody = JSON.stringify(requestBody)
  const signer = crypto.createSign('RSA-SHA512')
  signer.update(stringifiedBody)
  signer.end()

  return signer.sign(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
    },
    'base64',
  )
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function extractVultFields(result: VultPaymentLinkResponse | null) {
  const data = (result?.data || {}) as Record<string, unknown>
  const payload = (data.payload || (result as any)?.payload || {}) as Record<string, unknown>

  const link = pickString(
    data.link,
    data.paymentLink,
    data.paymentUrl,
    data.url,
    data.redirectUrl,
    (result as any)?.link,
    (result as any)?.paymentLink,
    (result as any)?.paymentUrl,
    (result as any)?.url,
    (result as any)?.redirectUrl,
    payload.link,
    payload.paymentLink,
    payload.paymentUrl,
    payload.url,
  )

  const code = pickString(
    data.code,
    data.paymentCode,
    data.ussdCode,
    data.ussd,
    data.shortCode,
    (result as any)?.code,
    (result as any)?.paymentCode,
    (result as any)?.ussdCode,
    (result as any)?.ussd,
    payload.code,
    payload.paymentCode,
    payload.ussdCode,
    payload.ussd,
  )

  const qrCode = pickString(
    data.qrCode,
    data.qr_code,
    data.qr,
    data.qrImage,
    data.qr_image,
    (result as any)?.qrCode,
    (result as any)?.qr_code,
    (result as any)?.qr,
    payload.qrCode,
    payload.qr_code,
    payload.qr,
  )

  const requestId = pickString(
    data.vultRequestId,
    data.requestId,
    data.id,
    (result as any)?.vultRequestId,
    (result as any)?.requestId,
    payload.vultRequestId,
    payload.requestId,
  )

  return { link, code, qrCode, requestId }
}

export async function createVultPaymentLink(input: {
  orderId: string
  amount: number
  type: VultPaymentType
  currency?: VultCurrency
}) {
  const merchantId = process.env.VULT_MERCHANT_ID

  if (!merchantId) {
    throw new Error('VULT_MERCHANT_ID is not configured')
  }

  const requestBody: VultPaymentLinkRequest = {
    merchantId,
    type: input.type,
    payload: {
      orderId: input.orderId,
      currency: input.currency || 'SLE',
      amount: Number(input.amount).toFixed(2),
    },
  }

  const signature = createVultSignature(requestBody)

  const response = await fetch(`${getVultApiBaseUrl()}/merchants/private/v1/payment-links`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Vult-Merchant-Signature': signature,
    },
    body: JSON.stringify(requestBody),
  })

  const result = (await response.json().catch(() => null)) as VultPaymentLinkResponse | null

  if (!response.ok) {
    const message =
      (result as any)?.message ||
      (result as any)?.error ||
      (result as any)?.errors?.[0]?.message ||
      'Vult payment link generation failed'
    throw new Error(message)
  }

  const extracted = extractVultFields(result)

  return {
    requestBody,
    result,
    link: extracted.link,
    code: extracted.code,
    qrCode: extracted.qrCode,
    requestId: extracted.requestId,
  }
}

export function isValidVultWebhookAuth(request: Request) {
  const expectedUsername = process.env.VULT_WEBHOOK_USERNAME
  const expectedPassword = process.env.VULT_WEBHOOK_PASSWORD

  if (!expectedUsername || !expectedPassword) return false

  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('basic ')) return false

  const token = authHeader.slice(6)
  const decoded = Buffer.from(token, 'base64').toString('utf8')
  const [username, ...passwordParts] = decoded.split(':')
  const password = passwordParts.join(':')

  return username === expectedUsername && password === expectedPassword
}
