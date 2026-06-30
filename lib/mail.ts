import nodemailer from 'nodemailer'

type SendEmailOptions = {
  to: string
  subject: string
  html: string
  text?: string
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

export function isEmailConfigured() {
  return Boolean(getSmtpConfig())
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
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
  })
}
