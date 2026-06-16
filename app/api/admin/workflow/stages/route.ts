import { NextResponse } from "next/server"
import { requireAdminContext } from "@/lib/admin-auth"

const DEFAULT_WORKFLOW_STAGES = [
  { name: "Booking Received", description: "Booking has been created and is awaiting confirmation.", color: "#F59E0B", sort_order: 1 },
  { name: "Deposit Paid", description: "Client deposit has been received.", color: "#3B82F6", sort_order: 2 },
  { name: "Shoot Scheduled", description: "Session has been confirmed and scheduled.", color: "#8B5CF6", sort_order: 3 },
  { name: "Shoot Completed", description: "Photo session has been completed.", color: "#06B6D4", sort_order: 4 },
  { name: "Photos Uploaded", description: "Photo previews have been uploaded.", color: "#14B8A6", sort_order: 5 },
  { name: "Customer Selection", description: "Client is selecting preferred photos.", color: "#6366F1", sort_order: 6 },
  { name: "Editing In Progress", description: "Selected photos are being edited.", color: "#F97316", sort_order: 7 },
  { name: "Final Delivery", description: "Final edited photos are ready for delivery.", color: "#22C55E", sort_order: 8 },
  { name: "Job Closed", description: "Job has been completed and closed.", color: "#10B981", sort_order: 9 },
]

export async function GET() {
  try {
    const context = await requireAdminContext()
    if ("error" in context) return context.error

    const { data: existingStages, error } = await context.supabase
      .from("workflow_stages")
      .select("id, name, sort_order")

    if (error) throw error

    const existingNames = new Set(
      (existingStages || []).map((stage) => String(stage.name).toLowerCase()),
    )
    const missingStages = DEFAULT_WORKFLOW_STAGES.filter(
      (stage) => !existingNames.has(stage.name.toLowerCase()),
    )

    if (missingStages.length > 0) {
      const { error: insertError } = await context.supabase
        .from("workflow_stages")
        .insert(missingStages)

      if (insertError) throw insertError
    }

    const { data: stages, error: reloadError } = await context.supabase
      .from("workflow_stages")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")

    if (reloadError) throw reloadError

    return NextResponse.json({ data: stages || [] })
  } catch (error) {
    console.error("Workflow stage load error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load workflow stages" },
      { status: 500 },
    )
  }
}
