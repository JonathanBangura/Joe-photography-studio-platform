import { NextResponse } from 'next/server'
import { sendEmailSafely } from '@/lib/mail'
import { requireAdminContext } from '@/lib/admin-auth'

type Params = {
  params: Promise<{ id: string }>
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function buildGalleryUrl(request: Request, accessCode: string) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    request.headers.get('origin') ||
    ''

  return `${appUrl.replace(/\/$/, '')}/gallery/${accessCode}`
}

function getClientName(client: any) {
  return (
    client?.full_name ||
    client?.profile?.full_name ||
    client?.email ||
    client?.profile?.email ||
    'there'
  )
}

function getClientEmail(client: any) {
  return String(client?.email || client?.profile?.email || '').trim().toLowerCase()
}

function isFinalDelivery(status?: string | null) {
  return ['final_uploaded', 'delivered', 'completed'].includes(String(status || ''))
}

export async function POST(request: Request, { params }: Params) {
  try {
    const context = await requireAdminContext()
    if ('error' in context) return context.error

    const { id } = await params
    const supabase = context.supabase

    const { data: gallery, error: galleryError } = await supabase
      .from('client_galleries')
      .select('*, client:clients(*, profile:profiles(*)), booking:bookings(*, service:services(*))')
      .eq('id', id)
      .maybeSingle()

    if (galleryError) throw galleryError
    if (!gallery) {
      return NextResponse.json({ error: 'Gallery not found.' }, { status: 404 })
    }

    if (!gallery.access_code) {
      return NextResponse.json(
        { error: 'This gallery does not have an access code yet.' },
        { status: 400 },
      )
    }

    const customerEmail = getClientEmail(gallery.client)

    if (!customerEmail) {
      return NextResponse.json(
        { error: 'This client does not have an email address.' },
        { status: 400 },
      )
    }

    let emailGallery = gallery
    if (!gallery.is_active) {
      const { data: updatedGallery, error: updateError } = await supabase
        .from('client_galleries')
        .update({
          is_active: true,
          status: gallery.status && gallery.status !== 'draft' ? gallery.status : 'published',
          updated_at: new Date().toISOString(),
        })
        .eq('id', gallery.id)
        .select('*')
        .single()

      if (updateError) throw updateError
      emailGallery = {
        ...gallery,
        ...updatedGallery,
      }
    }

    const galleryUrl = buildGalleryUrl(request, emailGallery.access_code)
    const clientName = getClientName(emailGallery.client)
    const bookingReference =
      emailGallery.booking?.booking_reference ||
      emailGallery.booking_id?.slice(0, 8) ||
      ''
    const serviceName = emailGallery.booking?.service?.name || 'Photography Session'
    const finalDelivery = isFinalDelivery(emailGallery.status)

    const emailNotification = await sendEmailSafely({
      to: customerEmail,
      subject: finalDelivery
        ? `Your JoeStudio final photos are ready${bookingReference ? `: ${bookingReference}` : ''}`
        : `Your JoeStudio gallery is ready${bookingReference ? `: ${bookingReference}` : ''}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <h2>${finalDelivery ? 'Your final photos are ready' : 'Your private gallery is ready'}</h2>
          <p>Hello ${escapeHtml(clientName)},</p>
          <p>
            ${finalDelivery
              ? 'Your final edited photos are now available for download.'
              : 'Your selection gallery is now available. Please open the private link below to view and select your preferred photos.'}
          </p>
          <div style="margin:20px 0;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px">
            <p><strong>Gallery:</strong> ${escapeHtml(emailGallery.title || 'Client Gallery')}</p>
            <p><strong>Booking Reference:</strong> ${escapeHtml(bookingReference || 'N/A')}</p>
            <p><strong>Session:</strong> ${escapeHtml(serviceName)}</p>
            <p><strong>Access Code:</strong> ${escapeHtml(emailGallery.access_code)}</p>
          </div>
          <p>
            This is your private gallery link for both photo selection and final edited photo delivery.
          </p>
          <p>
            <a href="${galleryUrl}" style="display:inline-block;padding:12px 18px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px">
              Open Gallery
            </a>
          </p>
          <p style="font-size:13px;color:#6b7280">If the button does not open, copy and paste this link into your browser:<br />${galleryUrl}</p>
          <p>Regards,<br />JoeStudio Photography</p>
        </div>
      `,
    })

    await supabase.from('audit_logs').insert({
      user_id: context.user.id,
      action: 'send_gallery_link_email',
      resource_type: 'client_gallery',
      resource_id: emailGallery.id,
      new_data: {
        gallery_id: emailGallery.id,
        access_code: emailGallery.access_code,
        customer_email: customerEmail,
        gallery_url: galleryUrl,
        email_notification: emailNotification,
      },
      ip_address: request.headers.get('x-forwarded-for'),
      user_agent: request.headers.get('user-agent'),
    })

    return NextResponse.json({
      success: true,
      gallery: emailGallery,
      gallery_url: galleryUrl,
      email_notification: emailNotification,
    })
  } catch (error) {
    console.error('Send gallery email error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to send gallery email.' },
      { status: 500 },
    )
  }
}
