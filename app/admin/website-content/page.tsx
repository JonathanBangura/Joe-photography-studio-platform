'use client'

import { useEffect, useState } from 'react'
import { Save, RefreshCw, Home, Info, BarChart3, Megaphone } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  defaultPublicBusinessSettings,
  type PublicBusinessSettings,
} from '@/lib/business-settings-public'

const websiteKeys: Array<keyof PublicBusinessSettings> = [
  'hero_badge',
  'hero_title',
  'hero_highlight',
  'hero_subtitle',
  'hero_primary_button_text',
  'hero_primary_button_link',
  'hero_secondary_button_text',
  'hero_secondary_button_link',
  'hero_background_image',
  'clients_count',
  'years_experience',
  'photos_delivered',
  'awards_count',
  'about_label',
  'about_title',
  'about_story',
  'about_mission',
  'about_vision',
  'about_image',
  'about_floating_title',
  'about_floating_subtitle',
  'about_button_text',
  'about_button_link',
  'cta_badge',
  'cta_title',
  'cta_highlight',
  'cta_subtitle',
  'cta_primary_button_text',
  'cta_primary_button_link',
  'cta_secondary_button_text',
  'cta_secondary_button_link',
  'cta_background_image',
  'cta_trust_1',
  'cta_trust_2',
  'cta_trust_3',
]

