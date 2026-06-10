import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Params = {
  params: Promise<{ id: string }>
}

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL

  if (!apiKey || !from) {
    throw new Error('Email service is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL in Vercel.')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  })

  const result = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(result?.message || 'Failed to send email')
  }

  return result
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json()
    const reply = String(body.reply || '').trim()

    if (!reply) {
      return NextResponse.json({ error: 'Reply message is required.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: inquiry, error: inquiryError } = await supabase
      .from('contact_submissions')
      .select('*')
      .eq('id', id)
      .single()

    if (inquiryError || !inquiry) {
      return NextResponse.json({ error: 'Inquiry not found.' }, { status: 404 })
    }

    const subject = `Re: ${inquiry.subject || 'Your inquiry to JoeStudio'}`
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <p>Hello ${inquiry.name},</p>
        <div>${reply.replace(/\n/g, '<br />')}</div>
        <p style="margin-top:24px">Regards,<br />JoeStudio Photography</p>
      </div>
    `

    const emailResult = await sendEmail(inquiry.email, subject, html)

    const { data: updated, error: updateError } = await supabase
      .from('contact_submissions')
      .update({ is_read: true, is_responded: true })
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) throw updateError

    await supabase.from('audit_logs').insert({
      action: 'reply_inquiry',
      resource_type: 'contact_submission',
      resource_id: id,
      old_data: inquiry,
      new_data: { reply, emailResult },
      ip_address: request.headers.get('x-forwarded-for'),
      user_agent: request.headers.get('user-agent'),
    })

    return NextResponse.json({ inquiry: updated })
  } catch (error) {
    console.error('Reply inquiry error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to send reply.' },
      { status: 500 },
    )
  }
}
