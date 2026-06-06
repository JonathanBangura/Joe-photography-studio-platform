import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { moveBookingWorkflow } from '@/lib/workflow'

type Params = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json()

    const status = body.status as
      | 'draft'
      | 'published'
      | 'editing'
      | 'delivered'
      | 'completed'

    const supabase = createAdminClient()

    const { data: gallery, error: galleryError } = await supabase
      .from('client_galleries')
      .select('*')
      .eq('id', id)
      .single()

    if (galleryError || !gallery) {
      return NextResponse.json({ error: 'Gallery not found' }, { status: 404 })
    }

    const isActive = status !== 'draft'

    const { data: updatedGallery, error: updateError } = await supabase
      .from('client_galleries')
      .update({
        is_active: isActive,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    if (gallery.booking_id) {
      const workflowStage =
        status === 'published'
          ? 'Customer Selection'
          : status === 'editing'
            ? 'Editing In Progress'
            : status === 'delivered'
              ? 'Final Delivery'
              : status === 'completed'
                ? 'Job Closed'
                : 'Gallery Draft'

      await moveBookingWorkflow(
        supabase,
        gallery.booking_id,
        workflowStage,
        null,
        `Gallery status changed to ${status}`,
      )
    }

    await supabase.from('audit_logs').insert({
      action: 'gallery_status_updated',
      resource_type: 'client_gallery',
      resource_id: id,
      new_data: {
        status,
        is_active: isActive,
      },
    })

    return NextResponse.json({ gallery: updatedGallery })
  } catch (error) {
    console.error('Gallery status update error:', error)
    return NextResponse.json(
      { error: 'Failed to update gallery status' },
      { status: 500 },
    )
  }
}