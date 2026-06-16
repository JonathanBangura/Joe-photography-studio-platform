import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const authSupabase = await createClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
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
