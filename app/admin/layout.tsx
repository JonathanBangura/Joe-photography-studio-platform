import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminLayoutClient } from '@/components/admin/admin-layout-client'

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

  // Check if user is admin or staff
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const studioRole = profile?.studio_role || (profile?.role === 'admin' ? 'studio_admin' : profile?.role === 'staff' ? 'studio_manager' : 'viewer')

  // Allow back-office users into admin. Client-only users stay in the client portal.
  if (!profile || (profile.role === 'client' && studioRole === 'viewer')) {
    redirect('/portal')
  }

  return (
    <AdminLayoutClient
      user={{
        email: profile.email,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        studio_role: studioRole,
      }}
    >
      {children}
    </AdminLayoutClient>
  )
}
