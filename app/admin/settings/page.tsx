'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Settings,
  Building2,
  Bell,
  Mail,
  Globe,
  Palette,
  Shield,
  Save,
  RefreshCw,
  Camera,
  Clock,
  DollarSign,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'

type BusinessSettings = {
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
  timezone: string
  currency: string
  base_currency: string
  local_currency: string
  payment_currency: string
  usd_to_sle_rate: number
  price_display_mode: 'usd_only' | 'sle_only' | 'both'
  tax_rate: number
  booking_notice_hours: number
  cancellation_hours: number
  deposit_percentage: number
  email_notifications: boolean
  sms_notifications: boolean
  auto_confirm_bookings: boolean
  require_deposit: boolean
  send_reminders: boolean
  reminder_hours: number
  invoice_prefix: string
  invoice_notes: string
  contract_template: string
}

const defaultSettings: BusinessSettings = {
  business_name: 'Joe Studio',
  tagline: 'Capturing Life\'s Beautiful Moments',
  email: 'hello@joestudio.com',
  phone: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  country: 'United States',
  website: '',
  social_instagram: '',
  social_facebook: '',
  social_twitter: '',
  timezone: 'America/New_York',
  currency: 'USD',
  base_currency: 'USD',
  local_currency: 'SLE',
  payment_currency: 'SLE',
  usd_to_sle_rate: 24,
  price_display_mode: 'both',
  tax_rate: 0,
  booking_notice_hours: 24,
  cancellation_hours: 48,
  deposit_percentage: 25,
  email_notifications: true,
  sms_notifications: false,
  auto_confirm_bookings: false,
  require_deposit: true,
  send_reminders: true,
  reminder_hours: 24,
  invoice_prefix: 'INV-',
  invoice_notes: '',
  contract_template: '',
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<BusinessSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    setLoading(true)

    try {
      const response = await fetch('/api/business-settings', {
        cache: 'no-store',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Unable to load settings')
      }

      setSettings({
        ...defaultSettings,
        ...(result.settings || {}),
      })
    } catch (error) {
      console.error('Settings load error:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings() {
    setSaving(true)

    try {
      const response = await fetch('/api/business-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save settings')
      }

      setSettings({
        ...defaultSettings,
        ...(result.settings || settings),
      })

      toast.success('Settings saved successfully')
    } catch (error) {
      console.error('Settings save error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (key: keyof BusinessSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your studio settings and preferences</p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList className="bg-background/50 border border-border/50 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="business" className="gap-2">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Business</span>
          </TabsTrigger>
          <TabsTrigger value="booking" className="gap-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Booking</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <DollarSign className="w-4 h-4" />
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">Branding</span>
          </TabsTrigger>
        </TabsList>

        {/* Business Settings */}
        <TabsContent value="business" className="space-y-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Business Information
              </CardTitle>
              <CardDescription>Your studio&apos;s basic information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="business_name">Business Name</Label>
                  <Input
                    id="business_name"
                    value={settings.business_name}
                    onChange={(e) => updateSetting('business_name', e.target.value)}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    value={settings.tagline}
                    onChange={(e) => updateSetting('tagline', e.target.value)}
                    className="bg-background/50"
                  />
                </div>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Business Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email}
                    onChange={(e) => updateSetting('email', e.target.value)}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={settings.phone}
                    onChange={(e) => updateSetting('phone', e.target.value)}
                    className="bg-background/50"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={settings.address}
                  onChange={(e) => updateSetting('address', e.target.value)}
                  className="bg-background/50"
                />
              </div>
              <div className="grid gap-6 sm:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={settings.city}
                    onChange={(e) => updateSetting('city', e.target.value)}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={settings.state}
                    onChange={(e) => updateSetting('state', e.target.value)}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input
                    id="zip"
                    value={settings.zip}
                    onChange={(e) => updateSetting('zip', e.target.value)}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={settings.country}
                    onChange={(e) => updateSetting('country', e.target.value)}
                    className="bg-background/50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Online Presence
              </CardTitle>
              <CardDescription>Website and social media links</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="website">Website URL</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://yourwebsite.com"
                  value={settings.website}
                  onChange={(e) => updateSetting('website', e.target.value)}
                  className="bg-background/50"
                />
              </div>
              <div className="grid gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    placeholder="@username"
                    value={settings.social_instagram}
                    onChange={(e) => updateSetting('social_instagram', e.target.value)}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    placeholder="Page URL or username"
                    value={settings.social_facebook}
                    onChange={(e) => updateSetting('social_facebook', e.target.value)}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitter">Twitter / X</Label>
                  <Input
                    id="twitter"
                    placeholder="@username"
                    value={settings.social_twitter}
                    onChange={(e) => updateSetting('social_twitter', e.target.value)}
                    className="bg-background/50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Booking Settings */}
        <TabsContent value="booking" className="space-y-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Booking Policies
              </CardTitle>
              <CardDescription>Configure booking rules and policies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={settings.timezone}
                    onValueChange={(value) => updateSetting('timezone', value)}
                  >
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notice">Minimum Notice (hours)</Label>
                  <Input
                    id="notice"
                    type="number"
                    min="0"
                    value={settings.booking_notice_hours}
                    onChange={(e) => updateSetting('booking_notice_hours', parseInt(e.target.value) || 0)}
                    className="bg-background/50"
                  />
                </div>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cancellation">Cancellation Window (hours)</Label>
                  <Input
                    id="cancellation"
                    type="number"
                    min="0"
                    value={settings.cancellation_hours}
                    onChange={(e) => updateSetting('cancellation_hours', parseInt(e.target.value) || 0)}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit">Deposit Percentage (%)</Label>
                  <Input
                    id="deposit"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.deposit_percentage}
                    onChange={(e) => updateSetting('deposit_percentage', parseInt(e.target.value) || 0)}
                    className="bg-background/50"
                  />
                </div>
              </div>
              <div className="space-y-4 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto-confirm Bookings</p>
                    <p className="text-sm text-muted-foreground">Automatically confirm new bookings</p>
                  </div>
                  <Switch
                    checked={settings.auto_confirm_bookings}
                    onCheckedChange={(checked) => updateSetting('auto_confirm_bookings', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Require Deposit</p>
                    <p className="text-sm text-muted-foreground">Require deposit payment for bookings</p>
                  </div>
                  <Switch
                    checked={settings.require_deposit}
                    onCheckedChange={(checked) => updateSetting('require_deposit', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Settings */}
        <TabsContent value="billing" className="space-y-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Billing & Invoicing
              </CardTitle>
              <CardDescription>Configure billing and invoice settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border p-4 space-y-4">
                <div>
                  <h3 className="font-semibold">Currency & Exchange Rate</h3>
                  <p className="text-sm text-muted-foreground">Service prices are stored in USD. Vult payments will always be processed in SLE.</p>
                </div>

                <div className="grid gap-6 sm:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="base_currency">Base Currency</Label>
                    <Input id="base_currency" value={settings.base_currency} readOnly className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="local_currency">Local Currency</Label>
                    <Input id="local_currency" value={settings.local_currency} onChange={(e) => updateSetting('local_currency', e.target.value.toUpperCase())} className="bg-background/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment_currency">Payment Currency</Label>
                    <Input id="payment_currency" value={settings.payment_currency} readOnly className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="usd_to_sle_rate">USD → SLE Rate</Label>
                    <Input
                      id="usd_to_sle_rate"
                      type="number"
                      min="1"
                      step="0.01"
                      value={settings.usd_to_sle_rate}
                      onChange={(e) => updateSetting('usd_to_sle_rate', parseFloat(e.target.value) || 24)}
                      className="bg-background/50"
                    />
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="price_display_mode">Public Price Display</Label>
                    <Select value={settings.price_display_mode} onValueChange={(value) => updateSetting('price_display_mode', value)}>
                      <SelectTrigger className="bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="usd_only">USD Only</SelectItem>
                        <SelectItem value="sle_only">SLE Only</SelectItem>
                        <SelectItem value="both">USD + SLE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4 text-sm">
                    <p className="font-medium">Example</p>
                    <p className="text-muted-foreground">$100 × {settings.usd_to_sle_rate || 24} = SLE {Number(100 * Number(settings.usd_to_sle_rate || 24)).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="currency">Legacy Invoice Currency</Label>
                  <Input id="currency" value={settings.currency} readOnly className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                  <Input
                    id="tax_rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.tax_rate}
                    onChange={(e) => updateSetting('tax_rate', parseFloat(e.target.value) || 0)}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice_prefix">Invoice Prefix</Label>
                  <Input
                    id="invoice_prefix"
                    value={settings.invoice_prefix}
                    onChange={(e) => updateSetting('invoice_prefix', e.target.value)}
                    className="bg-background/50"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice_notes">Default Invoice Notes</Label>
                <Textarea
                  id="invoice_notes"
                  rows={3}
                  placeholder="Notes to appear on all invoices..."
                  value={settings.invoice_notes}
                  onChange={(e) => updateSetting('invoice_notes', e.target.value)}
                  className="bg-background/50"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Configure how and when notifications are sent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive email notifications for bookings and updates</p>
                  </div>
                  <Switch
                    checked={settings.email_notifications}
                    onCheckedChange={(checked) => updateSetting('email_notifications', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">SMS Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive SMS notifications (additional charges may apply)</p>
                  </div>
                  <Switch
                    checked={settings.sms_notifications}
                    onCheckedChange={(checked) => updateSetting('sms_notifications', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Send Booking Reminders</p>
                    <p className="text-sm text-muted-foreground">Automatically send reminders before sessions</p>
                  </div>
                  <Switch
                    checked={settings.send_reminders}
                    onCheckedChange={(checked) => updateSetting('send_reminders', checked)}
                  />
                </div>
              </div>
              {settings.send_reminders && (
                <div className="space-y-2 pt-4 border-t border-border/50">
                  <Label htmlFor="reminder_hours">Reminder Time (hours before session)</Label>
                  <Input
                    id="reminder_hours"
                    type="number"
                    min="1"
                    value={settings.reminder_hours}
                    onChange={(e) => updateSetting('reminder_hours', parseInt(e.target.value) || 24)}
                    className="bg-background/50 max-w-[200px]"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Settings */}
        <TabsContent value="branding" className="space-y-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Branding & Appearance
              </CardTitle>
              <CardDescription>Customize your studio&apos;s visual identity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Camera className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Custom branding options coming soon</p>
                <p className="text-sm text-muted-foreground/70">Upload logos, customize colors, and more</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
