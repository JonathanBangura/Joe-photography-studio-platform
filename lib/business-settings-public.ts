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

  hero_badge: string
  hero_title: string
  hero_highlight: string
  hero_subtitle: string
  hero_primary_button_text: string
  hero_primary_button_link: string
  hero_secondary_button_text: string
  hero_secondary_button_link: string
  hero_background_image: string

  clients_count: string
  years_experience: string
  photos_delivered: string
  awards_count: string

  about_label: string
  about_title: string
  about_story: string
  about_mission: string
  about_vision: string
  about_image: string
  about_floating_title: string
  about_floating_subtitle: string
  about_button_text: string
  about_button_link: string

  cta_badge: string
  cta_title: string
  cta_highlight: string
  cta_subtitle: string
  cta_primary_button_text: string
  cta_primary_button_link: string
  cta_secondary_button_text: string
  cta_secondary_button_link: string
  cta_background_image: string
  cta_trust_1: string
  cta_trust_2: string
  cta_trust_3: string
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

  hero_badge: 'Award-Winning Photography Studio',
  hero_title: 'Capturing Timeless Moments',
  hero_highlight: 'Timeless',
  hero_subtitle:
    'From intimate portraits to grand celebrations, we transform your precious moments into stunning visual stories that last forever.',
  hero_primary_button_text: 'Book a Session',
  hero_primary_button_link: '/booking',
  hero_secondary_button_text: 'View Portfolio',
  hero_secondary_button_link: '/gallery',
  hero_background_image:
    'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?q=80&w=2070&auto=format&fit=crop',

  clients_count: '500+',
  years_experience: '12+',
  photos_delivered: '50k+',
  awards_count: '15+',

  about_label: 'About Joe Studio',
  about_title: 'Passionate About Capturing Your Story',
  about_story:
    'Founded in 2012, Joe Studio has grown from a one-person passion project into a full-service photography studio known for capturing life’s most precious moments with artistry and authenticity.',
  about_mission:
    'Our approach combines technical excellence with a deep understanding of human emotion. We believe every photograph should tell a story, evoke feelings, and stand the test of time.',
  about_vision:
    'Whether it’s the joy of a wedding day, the pride of a professional portrait, or the warmth of a family gathering, we’re dedicated to creating images that you’ll treasure forever.',
  about_image:
    'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?q=80&w=1470&auto=format&fit=crop',
  about_floating_title: '12+ Years',
  about_floating_subtitle: 'Creating timeless memories',
  about_button_text: 'Learn More About Us',
  about_button_link: '/about',

  cta_badge: 'Limited Availability',
  cta_title: 'Ready to Create Something Beautiful?',
  cta_highlight: 'Beautiful',
  cta_subtitle:
    'Let’s discuss your vision and create stunning photographs that you’ll treasure for a lifetime. Book your session today.',
  cta_primary_button_text: 'Book Your Session',
  cta_primary_button_link: '/booking',
  cta_secondary_button_text: 'Get in Touch',
  cta_secondary_button_link: '/contact',
  cta_background_image:
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=2064&auto=format&fit=crop',
  cta_trust_1: 'Quick Response Time',
  cta_trust_2: 'Flexible Scheduling',
  cta_trust_3: 'Satisfaction Guaranteed',
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
