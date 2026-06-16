import { NextRequest, NextResponse } from 'next/server'
import { requireAdminContext } from '@/lib/admin-auth'

function getLegacyRole(studioRole: string) {
  if (studioRole === 'super_admin' || studioRole === 'studio_admin') return 'admin'
  if (studioRole === 'viewer') return 'client'
  return 'staff'
}

function makePassword() {
  return `Studio-${Math.random().toString(36).slice(2, 8)}-${Math.floor(1000 + Math.random() * 9000)}`
}

export async function POST(request: NextRequest) {
  try {
    const context = await requireAdminContext()
    if ("error" in context) return context.error

    const body = await request.json()
    const supabase = context.supabase

    const email = String(body.email || '').trim().toLowerCase()
    const fullName = String(body.full_name || '').trim()
    const password = String(body.password || makePassword())
    const studioRole = String(body.studio_role || 'viewer')

    if (!email || !fullName) {
      return NextResponse.json({ error: 'Full name and email are required.' }, { status: 400 })
    }

    const { data: createdUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: body.phone || null,
        studio_role: studioRole,
        force_password_change: true,
      },
    })

    if (authError) throw authError
    const user = createdUser.user
    if (!user) throw new Error('User was not created')

    const profilePayload = {
      id: user.id,
      email,
      full_name: fullName,
      phone: body.phone || null,
      role: getLegacyRole(studioRole),
      studio_role: studioRole,
      is_active: body.is_active ?? true,
      department: body.department || null,
      hire_date: body.hire_date || null,
      hourly_rate: body.hourly_rate ? Number(body.hourly_rate) : null,
      bio: body.bio || null,
      emergency_contact: body.emergency_contact || null,
      emergency_phone: body.emergency_phone || null,
      updated_at: new Date().toISOString(),
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert(profilePayload)
      .select('*')
      .single()

    if (profileError) throw profileError

    await supabase.from('audit_logs').insert({
      user_id: context.user.id,
      action: 'create_user',
      resource_type: 'profiles',
      resource_id: user.id,
      new_data: { profile, temporary_password_created: true },
      ip_address: request.headers.get('x-forwarded-for'),
      user_agent: request.headers.get('user-agent'),
    })

    return NextResponse.json({ profile, temporary_password: password })
  } catch (error) {
    console.error('Create admin user error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create user' }, { status: 500 })
  }
}
