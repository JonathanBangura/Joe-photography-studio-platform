'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type PublicTestimonial = {
  id: string | number
  name: string
  role?: string | null
  content: string
  rating?: number | null
  image?: string | null
}

const fallbackTestimonials: PublicTestimonial[] = [
  {
    id: 1,
    name: 'Sarah & Michael Johnson',
    role: 'Wedding Clients',
    content:
      'Joe Studio captured our wedding day perfectly. Every emotion, every detail, every precious moment was preserved in the most beautiful way.',
    rating: 5,
    image:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop',
  },
  {
    id: 2,
    name: 'David Chen',
    role: 'Corporate Client',
    content:
      'The team at Joe Studio transformed our corporate headshots from mundane to magnificent. Their attention to lighting and composition made our entire leadership team look polished and professional.',
    rating: 5,
    image:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop',
  },
  {
    id: 3,
    name: 'Emily Rodriguez',
    role: 'Portrait Client',
    content:
      'I have never felt so comfortable in front of a camera. The portrait session was fun, relaxed, and the results exceeded all my expectations.',
    rating: 5,
    image:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop',
  },
]

type TestimonialsSectionProps = {
  initialTestimonials?: PublicTestimonial[]
  showHeader?: boolean
}

export function TestimonialsSection({
  initialTestimonials = [],
  showHeader = false,
}: TestimonialsSectionProps) {
  const testimonials = useMemo(
    () => (initialTestimonials.length > 0 ? initialTestimonials : fallbackTestimonials),
    [initialTestimonials],
  )
  const [currentIndex, setCurrentIndex] = useState(0)

  const active = testimonials[currentIndex] || testimonials[0]
  const rating = Math.min(Math.max(Number(active?.rating || 5), 1), 5)

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
  }

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        {showHeader && (
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <p className="text-primary font-medium mb-3">Testimonials</p>
            <h1 className="font-serif text-4xl sm:text-6xl font-bold mb-6">
              What Our Clients Say
            </h1>
            <p className="text-lg text-muted-foreground">
              Real feedback from clients whose sessions have been completed and approved by the studio.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            {!showHeader && (
              <>
                <p className="text-primary font-medium mb-3">Testimonials</p>
                <h2 className="font-serif text-4xl sm:text-5xl font-bold mb-6">
                  What Our Clients Say
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  We take pride in delivering exceptional photography experiences.
                </p>
              </>
            )}

            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={prevTestimonial}
                className="rounded-full w-12 h-12 border-border hover:bg-accent"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={nextTestimonial}
                className="rounded-full w-12 h-12 border-border hover:bg-accent"
                aria-label="Next testimonial"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
              <span className="text-sm text-muted-foreground ml-4">
                {currentIndex + 1} / {testimonials.length}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-8">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all duration-300',
                    index === currentIndex ? 'w-8 bg-primary' : 'bg-border hover:bg-muted-foreground',
                  )}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="bg-card border border-border rounded-2xl p-8 lg:p-12 relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                <Quote className="w-6 h-6 text-primary-foreground" />
              </div>

              <div className="flex items-center gap-1 mb-6">
                {[...Array(rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                ))}
              </div>

              <blockquote className="text-xl lg:text-2xl font-serif leading-relaxed mb-8">
                &quot;{active.content}&quot;
              </blockquote>

              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                  {active.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={active.image}
                      alt={active.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-semibold text-primary">
                      {active.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-semibold">{active.name}</p>
                  <p className="text-sm text-muted-foreground">{active.role || 'Client'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
