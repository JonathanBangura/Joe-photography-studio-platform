import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { moveBookingWorkflow } from '@/lib/workflow'

type RouteContext = {
  params: Promise<{ accessCode: string }>
}

function isExpired(expiresAt?: string | null) {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() < Date.now()
}

async function getGalleryByAccessCode(accessCode: string) {
  const supabase = createAdminClient()
  const normalizedCode = decodeURIComponent(accessCode || '').trim()
  const { data: gallery, error } = await supabase
    .from('client_galleries')
    .select('id, access_code, is_active, expires_at, client_id, booking_id, title, status')
    .ilike('access_code', normalizedCode)
    .maybeSingle()

  if (error) throw error
  return { supabase, gallery }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { accessCode } = await context.params
    const body = await request.json()
    const photoId = String(body.photo_id || '').trim()
    const isSelected = Boolean(body.is_selected)

    if (!photoId) {
      return NextResponse.json({ error: 'Photo ID is required.' }, { status: 400 })
    }

    const { supabase, gallery } = await getGalleryByAccessCode(accessCode)

    if (!gallery) {
      return NextResponse.json({ error: 'Gallery not found.' }, { status: 404 })
    }

    if (!gallery.is_active || isExpired(gallery.expires_at)) {
      return NextResponse.json({ error: 'Gallery is not available for selection.' }, { status: 403 })
    }

    if (['selection_submitted', 'editing', 'final_uploaded', 'delivered', 'completed'].includes(String(gallery.status || ''))) {
      return NextResponse.json({ error: 'Selection has already been submitted and is now locked.' }, { status: 403 })
    }

    const { data: photo, error: updateError } = await supabase
      .from('client_gallery_photos')
      .update({ is_selected: isSelected })
      .eq('id', photoId)
      .eq('gallery_id', gallery.id)
      .eq('photo_stage', 'selection')
      .select('*')
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const { count } = await supabase
      .from('client_gallery_photos')
      .select('id', { count: 'exact', head: true })
      .eq('gallery_id', gallery.id)
      .eq('photo_stage', 'selection')
      .eq('is_selected', true)

    return NextResponse.json({ photo, selected_count: count || 0 })
  } catch (error) {
    console.error('Gallery selection update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update selection.' },
      { status: 500 },
    )
  }
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { accessCode } = await context.params
    const { supabase, gallery } = await getGalleryByAccessCode(accessCode)

    if (!gallery) {
      return NextResponse.json({ error: 'Gallery not found.' }, { status: 404 })
    }

    if (!gallery.is_active || isExpired(gallery.expires_at)) {
      return NextResponse.json({ error: 'Gallery is not available.' }, { status: 403 })
    }

    const { data: selectedPhotos, error: selectedError } = await supabase
      .from('client_gallery_photos')
      .select('id, title, image_url')
      .eq('gallery_id', gallery.id)
      .eq('photo_stage', 'selection')
      .eq('is_selected', true)
      .order('created_at', { ascending: true })

    if (selectedError) {
      return NextResponse.json({ error: selectedError.message }, { status: 500 })
    }

    if (!selectedPhotos || selectedPhotos.length === 0) {
      return NextResponse.json({ error: 'Please select at least one photo before submitting.' }, { status: 400 })
    }

    const selectedPhotoIds = selectedPhotos.map((photo) => photo.id)
    const now = new Date().toISOString()

    await supabase
      .from('client_galleries')
      .update({
        status: 'selection_submitted',
        selection_submitted_at: now,
        updated_at: now,
      })
      .eq('id', gallery.id)

    // 1. Log the submission action
    await supabase.from('audit_logs').insert({
      action: 'client_submitted_gallery_selection',
      resource_type: 'client_gallery',
      resource_id: gallery.id,
      new_data: {
        gallery_id: gallery.id,
        access_code: gallery.access_code,
        selected_count: selectedPhotos.length,
        selected_photo_ids: selectedPhotoIds,
      },
    })

    // 2. Trigger the workflow transition if a booking exists
    if (gallery.booking_id) {
      await moveBookingWorkflow(
        supabase,
        gallery.booking_id,
        'Editing In Progress',
        null,
        'Client submitted photo selection',
      )
    }

    // 3. Log the second structural photo submission action
    await supabase.from('audit_logs').insert({
      action: 'client_photo_selection_submitted',
      resource_type: 'client_gallery',
      resource_id: gallery.id,
      new_data: {
        selected_photo_ids: selectedPhotoIds,
        selected_count: selectedPhotoIds.length,
      },
    })

    return NextResponse.json({
      success: true,
      selected_count: selectedPhotos.length,
      message: 'Selection submitted successfully.',
    })
  } catch (error) {
    console.error('Gallery selection submit error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit selection.' },
      { status: 500 },
    )
  }
}