export default function WebsiteContentPage() {
  const [settings, setSettings] = useState<PublicBusinessSettings>(
    defaultPublicBusinessSettings,
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchWebsiteContent()
  }, [])

  async function fetchWebsiteContent() {
    setLoading(true)

    try {
      const response = await fetch('/api/admin/website-content', { cache: 'no-store' })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Unable to load website content')
      }

      setSettings({ ...defaultPublicBusinessSettings, ...(result.settings || {}) })
    } catch (error) {
      console.error('Website content load error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load website content')
    } finally {
      setLoading(false)
    }
  }

  async function saveWebsiteContent() {
    setSaving(true)

    try {
      const payload = websiteKeys.reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = settings[key]
        return acc
      }, {})

      const response = await fetch('/api/admin/website-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: payload }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Unable to save website content')
      }

      toast.success('Website content saved successfully')
    } catch (error) {
      console.error('Website content save error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save website content')
    } finally {
      setSaving(false)
    }
  }

  function updateSetting(key: keyof PublicBusinessSettings, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold">Website Content</h1>
          <p className="text-muted-foreground">
            Manage homepage hero, about section, statistics, and CTA text from one place.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchWebsiteContent} disabled={loading || saving}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={saveWebsiteContent} disabled={saving}>
            {saving ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Content
          </Button>
        </div>
      </div>

      <Tabs defaultValue="hero" className="space-y-6">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="hero" className="gap-2"><Home className="h-4 w-4" /> Hero</TabsTrigger>
          <TabsTrigger value="about" className="gap-2"><Info className="h-4 w-4" /> About</TabsTrigger>
          <TabsTrigger value="stats" className="gap-2"><BarChart3 className="h-4 w-4" /> Stats</TabsTrigger>
          <TabsTrigger value="cta" className="gap-2"><Megaphone className="h-4 w-4" /> CTA</TabsTrigger>
        </TabsList>

        <TabsContent value="hero" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Homepage Hero</CardTitle>
              <CardDescription>Controls the first section visitors see on the homepage.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Hero Badge</Label>
                  <Input value={settings.hero_badge} onChange={(e) => updateSetting('hero_badge', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Highlighted Word</Label>
                  <Input value={settings.hero_highlight} onChange={(e) => updateSetting('hero_highlight', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Hero Title</Label>
                <Input value={settings.hero_title} onChange={(e) => updateSetting('hero_title', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Hero Subtitle</Label>
                <Textarea rows={4} value={settings.hero_subtitle} onChange={(e) => updateSetting('hero_subtitle', e.target.value)} />
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Primary Button Text</Label>
                  <Input value={settings.hero_primary_button_text} onChange={(e) => updateSetting('hero_primary_button_text', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Primary Button Link</Label>
                  <Input value={settings.hero_primary_button_link} onChange={(e) => updateSetting('hero_primary_button_link', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Secondary Button Text</Label>
                  <Input value={settings.hero_secondary_button_text} onChange={(e) => updateSetting('hero_secondary_button_text', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Secondary Button Link</Label>
                  <Input value={settings.hero_secondary_button_link} onChange={(e) => updateSetting('hero_secondary_button_link', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Background Image URL</Label>
                <Input value={settings.hero_background_image} onChange={(e) => updateSetting('hero_background_image', e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="about" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>About Section</CardTitle>
              <CardDescription>Controls the homepage and about page story section.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Small Label</Label>
                <Input value={settings.about_label} onChange={(e) => updateSetting('about_label', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>About Title</Label>
                <Input value={settings.about_title} onChange={(e) => updateSetting('about_title', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Story Paragraph</Label>
                <Textarea rows={4} value={settings.about_story} onChange={(e) => updateSetting('about_story', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Mission Paragraph</Label>
                <Textarea rows={4} value={settings.about_mission} onChange={(e) => updateSetting('about_mission', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Vision Paragraph</Label>
                <Textarea rows={4} value={settings.about_vision} onChange={(e) => updateSetting('about_vision', e.target.value)} />
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>About Image URL</Label>
                  <Input value={settings.about_image} onChange={(e) => updateSetting('about_image', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Floating Card Title</Label>
                  <Input value={settings.about_floating_title} onChange={(e) => updateSetting('about_floating_title', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Floating Card Subtitle</Label>
                  <Input value={settings.about_floating_subtitle} onChange={(e) => updateSetting('about_floating_subtitle', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Button Text</Label>
                  <Input value={settings.about_button_text} onChange={(e) => updateSetting('about_button_text', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Button Link</Label>
                  <Input value={settings.about_button_link} onChange={(e) => updateSetting('about_button_link', e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Statistics</CardTitle>
              <CardDescription>These numbers appear in the hero and about sections.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Happy Clients</Label>
                <Input value={settings.clients_count} onChange={(e) => updateSetting('clients_count', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Years Experience</Label>
                <Input value={settings.years_experience} onChange={(e) => updateSetting('years_experience', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Photos Delivered</Label>
                <Input value={settings.photos_delivered} onChange={(e) => updateSetting('photos_delivered', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Awards Won</Label>
                <Input value={settings.awards_count} onChange={(e) => updateSetting('awards_count', e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cta" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Homepage CTA Section</CardTitle>
              <CardDescription>Controls the call-to-action section usually shown near the bottom of public pages.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>CTA Badge</Label>
                  <Input value={settings.cta_badge} onChange={(e) => updateSetting('cta_badge', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Highlighted Word</Label>
                  <Input value={settings.cta_highlight} onChange={(e) => updateSetting('cta_highlight', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>CTA Title</Label>
                <Input value={settings.cta_title} onChange={(e) => updateSetting('cta_title', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>CTA Subtitle</Label>
                <Textarea rows={4} value={settings.cta_subtitle} onChange={(e) => updateSetting('cta_subtitle', e.target.value)} />
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Primary Button Text</Label>
                  <Input value={settings.cta_primary_button_text} onChange={(e) => updateSetting('cta_primary_button_text', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Primary Button Link</Label>
                  <Input value={settings.cta_primary_button_link} onChange={(e) => updateSetting('cta_primary_button_link', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Secondary Button Text</Label>
                  <Input value={settings.cta_secondary_button_text} onChange={(e) => updateSetting('cta_secondary_button_text', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Secondary Button Link</Label>
                  <Input value={settings.cta_secondary_button_link} onChange={(e) => updateSetting('cta_secondary_button_link', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>CTA Background Image URL</Label>
                <Input value={settings.cta_background_image} onChange={(e) => updateSetting('cta_background_image', e.target.value)} />
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Trust Indicator 1</Label>
                  <Input value={settings.cta_trust_1} onChange={(e) => updateSetting('cta_trust_1', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Trust Indicator 2</Label>
                  <Input value={settings.cta_trust_2} onChange={(e) => updateSetting('cta_trust_2', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Trust Indicator 3</Label>
                  <Input value={settings.cta_trust_3} onChange={(e) => updateSetting('cta_trust_3', e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
