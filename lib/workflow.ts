import { SupabaseClient } from '@supabase/supabase-js'

export async function getOrCreateWorkflowStage(
  supabase: SupabaseClient,
  stageName: string,
  sortOrder = 0,
) {
  const { data: existing } = await supabase
    .from('workflow_stages')
    .select('*')
    .eq('name', stageName)
    .maybeSingle()

  if (existing) return existing

  const { data, error } = await supabase
    .from('workflow_stages')
    .insert({
      name: stageName,
      description: stageName,
      sort_order: sortOrder,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function moveBookingWorkflow(
  supabase: SupabaseClient,
  bookingId: string,
  stageName: string,
  changedBy?: string | null,
  notes?: string,
) {
  const stage = await getOrCreateWorkflowStage(supabase, stageName)

  const { data: workflow } = await supabase
    .from('job_workflows')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle()

  if (!workflow) {
    const { data, error } = await supabase
      .from('job_workflows')
      .insert({
        booking_id: bookingId,
        current_stage_id: stage.id,
        priority: 'medium',
        notes,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  const oldStageId = workflow.current_stage_id

  const { data: updated, error } = await supabase
    .from('job_workflows')
    .update({
      current_stage_id: stage.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', workflow.id)
    .select()
    .single()

  if (error) throw error

  await supabase.from('job_workflow_history').insert({
    job_workflow_id: workflow.id,
    from_stage_id: oldStageId,
    to_stage_id: stage.id,
    changed_by: changedBy || null,
    notes: notes || `Moved to ${stageName}`,
  })

  return updated
}