import nodemailer from 'nodemailer'

type SendEmailOptions = {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 465)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.EMAIL_FROM || user

  if (!host || !user || !pass || !from) {
    return null
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    from,
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
  return Boolean(getSmtpConfig())
}

export async function sendEmail({ to, subject, html, text, replyTo }: SendEmailOptions) {
  const config = getSmtpConfig()

  if (!config) {
    throw new Error(
      'Email service is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and EMAIL_FROM in Vercel.',
    )
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  })

  return transporter.sendMail({
    from: config.from,
    to,
    subject,
    html,
    text,
    replyTo,
  })
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
      reason:
        'Email service is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and EMAIL_FROM in Vercel.',
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
    }
  } catch (error) {
    return {
      sent: false,
      skipped: false,
      reason: error instanceof Error ? error.message : 'Failed to send email.',
    }
  }
}
