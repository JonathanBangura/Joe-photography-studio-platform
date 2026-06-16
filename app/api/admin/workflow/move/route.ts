import { NextResponse } from "next/server"
import { requireAdminContext } from "@/lib/admin-auth"

export async function POST(request: Request) {
  try {
    const context = await requireAdminContext()
    if ("error" in context) return context.error

    const body = await request.json()
    const bookingId = String(body.booking_id || "")
    const stageName = String(body.stage_name || "")
    const notes = body.notes ? String(body.notes) : null

    if (!bookingId || !stageName) {
      return NextResponse.json(
        { error: "booking_id and stage_name are required" },
        { status: 400 },
      )
    }

    const { data: targetStage, error: stageError } = await context.supabase
      .from("workflow_stages")
      .select("*")
      .ilike("name", stageName)
      .maybeSingle()

    if (stageError) throw stageError
    if (!targetStage) {
      return NextResponse.json(
        { error: `Workflow stage not found: ${stageName}` },
        { status: 404 },
      )
    }

    const { data: workflow, error: workflowError } = await context.supabase
      .from("job_workflows")
      .select("*")
      .eq("booking_id", bookingId)
      .maybeSingle()

    if (workflowError) throw workflowError
    if (!workflow) return NextResponse.json({ data: null })

    if (workflow.current_stage_id === targetStage.id) {
      return NextResponse.json({ data: workflow })
    }

    await context.supabase.from("job_workflow_history").insert({
      job_workflow_id: workflow.id,
      from_stage_id: workflow.current_stage_id,
      to_stage_id: targetStage.id,
      changed_by: context.user.id,
      notes,
    })

    const isClosed = String(targetStage.name).toLowerCase() === "job closed"
    const { data, error } = await context.supabase
      .from("job_workflows")
      .update({
        current_stage_id: targetStage.id,
        completed_at: isClosed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workflow.id)
      .select("*")
      .single()

    if (error) throw error

    await context.supabase.from("audit_logs").insert({
      user_id: context.user.id,
      action: "status_change",
      resource_type: "job_workflow",
      resource_id: workflow.id,
      old_data: { current_stage_id: workflow.current_stage_id },
      new_data: { current_stage_id: targetStage.id, stage_name: targetStage.name },
      ip_address: request.headers.get("x-forwarded-for"),
      user_agent: request.headers.get("user-agent"),
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Move workflow error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to move workflow" },
      { status: 500 },
    )
  }
}
