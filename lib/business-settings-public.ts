import { createAdminClient } from '@/lib/supabase/admin'

export type PublicBusinessSettings = {
  business_name: string
  tagline: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zip: string
  country: string
  website: string
  social_instagram: string
  social_facebook: string
  social_twitter: string
  working_hours: string
}

export const defaultPublicBusinessSettings: PublicBusinessSettings = {
  business_name: 'Joe Studio',
  tagline: "Capturing life's beautiful moments",
  email: 'hello@joestudio.com',
  phone: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  country: '',
  website: '',
  social_instagram: '',
  social_facebook: '',
  social_twitter: '',
  working_hours: 'Mon - Fri: 9:00 AM - 6:00 PM\nSat: 10:00 AM - 4:00 PM\nSun: By Appointment',
}

export async function getPublicBusinessSettings(): Promise<PublicBusinessSettings> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('business_settings')
    .select('key, value')

  if (error || !data) {
    return defaultPublicBusinessSettings
  }

  const settings: PublicBusinessSettings = {
    ...defaultPublicBusinessSettings,
  }

  data.forEach((item) => {
    const key = item.key as keyof PublicBusinessSettings

    if (key in settings) {
      ;(settings as Record<string, unknown>)[key] = item.value ?? settings[key]
    }
  })

  return settings
}
