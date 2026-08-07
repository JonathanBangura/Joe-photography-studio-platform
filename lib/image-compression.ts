export const PORTFOLIO_COMPRESSION_THRESHOLD_BYTES = 700 * 1024
export const PORTFOLIO_COMPRESSION_TARGET_BYTES = 900 * 1024
export const PORTFOLIO_MAX_LONG_EDGE = 2400

const PORTFOLIO_MIN_LONG_EDGE = 1600
const PORTFOLIO_START_QUALITY = 0.82
const PORTFOLIO_MIN_QUALITY = 0.72
const PORTFOLIO_QUALITY_STEP = 0.04
const PORTFOLIO_OUTPUT_TYPE = 'image/webp'

export type PortfolioImageOptimizationReason =
  | 'optimized'
  | 'already-optimized'
  | 'animated-gif'
  | 'not-smaller'

export type PortfolioImageOptimizationResult = {
  file: File
  originalSize: number
  originalWidth: number
  originalHeight: number
  outputWidth: number
  outputHeight: number
  quality: number | null
  optimized: boolean
  reason: PortfolioImageOptimizationReason
}

type LoadedImage = {
  source: CanvasImageSource
  width: number
  height: number
  dispose: () => void
}

type EncodedImage = {
  blob: Blob
  width: number
  height: number
  quality: number
}

function calculateDimensions(width: number, height: number, maxLongEdge: number) {
  const longEdge = Math.max(width, height)
  if (longEdge <= maxLongEdge) return { width, height }

  const scale = maxLongEdge / longEdge
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

function buildWebpFileName(fileName: string) {
  const baseName = fileName.replace(/\.[^/.]+$/, '').trim() || 'portfolio-photo'
  return `${baseName}.webp`
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('The browser could not compress this image.'))
          return
        }
        if (blob.type !== PORTFOLIO_OUTPUT_TYPE) {
          reject(new Error('This browser does not support WebP image compression.'))
          return
        }
        resolve(blob)
      },
      PORTFOLIO_OUTPUT_TYPE,
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
      // Fall back to an HTML image for browsers that cannot decode this file with createImageBitmap.
    }
  }

  const objectUrl = URL.createObjectURL(file)
  const image = new window.Image()
  image.decoding = 'async'
  const imageLoaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error(`Unable to read ${file.name}.`))
  })
  image.src = objectUrl

  try {
    await imageLoaded
  } catch (error) {
    URL.revokeObjectURL(objectUrl)
    throw error
  }

  if (!image.naturalWidth || !image.naturalHeight) {
    URL.revokeObjectURL(objectUrl)
    throw new Error(`Unable to read the dimensions of ${file.name}.`)
  }

  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    dispose: () => URL.revokeObjectURL(objectUrl),
  }
}

async function encodeAtDimensions(
  source: CanvasImageSource,
  width: number,
  height: number,
): Promise<EncodedImage> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d', { alpha: true })
  if (!context) throw new Error('Image compression is unavailable in this browser.')

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(source, 0, 0, width, height)

  try {
    let quality = PORTFOLIO_START_QUALITY
    let blob = await canvasToBlob(canvas, quality)

    while (
      blob.size > PORTFOLIO_COMPRESSION_TARGET_BYTES &&
      quality - PORTFOLIO_QUALITY_STEP >= PORTFOLIO_MIN_QUALITY
    ) {
      quality = Number((quality - PORTFOLIO_QUALITY_STEP).toFixed(2))
      blob = await canvasToBlob(canvas, quality)
    }

    return { blob, width, height, quality }
  } finally {
    canvas.width = 1
    canvas.height = 1
  }
}

export async function optimizePortfolioImage(
  file: File,
): Promise<PortfolioImageOptimizationResult> {
  const loaded = await loadImage(file)

  try {
    const originalLongEdge = Math.max(loaded.width, loaded.height)

    if (file.type === 'image/gif') {
      return {
        file,
        originalSize: file.size,
        originalWidth: loaded.width,
        originalHeight: loaded.height,
        outputWidth: loaded.width,
        outputHeight: loaded.height,
        quality: null,
        optimized: false,
        reason: 'animated-gif',
      }
    }

    if (
      file.size <= PORTFOLIO_COMPRESSION_THRESHOLD_BYTES &&
      originalLongEdge <= PORTFOLIO_MAX_LONG_EDGE
    ) {
      return {
        file,
        originalSize: file.size,
        originalWidth: loaded.width,
        originalHeight: loaded.height,
        outputWidth: loaded.width,
        outputHeight: loaded.height,
        quality: null,
        optimized: false,
        reason: 'already-optimized',
      }
    }

    let dimensions = calculateDimensions(
      loaded.width,
      loaded.height,
      PORTFOLIO_MAX_LONG_EDGE,
    )
    let encoded = await encodeAtDimensions(loaded.source, dimensions.width, dimensions.height)

    while (
      encoded.blob.size > PORTFOLIO_COMPRESSION_TARGET_BYTES &&
      Math.max(dimensions.width, dimensions.height) > PORTFOLIO_MIN_LONG_EDGE
    ) {
      const currentLongEdge = Math.max(dimensions.width, dimensions.height)
      const nextLongEdge = Math.max(
        PORTFOLIO_MIN_LONG_EDGE,
        Math.round(currentLongEdge * 0.88),
      )
      dimensions = calculateDimensions(dimensions.width, dimensions.height, nextLongEdge)
      encoded = await encodeAtDimensions(loaded.source, dimensions.width, dimensions.height)
    }

    if (encoded.blob.size >= file.size && originalLongEdge <= PORTFOLIO_MAX_LONG_EDGE) {
      return {
        file,
        originalSize: file.size,
        originalWidth: loaded.width,
        originalHeight: loaded.height,
        outputWidth: loaded.width,
        outputHeight: loaded.height,
        quality: null,
        optimized: false,
        reason: 'not-smaller',
      }
    }

    const optimizedFile = new File([encoded.blob], buildWebpFileName(file.name), {
      type: PORTFOLIO_OUTPUT_TYPE,
      lastModified: file.lastModified,
    })

    return {
      file: optimizedFile,
      originalSize: file.size,
      originalWidth: loaded.width,
      originalHeight: loaded.height,
      outputWidth: encoded.width,
      outputHeight: encoded.height,
      quality: encoded.quality,
      optimized: true,
      reason: 'optimized',
    }
  } finally {
    loaded.dispose()
  }
}