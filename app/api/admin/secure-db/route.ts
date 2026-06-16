import { NextResponse } from "next/server"
import { requireAdminContext } from "@/lib/admin-auth"

const TABLES: Record<
  string,
  {
    actions: Array<"insert" | "update" | "delete">
    defaultSelect?: string
  }
> = {
  bookings: {
    actions: ["update", "delete"],
    defaultSelect:
      "*, service:services(*), client:clients(*, profile:profiles(*)), staff:profiles(*), resource:studio_resources(*), invoice:invoices(*, payments(*))",
  },
  clients: {
    actions: ["insert", "update", "delete"],
    defaultSelect: "*, profile:profiles(*)",
  },
  services: {
    actions: ["insert", "update", "delete"],
    defaultSelect: "*",
  },
  gallery: {
    actions: ["insert", "update", "delete"],
    defaultSelect: "*",
  },
  profiles: {
    actions: ["update"],
    defaultSelect: "*",
  },
  invoices: {
    actions: ["update"],
    defaultSelect:
      "*, client:clients(*, profile:profiles(full_name, email)), booking:bookings(*, service:services(name)), payments(*)",
  },
  role_permissions: {
    actions: ["insert", "update"],
    defaultSelect: "*",
  },
  expenses: {
    actions: ["insert", "update", "delete"],
    defaultSelect: "*, category:expense_categories(*), creator:profiles!expenses_created_by_fkey(full_name), approver:profiles!expenses_approved_by_fkey(full_name)",
  },
  equipment: {
    actions: ["insert", "update", "delete"],
    defaultSelect: "*, category:equipment_categories(*), assignee:profiles(full_name)",
  },
  equipment_maintenance: {
    actions: ["insert", "update", "delete"],
    defaultSelect: "*, equipment:equipment(name)",
  },
  time_off_requests: {
    actions: ["insert", "update", "delete"],
    defaultSelect: "*",
  },
  job_workflows: {
    actions: ["insert", "update", "delete"],
    defaultSelect: "*, booking:bookings(*, client:clients(*), service:services(*)), stage:workflow_stages(*)",
  },
  job_workflow_history: {
    actions: ["insert"],
    defaultSelect: "*",
  },
}

function cleanPayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

export async function POST(request: Request) {
  try {
    const context = await requireAdminContext()
    if ("error" in context) return context.error

    const body = await request.json()
    const table = String(body.table || "")
    const action = String(body.action || "") as "insert" | "update" | "delete"
    const config = TABLES[table]

    if (!config || !config.actions.includes(action)) {
      return NextResponse.json(
        { error: "This admin action is not allowed" },
        { status: 400 },
      )
    }

    const id = body.id ? String(body.id) : ""
    const payload = cleanPayload(body.payload)
    if (table === "expenses" && action === "insert" && !payload.created_by) {
      payload.created_by = context.user.id
    }
    if (
      table === "expenses" &&
      action === "update" &&
      payload.status === "approved" &&
      !payload.approved_by
    ) {
      payload.approved_by = context.user.id
    }
    if (
      table === "time_off_requests" &&
      action === "update" &&
      !payload.approved_by
    ) {
      payload.approved_by = context.user.id
    }
    if (
      table === "job_workflow_history" &&
      action === "insert" &&
      !payload.changed_by
    ) {
      payload.changed_by = context.user.id
    }
    const select = String(body.select || config.defaultSelect || "*")
    const now = new Date().toISOString()
    let data = null

    if (action === "insert") {
      const { data: created, error } = await context.supabase
        .from(table)
        .insert(payload)
        .select(select)
        .single()

      if (error) throw error
      data = created
    }

    if (action === "update") {
      if (!id) {
        return NextResponse.json({ error: "Record ID is required" }, { status: 400 })
      }

      const { data: updated, error } = await context.supabase
        .from(table)
        .update({ ...payload, updated_at: payload.updated_at || now })
        .eq("id", id)
        .select(select)
        .single()

      if (error) throw error
      data = updated
    }

    if (action === "delete") {
      if (!id) {
        return NextResponse.json({ error: "Record ID is required" }, { status: 400 })
      }

      const { data: deleted, error } = await context.supabase
        .from(table)
        .delete()
        .eq("id", id)
        .select(select)
        .maybeSingle()

      if (error) throw error
      data = deleted
    }

    await context.supabase.from("audit_logs").insert({
      user_id: context.user.id,
      action: `admin_${action}`,
      resource_type: table,
      resource_id: id || data?.id || null,
      new_data: action === "delete" ? null : data,
      old_data: action === "delete" ? data : null,
      ip_address: request.headers.get("x-forwarded-for"),
      user_agent: request.headers.get("user-agent"),
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Secure admin DB action error:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Admin action failed",
      },
      { status: 500 },
    )
  }
}
