export function generateGalleryAccessCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function formatGalleryAccessLink(accessCode: string, origin?: string) {
  const baseUrl = origin || ''
  return `${baseUrl}/gallery/${accessCode}`
}

export function getGalleryTitle(clientName?: string | null, bookingReference?: string | null) {
  const safeClientName = clientName?.trim() || 'Client'
  const safeReference = bookingReference?.trim() || new Date().toISOString().slice(0, 10)
  return `${safeClientName} Gallery - ${safeReference}`
}
