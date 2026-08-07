export const DEFAULT_PORTFOLIO_CATEGORIES = [
  { name: 'Wedding', slug: 'wedding', sort_order: 0 },
  { name: 'Portrait', slug: 'portrait', sort_order: 1 },
  { name: 'Event', slug: 'event', sort_order: 2 },
  { name: 'Corporate', slug: 'corporate', sort_order: 3 },
  { name: 'Product', slug: 'product', sort_order: 4 },
  { name: 'Family', slug: 'family', sort_order: 5 },
  { name: 'Maternity', slug: 'maternity', sort_order: 6 },
  { name: 'Newborn', slug: 'newborn', sort_order: 7 },
] as const

const PORTFOLIO_CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function createPortfolioCategorySlug(name: string) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/g, '')
}

export function normalizePortfolioCategorySlug(value: unknown) {
  const slug = String(value || '').trim().toLowerCase()
  if (!slug || slug.length > 64 || !PORTFOLIO_CATEGORY_SLUG_PATTERN.test(slug)) {
    return null
  }
  return slug
}

export function portfolioCategoryNameFromSlug(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
