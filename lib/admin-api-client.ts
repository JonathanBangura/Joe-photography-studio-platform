type AdminDbAction = "insert" | "update" | "delete" | "upsert"

export async function adminDbMutation<T = unknown>(params: {
  table: string
  action: AdminDbAction
  payload?: Record<string, unknown> | Record<string, unknown>[]
  id?: string
  select?: string
  onConflict?: string
}) {
  const response = await fetch("/api/admin/secure-db", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })

  const result = await response.json().catch(() => ({ error: response.statusText }))

  if (!response.ok) {
    throw new Error(result.error || "Admin action failed")
  }

  return result.data as T
}
