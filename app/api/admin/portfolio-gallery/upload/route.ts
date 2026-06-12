import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'gallery-images'
const FOLDER = 'portfolio'
const MAX_FILE_SIZE = 35 * 1024 * 1024 // 35MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'])

function safeFileName(name: string) {
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return cleanName || 'portfolio-image.jpg'
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Image file is required.' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Only JPG, PNG, WEBP, and GIF images are allowed.' },
        { status: 400 },
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'Image must not be larger than 35MB.' },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()
    const extension = safeFileName(file.name).split('.').pop() || 'jpg'
    const path = `${FOLDER}/${Date.now()}-${crypto.randomUUID()}.${extension}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) throw uploadError

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path)

    await supabase.from('audit_logs').insert({
      action: 'upload_portfolio_image',
      resource_type: 'gallery',
      new_data: {
        bucket: BUCKET,
        path,
        url: publicUrlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
      },
      ip_address: request.headers.get('x-forwarded-for'),
      user_agent: request.headers.get('user-agent'),
    })

    return NextResponse.json({
      success: true,
      url: publicUrlData.publicUrl,
      path,
    })
  } catch (error) {
    console.error('Portfolio upload error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload portfolio image.',
      },
      { status: 500 },
    )
  }
}
