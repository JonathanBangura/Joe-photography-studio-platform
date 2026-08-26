type SendEmailOptions = {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
  idempotencyKey?: string
}

type ResendSuccessResponse = {
  id?: string
}

type ResendErrorResponse = {
  message?: string
  name?: string
}

const RESEND_EMAILS_ENDPOINT = 'https://api.resend.com/emails'
const MAX_RESEND_RECIPIENTS = 50

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.EMAIL_FROM?.trim()
  const replyTo = process.env.EMAIL_REPLY_TO?.trim()

  if (!apiKey || !from) {
    return null
  }

  return {
    apiKey,
    from,
    replyTo,
  }
}

function getEmailConfigurationError() {
  return 'Email service is not configured. Add RESEND_API_KEY and EMAIL_FROM in Vercel.'
}

function normalizeRecipients(to: string | string[]) {
  const values = Array.isArray(to) ? to : [to]
  return uniqueEmails(values)
}

async function readResendResponse(response: Response) {
  try {
    return (await response.json()) as ResendSuccessResponse & ResendErrorResponse
  } catch {
    return null
  }
}

export function parseEmailList(value?: string | null) {
  return String(value || '')
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function uniqueEmails(values: Array<string | null | undefined>) {
  const seen = new Set<string>()
  const emails: string[] = []

  values.forEach((value) => {
    const email = String(value || '').trim()
    const key = email.toLowerCase()

    if (!email || seen.has(key)) return

    seen.add(key)
    emails.push(email)
  })

  return emails
}

export function isEmailConfigured() {
  return Boolean(getResendConfig())
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
  idempotencyKey,
}: SendEmailOptions) {
  const config = getResendConfig()

  if (!config) {
    throw new Error(getEmailConfigurationError())
  }

  const recipients = normalizeRecipients(to)

  if (!recipients.length) {
    throw new Error('No email recipient was provided.')
  }

  if (recipients.length > MAX_RESEND_RECIPIENTS) {
    throw new Error(`Resend accepts a maximum of ${MAX_RESEND_RECIPIENTS} recipients per email.`)
  }

  if (idempotencyKey && idempotencyKey.length > 256) {
    throw new Error('The email idempotency key cannot exceed 256 characters.')
  }

  const resolvedReplyTo = replyTo?.trim() || config.replyTo
  const response = await fetch(RESEND_EMAILS_ENDPOINT, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from: config.from,
      to: recipients,
      subject,
      html,
      ...(text !== undefined ? { text } : {}),
      ...(resolvedReplyTo ? { reply_to: resolvedReplyTo } : {}),
    }),
  })

  const result = await readResendResponse(response)

  if (!response.ok) {
    const reason = result?.message || result?.name || `Resend request failed with status ${response.status}.`
    throw new Error(`Unable to send email through Resend: ${reason}`)
  }

  if (!result?.id) {
    throw new Error('Resend accepted the request but did not return an email ID.')
  }

  return {
    messageId: result.id,
    accepted: recipients,
    rejected: [] as string[],
    provider: 'resend' as const,
  }
}

export async function sendEmailSafely(options: SendEmailOptions) {
  const recipients = Array.isArray(options.to) ? options.to.filter(Boolean) : [options.to].filter(Boolean)

  if (!recipients.length) {
    return {
      sent: false,
      skipped: true,
      reason: 'No email recipient was provided.',
    }
  }

  if (!isEmailConfigured()) {
    return {
      sent: false,
      skipped: true,
      reason: getEmailConfigurationError(),
    }
  }

  try {
    const result = await sendEmail({
      ...options,
      to: Array.isArray(options.to) ? recipients : recipients[0],
    })

    return {
      sent: true,
      skipped: false,
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      provider: result.provider,
    }
  } catch (error) {
    return {
      sent: false,
      skipped: false,
      reason: error instanceof Error ? error.message : 'Failed to send email.',
    }
  }
}
