export type AuditAction =
  | 'login'
  | 'logout'
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'export'
  | 'permission_change'
  | 'role_change'
  | 'status_change'

interface AuditLogPayload {
  action: AuditAction | string
  resource_type: string
  resource_id?: string | null
  old_data?: Record<string, unknown> | null
  new_data?: Record<string, unknown> | null
}

export async function createAuditLog(payload: AuditLogPayload) {
  try {
    const response = await fetch('/api/admin/audit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const result = await response.json().catch(() => null)
      console.error('Failed to create audit log:', result?.error || response.statusText)
    }
  } catch (error) {
    console.error('Failed to create audit log:', error)
  }
}
