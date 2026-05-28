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

  if (!profile || (profile.role !== 'admin' && profile.role !== 'staff')) {
    redirect('/portal')
  }

  return (
    <AdminLayoutClient
      user={{
        email: profile.email,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
      }}
    >
      {children}
    </AdminLayoutClient>
  )
}
