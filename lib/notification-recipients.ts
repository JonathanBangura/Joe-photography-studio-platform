import { parseEmailList, uniqueEmails } from '@/lib/mail'
import { createAdminClient } from '@/lib/supabase/admin'

const DEFAULT_NOTIFICATION_ROLES = [
  'super_admin',
  'studio_admin',
  'studio_manager',
  'receptionist',
  'marketing_manager',
]

async function getBusinessEmail(supabase: ReturnType<typeof createAdminClient>) {
  const { data } = await supabase
    .from('business_settings')
    .select('value')
    .eq('key', 'email')
    .maybeSingle()

  return data?.value ? String(data.value) : ''
}

async function getSetting(supabase: ReturnType<typeof createAdminClient>, key: string) {
  const { data } = await supabase
    .from('business_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle()

  return data?.value
}

function normalizeSettingEmails(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean)
  }

  return parseEmailList(typeof value === 'string' ? value : '')
}

export async function getInternalNotificationRecipients(
  supabase: ReturnType<typeof createAdminClient>,
  roles = DEFAULT_NOTIFICATION_ROLES,
) {
  const emailNotifications = await getSetting(supabase, 'email_notifications')

  if (emailNotifications === false) {
    return []
  }

  const settingsRecipients = normalizeSettingEmails(
    await getSetting(supabase, 'notification_recipient_emails'),
  )
  const envRecipients = [
    ...parseEmailList(process.env.STUDIO_NOTIFICATION_EMAILS),
    ...parseEmailList(process.env.STUDIO_NOTIFICATION_EMAIL),
  ]

  let adminRecipients: string[] = []

  const { data, error } = await supabase
    .from('profiles')
    .select('email, studio_role, is_active')
    .eq('is_active', true)
    .in('studio_role', roles)

  if (!error) {
    adminRecipients = (data || [])
      .map((profile) => String(profile.email || '').trim())
      .filter(Boolean)
  }

  return uniqueEmails([
    ...settingsRecipients,
    ...envRecipients,
    ...adminRecipients,
    await getBusinessEmail(supabase),
    process.env.SMTP_USER,
  ])
}
