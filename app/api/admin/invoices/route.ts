import { NextResponse } from "next/server"
import { requireAdminContext } from "@/lib/admin-auth"

export async function GET() {
  try {
    const context = await requireAdminContext()
    if ("error" in context) return context.error

    const { data, error } = await context.supabase
      .from("invoices")
      .select(`
        *,
        client:clients(*, profile:profiles(full_name, email)),
        booking:bookings(*, service:services(name)),
        payments(*)
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error("Admin invoices load error:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load invoices",
      },
      { status: 500 },
    )
  }
}
