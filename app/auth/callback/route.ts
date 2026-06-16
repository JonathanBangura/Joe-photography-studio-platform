import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isBackOfficeStudioRole } from '@/lib/permissions'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin
  const redirectTo = requestUrl.searchParams.get('redirect_to')?.toString()

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Check if profile exists, if not create one
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (!existingProfile) {
        // Create profile from user metadata
        await supabase.from('profiles').insert({
          id: data.user.id,
          email: data.user.email!,
          full_name: data.user.user_metadata?.full_name || null,
          phone: data.user.user_metadata?.phone || null,
          role: 'client',
          studio_role: 'viewer',
          is_active: true,
        })

        // If user is a client, also create client record
        if (data.user.user_metadata?.role === 'client' || !data.user.user_metadata?.role) {
          await supabase.from('clients').insert({
            profile_id: data.user.id,
            full_name: data.user.user_metadata?.full_name || data.user.email || null,
            email: data.user.email || null,
            phone: data.user.user_metadata?.phone || null,
            preferred_contact: data.user.user_metadata?.phone ? 'phone' : 'email',
          })
        }
      }

      // Check role for redirect
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, studio_role, is_active')
        .eq('id', data.user.id)
        .single()

      const isBackOfficeUser = profile?.is_active !== false && isBackOfficeStudioRole(profile?.studio_role)

      if (redirectTo) {
        if (redirectTo.startsWith('/admin') && !isBackOfficeUser) {
          return NextResponse.redirect(`${origin}/portal`)
        }

        return NextResponse.redirect(`${origin}${redirectTo}`)
      }

      if (isBackOfficeUser) {
        return NextResponse.redirect(`${origin}/admin`)
      }

      return NextResponse.redirect(`${origin}/portal`)
    }
  }

  // Auth code error - redirect to error page
  return NextResponse.redirect(`${origin}/auth/error`)
}
