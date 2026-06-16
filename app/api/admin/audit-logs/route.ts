import { NextResponse } from "next/server"
import { requireAdminContext } from "@/lib/admin-auth"

export async function POST(request: Request) {
  try {
    const context = await requireAdminContext()
    if ("error" in context) return context.error

    const body = await request.json()

    const { error } = await context.supabase.from("audit_logs").insert({
      user_id: context.user.id,
      action: body.action,
      resource_type: body.resource_type,
      resource_id: body.resource_id ?? null,
      old_data: body.old_data ?? null,
      new_data: body.new_data ?? null,
      ip_address: request.headers.get("x-forwarded-for"),
      user_agent: request.headers.get("user-agent"),
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Admin audit log error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to write audit log" },
      { status: 500 },
    )
  }
}
