import { createClient } from '@/lib/supabase/client'
import { createAuditLog } from '@/lib/audit-log-client'

const DEFAULT_WORKFLOW_STAGES = [
  { name: 'Booking Received', description: 'Booking has been created and is awaiting confirmation.', color: '#F59E0B', sort_order: 1 },
  { name: 'Deposit Paid', description: 'Client deposit has been received.', color: '#3B82F6', sort_order: 2 },
  { name: 'Shoot Scheduled', description: 'Session has been confirmed and scheduled.', color: '#8B5CF6', sort_order: 3 },
  { name: 'Shoot Completed', description: 'Photo session has been completed.', color: '#06B6D4', sort_order: 4 },
  { name: 'Photos Uploaded', description: 'Photo previews have been uploaded.', color: '#14B8A6', sort_order: 5 },
  { name: 'Customer Selection', description: 'Client is selecting preferred photos.', color: '#6366F1', sort_order: 6 },
  { name: 'Editing In Progress', description: 'Selected photos are being edited.', color: '#F97316', sort_order: 7 },
  { name: 'Final Delivery', description: 'Final edited photos are ready for delivery.', color: '#22C55E', sort_order: 8 },
  { name: 'Job Closed', description: 'Job has been completed and closed.', color: '#10B981', sort_order: 9 },
]

export async function ensureDefaultWorkflowStages() {
  const supabase = createClient()
  const { data: existingStages, error } = await supabase
    .from('workflow_stages')
    .select('id, name, sort_order')

  if (error) throw error

  const existingNames = new Set((existingStages || []).map((stage) => stage.name.toLowerCase()))
  const missingStages = DEFAULT_WORKFLOW_STAGES.filter(
    (stage) => !existingNames.has(stage.name.toLowerCase())
  )

  if (missingStages.length > 0) {
    const { error: insertError } = await supabase.from('workflow_stages').insert(missingStages)
    if (insertError) throw insertError
  }

  const { data: stages, error: reloadError } = await supabase
    .from('workflow_stages')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (reloadError) throw reloadError
  return stages || []
}

export async function getWorkflowStageByName(stageName: string) {
  const stages = await ensureDefaultWorkflowStages()
  return stages.find((stage) => stage.name.toLowerCase() === stageName.toLowerCase()) || null
}

export function generateInvoiceNumber() {
  const date = new Date()
  const stamp = date.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.floor(1000 + Math.random() * 9000)
  return `INV-${stamp}-${random}`
}

export async function createInvoiceForBooking(params: {
  bookingId: string
  clientId: string
  totalAmount: number
  notes?: string | null
}) {
  const supabase = createClient()

  const { data: existingInvoice } = await supabase
    .from('invoices')
    .select('*')
    .eq('booking_id', params.bookingId)
    .maybeSingle()

  if (existingInvoice) return existingInvoice

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 7)

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      booking_id: params.bookingId,
      client_id: params.clientId,
      invoice_number: generateInvoiceNumber(),
      amount: params.totalAmount,
      tax_amount: 0,
      total_amount: params.totalAmount,
      payment_status: 'pending',
      due_date: dueDate.toISOString().slice(0, 10),
      notes: params.notes || null,
    })
    .select('*')
    .single()

  if (error) throw error

  await createAuditLog({
    action: 'create',
    resource_type: 'invoice',
    resource_id: data.id,
    new_data: data,
  })

  return data
}

export async function createWorkflowForBooking(params: {
  bookingId: string
  bookingDate?: string | null
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  notes?: string | null
}) {
  const supabase = createClient()

  const { data: existingWorkflow } = await supabase
    .from('job_workflows')
    .select('*')
    .eq('booking_id', params.bookingId)
    .maybeSingle()

  if (existingWorkflow) return existingWorkflow

  const firstStage = await getWorkflowStageByName('Booking Received')
  if (!firstStage) throw new Error('No workflow stages configured')

  const dueDate = params.bookingDate || null

  const { data, error } = await supabase
    .from('job_workflows')
    .insert({
      booking_id: params.bookingId,
      current_stage_id: firstStage.id,
      due_date: dueDate,
      priority: params.priority || 'medium',
      notes: params.notes || null,
    })
    .select('*')
    .single()

  if (error) throw error

  await createAuditLog({
    action: 'create',
    resource_type: 'job_workflow',
    resource_id: data.id,
    new_data: data,
  })

  return data
}

export async function moveBookingWorkflowToStage(
  bookingId: string,
  stageName: string,
  notes?: string
) {
  const supabase = createClient()
  const targetStage = await getWorkflowStageByName(stageName)
  if (!targetStage) throw new Error(`Workflow stage not found: ${stageName}`)

  const { data: workflow, error: workflowError } = await supabase
    .from('job_workflows')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle()

  if (workflowError) throw workflowError
  if (!workflow) return null

  if (workflow.current_stage_id === targetStage.id) return workflow

  const {
    data: { user },
  } = await supabase.auth.getUser()

  await supabase.from('job_workflow_history').insert({
    job_workflow_id: workflow.id,
    from_stage_id: workflow.current_stage_id,
    to_stage_id: targetStage.id,
    changed_by: user?.id || null,
    notes: notes || null,
  })

  const isClosed = targetStage.name.toLowerCase() === 'job closed'

  const { data, error } = await supabase
    .from('job_workflows')
    .update({
      current_stage_id: targetStage.id,
      completed_at: isClosed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', workflow.id)
    .select('*')
    .single()

  if (error) throw error

  await createAuditLog({
    action: 'status_change',
    resource_type: 'job_workflow',
    resource_id: workflow.id,
    old_data: { current_stage_id: workflow.current_stage_id },
    new_data: { current_stage_id: targetStage.id, stage_name: targetStage.name },
  })

  return data
}

export async function recordPaymentAndSyncInvoice(params: {
  invoiceId: string
  amount: number
  paymentMethod: string
  transactionId?: string | null
  notes?: string | null
}) {
  const supabase = createClient()

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', params.invoiceId)
    .single()

  if (invoiceError) throw invoiceError

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      invoice_id: params.invoiceId,
      amount: params.amount,
      payment_method: params.paymentMethod,
      transaction_id: params.transactionId || null,
      notes: params.notes || null,
    })
    .select('*')
    .single()

  if (paymentError) throw paymentError

  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('amount')
    .eq('invoice_id', params.invoiceId)

  if (paymentsError) throw paymentsError

  const paidAmount = (payments || []).reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const totalAmount = Number(invoice.total_amount || 0)
  const nextStatus = paidAmount >= totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'pending'

  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      payment_status: nextStatus,
      paid_date: nextStatus === 'paid' ? new Date().toISOString().slice(0, 10) : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.invoiceId)

  if (updateError) throw updateError

  if (invoice.booking_id && paidAmount > 0) {
    await moveBookingWorkflowToStage(invoice.booking_id, 'Deposit Paid', 'Payment recorded')
  }

  await createAuditLog({
    action: 'create',
    resource_type: 'payment',
    resource_id: payment.id,
    new_data: payment,
  })

  return { payment, paidAmount, paymentStatus: nextStatus }
}
