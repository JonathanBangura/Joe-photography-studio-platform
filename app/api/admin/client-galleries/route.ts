import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

function generateAccessCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

const gallerySelect = `
  *,
  client:clients(*, profile:profiles(*)),
  booking:bookings(*, service:services(*)),
  photos:client_gallery_photos(id, is_selected, photo_stage)
`

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = createAdminClient()

    const bookingId = body.booking_id
    const clientId = body.client_id
    const title = String(body.title || '').trim()
    const expiresAt = body.expires_at || null

    if (!bookingId || !clientId || !title) {
      return NextResponse.json(
        { error: "Booking, client, and title are required" },
        { status: 400 },
      )
    }

    const { data: existingGallery, error: existingGalleryError } = await supabase
      .from("client_galleries")
      .select(gallerySelect)
      .eq("booking_id", bookingId)
      .maybeSingle()

    if (existingGalleryError) throw existingGalleryError

    if (existingGallery) {
      await supabase.from("audit_logs").insert({
        action: "reuse_client_gallery",
        resource_type: "client_gallery",
        resource_id: existingGallery.id,
        new_data: {
          booking_id: bookingId,
          client_id: clientId,
          access_code: existingGallery.access_code,
        },
        ip_address: request.headers.get("x-forwarded-for"),
        user_agent: request.headers.get("user-agent"),
      })

      return NextResponse.json({ gallery: existingGallery, reused: true })
    }

    const { data, error } = await supabase
      .from("client_galleries")
      .insert({
        booking_id: bookingId,
        client_id: clientId,
        title,
        access_code: generateAccessCode(),
        expires_at: expiresAt,
        is_active: false,
        status: "draft",
      })
      .select(gallerySelect)
      .single()

    if (error) throw error

    await supabase.from("audit_logs").insert({
      action: "create_client_gallery",
      resource_type: "client_gallery",
      resource_id: data.id,
      new_data: data,
      ip_address: request.headers.get("x-forwarded-for"),
      user_agent: request.headers.get("user-agent"),
    })

    return NextResponse.json({ gallery: data })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create gallery",
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const supabase = createAdminClient()

    const id = String(body.id || '')
    const isActive = Boolean(body.is_active)

    if (!id) {
      return NextResponse.json(
        { error: "Gallery ID is required" },
        { status: 400 },
      )
    }

    const { data: oldGallery } = await supabase
      .from("client_galleries")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    const { data, error } = await supabase
      .from("client_galleries")
      .update({
        is_active: isActive,
        status: isActive ? "published" : "draft",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(gallerySelect)
      .single()

    if (error) throw error

    await supabase.from("audit_logs").insert({
      action: isActive ? "publish_gallery" : "unpublish_gallery",
      resource_type: "client_gallery",
      resource_id: id,
      old_data: oldGallery || null,
      new_data: data,
      ip_address: request.headers.get("x-forwarded-for"),
      user_agent: request.headers.get("user-agent"),
    })

    return NextResponse.json({ gallery: data })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update gallery status",
      },
      { status: 500 },
    )
  }
}
