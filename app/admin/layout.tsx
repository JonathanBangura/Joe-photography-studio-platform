import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminLayoutClient } from '@/components/admin/admin-layout-client'
import { isBackOfficeStudioRole } from '@/lib/permissions'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Check if user is an active back-office user
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.is_active === false) {
    redirect('/auth/login')
  }

  const studioRole = profile.studio_role || 'viewer'

  // Admin access is controlled only by profiles.studio_role.
  // The legacy profiles.role column is kept for client/staff labels and must not grant access.
  if (!isBackOfficeStudioRole(studioRole)) {
    redirect('/portal')
  }

  return (
    <AdminLayoutClient
      user={{
        email: profile.email || user.email,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        studio_role: studioRole,
      }}
    >
      {children}
    </AdminLayoutClient>
  )
}
