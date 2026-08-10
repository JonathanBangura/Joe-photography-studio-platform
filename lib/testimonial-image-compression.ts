export const TESTIMONIAL_IMAGE_TARGET_BYTES = 300 * 1024
export const TESTIMONIAL_IMAGE_MAX_LONG_EDGE = 800

const COMPRESSION_THRESHOLD_BYTES = 300 * 1024
const START_QUALITY = 0.84
const MIN_QUALITY = 0.68
const QUALITY_STEP = 0.04
const OUTPUT_TYPE = 'image/webp'

export type TestimonialImageOptimizationResult = {
  file: File
  originalSize: number
  optimized: boolean
}

type LoadedImage = {
  source: CanvasImageSource
  width: number
  height: number
  dispose: () => void
}

function calculateDimensions(width: number, height: number) {
  const longEdge = Math.max(width, height)
  if (longEdge <= TESTIMONIAL_IMAGE_MAX_LONG_EDGE) return { width, height }

  const scale = TESTIMONIAL_IMAGE_MAX_LONG_EDGE / longEdge
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

function buildWebpFileName(fileName: string) {
  const baseName = fileName.replace(/\.[^/.]+$/, '').trim() || 'testimonial-photo'
  return `${baseName}.webp`
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('The browser could not optimize this image.'))
        if (blob.type !== OUTPUT_TYPE) {
          return reject(new Error('This browser does not support WebP image optimization.'))
        }
        resolve(blob)
      },
      OUTPUT_TYPE,
      quality,
    )
  })
}

async function loadImage(file: File): Promise<LoadedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close(),
      }
    } catch {
      // Fall back for browsers that cannot decode the file with createImageBitmap.
    }
  }

  const objectUrl = URL.createObjectURL(file)
  const image = new window.Image()
  image.decoding = 'async'

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error(`Unable to read ${file.name}.`))
      image.src = objectUrl
    })
  } catch (error) {
    URL.revokeObjectURL(objectUrl)
    throw error
  }

  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    dispose: () => URL.revokeObjectURL(objectUrl),
  }
}

export async function optimizeTestimonialImage(
  file: File,
): Promise<TestimonialImageOptimizationResult> {
  const loaded = await loadImage(file)

  try {
    if (
      file.size <= COMPRESSION_THRESHOLD_BYTES &&
      Math.max(loaded.width, loaded.height) <= TESTIMONIAL_IMAGE_MAX_LONG_EDGE
    ) {
      return { file, originalSize: file.size, optimized: false }
    }

    const dimensions = calculateDimensions(loaded.width, loaded.height)
    const canvas = document.createElement('canvas')
    canvas.width = dimensions.width
    canvas.height = dimensions.height

    const context = canvas.getContext('2d', { alpha: true })
    if (!context) throw new Error('Image optimization is unavailable in this browser.')

    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(loaded.source, 0, 0, dimensions.width, dimensions.height)

    try {
      let quality = START_QUALITY
      let blob = await canvasToBlob(canvas, quality)

      while (blob.size > TESTIMONIAL_IMAGE_TARGET_BYTES && quality - QUALITY_STEP >= MIN_QUALITY) {
        quality = Number((quality - QUALITY_STEP).toFixed(2))
        blob = await canvasToBlob(canvas, quality)
      }

      if (blob.size >= file.size && Math.max(loaded.width, loaded.height) <= TESTIMONIAL_IMAGE_MAX_LONG_EDGE) {
        return { file, originalSize: file.size, optimized: false }
      }

      return {
        file: new File([blob], buildWebpFileName(file.name), {
          type: OUTPUT_TYPE,
          lastModified: file.lastModified,
        }),
        originalSize: file.size,
        optimized: true,
      }
    } finally {
      canvas.width = 1
      canvas.height = 1
    }
  } finally {
    loaded.dispose()
  }
}