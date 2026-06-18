import { NextResponse } from 'next/server'
import { requireAdminContext } from '@/lib/admin-auth'
import { moveBookingWorkflow } from '@/lib/workflow'

type Params = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const context = await requireAdminContext()
    if ("error" in context) return context.error

    const { id } = await params
    const body = await request.json()

    const status = body.status as
      | 'draft'
      | 'published'
      | 'selection_submitted'
      | 'editing'
      | 'final_uploaded'
      | 'delivered'
      | 'completed'

    const allowedStatuses = new Set([
      'draft',
      'published',
      'selection_submitted',
      'editing',
      'final_uploaded',
      'delivered',
      'completed',
    ])

    if (!allowedStatuses.has(status)) {
      return NextResponse.json({ error: 'Invalid gallery status' }, { status: 400 })
    }

    const supabase = context.supabase

    const { data: gallery, error: galleryError } = await supabase
      .from('client_galleries')
      .select('*')
      .eq('id', id)
      .single()

    if (galleryError || !gallery) {
      return NextResponse.json({ error: 'Gallery not found' }, { status: 404 })
    }

    const isActive = status !== 'draft'
    const now = new Date().toISOString()

    const { data: updatedGallery, error: updateError } = await supabase
      .from('client_galleries')
      .update({
        status,
        is_active: isActive,
        selection_submitted_at:
          status === 'selection_submitted'
            ? gallery.selection_submitted_at || now
            : gallery.selection_submitted_at,
        delivered_at:
          status === 'delivered'
            ? gallery.delivered_at || now
            : gallery.delivered_at,
        completed_at:
          status === 'completed'
            ? gallery.completed_at || now
            : gallery.completed_at,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    if (gallery.booking_id) {
      const workflowStageByStatus: Record<typeof status, string> = {
        draft: 'Gallery Draft',
        published: 'Customer Selection',
        selection_submitted: 'Editing In Progress',
        editing: 'Editing In Progress',
        final_uploaded: 'Final Delivery',
        delivered: 'Final Delivery',
        completed: 'Job Closed',
      }
      const workflowStage = workflowStageByStatus[status]

      await moveBookingWorkflow(
        supabase,
        gallery.booking_id,
        workflowStage,
        null,
        `Gallery status changed to ${status}`,
      )
    }

    await supabase.from('audit_logs').insert({
      user_id: context.user.id,
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
