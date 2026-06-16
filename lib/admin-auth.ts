import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { isBackOfficeStudioRole } from "@/lib/permissions"

export async function requireAdminContext() {
  const authSupabase = await createClient()
  const {
    data: { user },
  } = await authSupabase.auth.getUser()

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  const supabase = createAdminClient()
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, role, studio_role, is_active")
    .eq("id", user.id)
    .maybeSingle()

  if (error) throw error

  const studioRole = String(profile?.studio_role || "")
  const isAllowed =
    profile?.is_active !== false &&
    isBackOfficeStudioRole(studioRole)

  if (!isAllowed) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    }
  }

  return { user, profile, supabase }
}
