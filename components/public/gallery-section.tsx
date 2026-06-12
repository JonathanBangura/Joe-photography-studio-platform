'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type GalleryItem = {
  id: string
  title: string
  description?: string | null
  session_type?: string | null
  image_url: string
  is_featured?: boolean | null
  is_public?: boolean | null
  display_order?: number | null
  created_at?: string | null
}

const categories = [
  { id: 'all', label: 'All Work' },
  { id: 'wedding', label: 'Weddings' },
  { id: 'portrait', label: 'Portraits' },
  { id: 'event', label: 'Events' },
  { id: 'corporate', label: 'Corporate' },
]

function getAspect(index: number) {
  if (index === 0 || index === 2) return 'portrait'
  if (index === 1 || index === 4) return 'landscape'
  return 'square'
}

export function GallerySection() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadGallery() {
      try {
        const response = await fetch('/api/public/gallery', { cache: 'no-store' })
        const result = await response.json()

        if (response.ok) {
          setGalleryItems(result.data || [])
        }
      } catch (error) {
        console.error('Failed to load public gallery section:', error)
      } finally {
        setLoading(false)
      }
    }

    loadGallery()
  }, [])

  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return galleryItems
    return galleryItems.filter((item) => item.session_type === activeCategory)
  }, [activeCategory, galleryItems])

  return (
    <section className="py-24 bg-card">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <p className="text-primary font-medium mb-3">Our Portfolio</p>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold mb-6">
            Featured Work
          </h2>
          <p className="text-lg text-muted-foreground">
            A curated selection of our finest photography work, showcasing the
            artistry and emotion we bring to every session.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={cn(
                'px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300',
                activeCategory === category.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent text-muted-foreground hover:text-foreground hover:bg-accent/80',
              )}
            >
              {category.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground">Loading featured work...</div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed py-16 text-center text-muted-foreground">
            No public portfolio images found yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredItems.map((item, index) => {
              const aspect = getAspect(index)

              return (
                <Link
                  key={item.id}
                  href="/gallery"
                  className={cn(
                    'relative group overflow-hidden rounded-xl bg-muted',
                    aspect === 'portrait' && index % 2 === 0 ? 'row-span-2' : '',
                    aspect === 'landscape' ? 'col-span-1 lg:col-span-2' : '',
                  )}
                >
                  <div
                    className={cn(
                      'relative w-full',
                      aspect === 'portrait'
                        ? 'aspect-[3/4]'
                        : aspect === 'square'
                          ? 'aspect-square'
                          : 'aspect-video',
                    )}
                  >
                    <Image
                      src={item.image_url}
                      alt={item.title || 'Portfolio Image'}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute inset-x-0 bottom-0 p-6 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                      <span className="text-xs font-medium text-primary uppercase tracking-wider">
                        {item.session_type || 'Portfolio'}
                      </span>
                      <h3 className="text-lg font-serif font-semibold text-white mt-1">
                        {item.title}
                      </h3>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        <div className="text-center mt-12">
          <Link href="/gallery">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
              View Full Portfolio
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
