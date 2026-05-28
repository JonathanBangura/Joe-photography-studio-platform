'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const categories = [
  { id: 'all', label: 'All Work' },
  { id: 'wedding', label: 'Weddings' },
  { id: 'portrait', label: 'Portraits' },
  { id: 'event', label: 'Events' },
  { id: 'corporate', label: 'Corporate' },
]

const galleryItems = [
  {
    id: 1,
    src: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1470&auto=format&fit=crop',
    category: 'wedding',
    title: 'Romantic Garden Wedding',
    aspect: 'portrait',
  },
  {
    id: 2,
    src: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1470&auto=format&fit=crop',
    category: 'event',
    title: 'Corporate Gala Night',
    aspect: 'landscape',
  },
  {
    id: 3,
    src: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=1528&auto=format&fit=crop',
    category: 'portrait',
    title: 'Editorial Portrait',
    aspect: 'portrait',
  },
  {
    id: 4,
    src: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1374&auto=format&fit=crop',
    category: 'corporate',
    title: 'Executive Headshot',
    aspect: 'square',
  },
  {
    id: 5,
    src: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=1469&auto=format&fit=crop',
    category: 'wedding',
    title: 'Beach Ceremony',
    aspect: 'landscape',
  },
  {
    id: 6,
    src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1374&auto=format&fit=crop',
    category: 'portrait',
    title: 'Natural Light Portrait',
    aspect: 'portrait',
  },
  {
    id: 7,
    src: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1470&auto=format&fit=crop',
    category: 'event',
    title: 'Conference Keynote',
    aspect: 'landscape',
  },
  {
    id: 8,
    src: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?q=80&w=1470&auto=format&fit=crop',
    category: 'wedding',
    title: 'Elegant Reception',
    aspect: 'landscape',
  },
]

export function GallerySection() {
  const [activeCategory, setActiveCategory] = useState('all')

  const filteredItems = activeCategory === 'all' 
    ? galleryItems 
    : galleryItems.filter(item => item.category === activeCategory)

  return (
    <section className="py-24 bg-card">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
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

        {/* Category Filter */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={cn(
                'px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300',
                activeCategory === category.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent text-muted-foreground hover:text-foreground hover:bg-accent/80'
              )}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* Gallery Grid - Masonry-like layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredItems.map((item, index) => (
            <Link
              key={item.id}
              href={`/gallery/${item.id}`}
              className={cn(
                'relative group overflow-hidden rounded-xl bg-muted',
                item.aspect === 'portrait' && index % 2 === 0 ? 'row-span-2' : '',
                item.aspect === 'landscape' ? 'col-span-1 lg:col-span-2' : ''
              )}
            >
              <div className={cn(
                'relative w-full',
                item.aspect === 'portrait' ? 'aspect-[3/4]' : item.aspect === 'square' ? 'aspect-square' : 'aspect-video'
              )}>
                <Image
                  src={item.src}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {/* Content */}
                <div className="absolute inset-x-0 bottom-0 p-6 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <span className="text-xs font-medium text-primary uppercase tracking-wider">
                    {item.category}
                  </span>
                  <h3 className="text-lg font-serif font-semibold text-white mt-1">
                    {item.title}
                  </h3>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* CTA */}
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
