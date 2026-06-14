import { PortalLayoutClient } from '@/components/portal/portal-layout-client'
import { getPortalSession } from '@/lib/portal-data'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getPortalSession()

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
