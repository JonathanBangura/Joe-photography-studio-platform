import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PortalLayoutClient } from '@/components/portal/portal-layout-client'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // If user is admin/staff, redirect to admin
  if (profile?.role === 'admin' || profile?.role === 'staff') {
    redirect('/admin')
  }

  return (
    <PortalLayoutClient
      user={{
        email: profile?.email || user.email || '',
        full_name: profile?.full_name,
        avatar_url: profile?.avatar_url,
      }}
    >
      {children}
    </PortalLayoutClient>
  )
}
