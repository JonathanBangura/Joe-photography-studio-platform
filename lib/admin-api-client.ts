type AdminDbAction = "insert" | "update" | "delete"

export async function adminDbMutation<T = unknown>(params: {
  table: string
  action: AdminDbAction
  payload?: Record<string, unknown>
  id?: string
  select?: string
}) {
  const response = await fetch("/api/admin/secure-db", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || "Admin action failed")
  }

  return result.data as T
}
