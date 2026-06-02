import { createClient } from '@/lib/supabase/client'

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
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from('audit_logs').insert({
    user_id: user?.id ?? null,
    action: payload.action,
    resource_type: payload.resource_type,
    resource_id: payload.resource_id ?? null,
    old_data: payload.old_data ?? null,
    new_data: payload.new_data ?? null,
    ip_address: null,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  })

  if (error) {
    console.error('Failed to create audit log:', error)
  }
}
