import Link from 'next/link'
import { Mail, Phone, UserRound } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getPortalSession } from '@/lib/portal-data'

export default async function PortalSettingsPage() {
  const { user, profile, client } = await getPortalSession()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground">Review the contact details connected to your client portal.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5" />Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Full Name</p>
            <p className="font-semibold">{profile?.full_name || client?.full_name || 'Not set'}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-semibold">{profile?.email || client?.email || user.email || 'Not set'}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Phone</p>
            <p className="font-semibold">{profile?.phone || client?.phone || 'Not set'}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Preferred Contact</p>
            <p className="font-semibold capitalize">{client?.preferred_contact || 'Not set'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Need to change your details?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            To protect your booking, payment, and gallery records, profile changes are currently handled by the studio team.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild><Link href="/contact"><Mail className="mr-2 h-4 w-4" />Contact Studio</Link></Button>
            <Button asChild variant="outline"><Link href="/booking"><Phone className="mr-2 h-4 w-4" />Book Another Session</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
