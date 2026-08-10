import { NextResponse } from 'next/server'
import { requireAdminContext } from '@/lib/admin-auth'
import {
  buildTestimonialStoragePath,
  GALLERY_IMAGES_BUCKET,
  isAllowedGalleryImageType,
  MAX_GALLERY_IMAGE_SIZE_BYTES,
  TESTIMONIAL_IMAGES_FOLDER,
} from '@/lib/storage'

type UploadRequestFile = {
  name?: unknown
  size?: unknown
  type?: unknown
}

export async function POST(request: Request) {
  try {
    const context = await requireAdminContext()
    if ('error' in context) return context.error

    const body = await request.json()
    const file = (body.file && typeof body.file === 'object' ? body.file : {}) as UploadRequestFile
    const name = String(file.name || '').trim()
    const size = Number(file.size)
    const type = String(file.type || '').trim().toLowerCase()

    if (!name || !Number.isFinite(size) || size <= 0) {
      return NextResponse.json({ error: 'Choose a valid testimonial image.' }, { status: 400 })
    }
    if (!isAllowedGalleryImageType(type) || type === 'image/gif') {
      return NextResponse.json({ error: 'Use a JPEG, PNG, or WebP image.' }, { status: 400 })
    }
    if (size > MAX_GALLERY_IMAGE_SIZE_BYTES) {
      return NextResponse.json({ error: 'The image is too large. Maximum size is 35 MB.' }, { status: 400 })
    }

    const path = buildTestimonialStoragePath(name)
    const { data, error } = await context.supabase.storage
      .from(GALLERY_IMAGES_BUCKET)
      .createSignedUploadUrl(path)

    if (error) throw error
    if (!data?.token) throw new Error('Supabase did not return an upload token.')

    const { data: publicUrlData } = context.supabase.storage
      .from(GALLERY_IMAGES_BUCKET)
      .getPublicUrl(path)

    return NextResponse.json({
      upload: {
        path,
        token: data.token,
        url: publicUrlData.publicUrl,
      },
    })
  } catch (error) {
    console.error('Testimonial signed upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to prepare testimonial image upload.' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await requireAdminContext()
    if ('error' in context) return context.error

    const body = await request.json()
    const path = String(body.path || '').trim()
    if (!path.startsWith(`${TESTIMONIAL_IMAGES_FOLDER}/`)) {
      return NextResponse.json({ success: true })
    }

    const { error } = await context.supabase.storage
      .from(GALLERY_IMAGES_BUCKET)
      .remove([path])

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Testimonial image cleanup error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to clean up testimonial image.' },
      { status: 500 },
    )
  }
}
