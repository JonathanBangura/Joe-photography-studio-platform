import { NextResponse } from 'next/server'
import {
  isEmailConfigured,
  parseEmailList,
  sendEmail,
  uniqueEmails,
} from '@/lib/mail'
import { createAdminClient } from '@/lib/supabase/admin'

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

async function getSetting(supabase: ReturnType<typeof createAdminClient>, key: string) {
  const { data } = await supabase
    .from('business_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle()

  return data?.value ? String(data.value) : ''
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const name = String(body.name || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const message = String(body.message || '').trim()
    const phone = body.phone ? String(body.phone).trim() : null
    const subject = body.subject ? String(body.subject).trim() : null
    const sessionType = body.session_type ? String(body.session_type) : null
    const preferredDate = body.preferred_date ? String(body.preferred_date) : null

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email and message are required.' },
        { status: 400 },
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('contact_submissions')
      .insert({
        name,
        email,
        phone,
        subject,
        message,
        session_type: sessionType,
        preferred_date: preferredDate,
        is_read: false,
        is_responded: false,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Contact insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const studioEmails = uniqueEmails([
      ...parseEmailList(process.env.STUDIO_NOTIFICATION_EMAILS),
      ...parseEmailList(process.env.STUDIO_NOTIFICATION_EMAIL),
      await getSetting(supabase, 'email'),
      process.env.EMAIL_REPLY_TO,
    ])

    let emailNotification: any = null

    if (!isEmailConfigured()) {
      emailNotification = {
        sent: false,
        skipped: true,
        reason: 'Email service is not configured. Add RESEND_API_KEY and EMAIL_FROM in Vercel.',
      }
    } else if (studioEmails.length) {
      try {
        const result = await sendEmail({
          to: studioEmails,
          subject: `New website inquiry${subject ? `: ${subject}` : ''}`,
          idempotencyKey: `joestudio-contact-${data.id}`,
          html: `
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
              <h2>New Website Inquiry</h2>
              <p><strong>Name:</strong> ${escapeHtml(name)}</p>
              <p><strong>Email:</strong> ${escapeHtml(email)}</p>
              <p><strong>Phone:</strong> ${escapeHtml(phone || 'N/A')}</p>
              <p><strong>Session Type:</strong> ${escapeHtml(sessionType || 'N/A')}</p>
              <p><strong>Preferred Date:</strong> ${escapeHtml(preferredDate || 'N/A')}</p>
              <p><strong>Subject:</strong> ${escapeHtml(subject || 'No subject')}</p>
              <div style="margin-top:16px;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px">
                ${escapeHtml(message).replace(/\n/g, '<br />')}
              </div>
            </div>
          `,
        })

        emailNotification = {
          sent: true,
          skipped: false,
          messageId: result.messageId,
        }
      } catch (error) {
        emailNotification = {
          sent: false,
          skipped: false,
          reason: error instanceof Error ? error.message : 'Failed to send email notification.',
        }
      }
    }

    await supabase.from('audit_logs').insert({
      action: 'contact_submission_created',
      resource_type: 'contact_submission',
      resource_id: data.id,
      new_data: {
        submission: data,
        studio_emails: studioEmails,
        notification: emailNotification,
      },
      ip_address: request.headers.get('x-forwarded-for'),
      user_agent: request.headers.get('user-agent'),
    })

    return NextResponse.json({
      submission: data,
      notification: emailNotification,
    })
  } catch (error) {
    console.error('Contact API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to submit inquiry.' },
      { status: 500 },
    )
  }
}
