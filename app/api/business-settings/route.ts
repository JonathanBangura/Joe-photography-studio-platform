import { NextResponse } from 'next/server'
import { getPublicBusinessSettings } from '@/lib/business-settings-public'

export async function GET() {
  try {
    const settings = await getPublicBusinessSettings()
    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Business settings API error:', error)
    return NextResponse.json(
      { error: 'Unable to load business settings' },
      { status: 500 },
    )
  }
}
