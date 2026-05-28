'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const testimonials = [
  {
    id: 1,
    name: 'Sarah & Michael Johnson',
    role: 'Wedding Clients',
    content: 'Joe Studio captured our wedding day perfectly. Every emotion, every detail, every precious moment was preserved in the most beautiful way. We could not have asked for a better photographer.',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop',
  },
  {
    id: 2,
    name: 'David Chen',
    role: 'Corporate Client',
    content: 'The team at Joe Studio transformed our corporate headshots from mundane to magnificent. Their attention to lighting and composition made our entire leadership team look polished and professional.',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop',
  },
  {
    id: 3,
    name: 'Emily Rodriguez',
    role: 'Portrait Client',
    content: 'I have never felt so comfortable in front of a camera. The portrait session was fun, relaxed, and the results exceeded all my expectations. These photos will be treasured forever.',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop',
  },
  {
    id: 4,
    name: 'The Williams Family',
    role: 'Family Session',
    content: 'Our family photos turned out absolutely stunning! Joe Studio has a gift for capturing genuine moments and making everyone, including the kids, feel at ease. Highly recommend!',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
  },
]

export function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0)

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
  }

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left side - Header */}
          <div>
            <p className="text-primary font-medium mb-3">Testimonials</p>
            <h2 className="font-serif text-4xl sm:text-5xl font-bold mb-6">
              What Our Clients Say
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              We take pride in delivering exceptional photography experiences. 
              Here&apos;s what some of our valued clients have to say about working with us.
            </p>

            {/* Navigation */}
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

            {/* Dots */}
            <div className="flex items-center gap-2 mt-8">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all duration-300',
                    index === currentIndex
                      ? 'w-8 bg-primary'
                      : 'bg-border hover:bg-muted-foreground'
                  )}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Right side - Testimonial Card */}
          <div className="relative">
            <div className="bg-card border border-border rounded-2xl p-8 lg:p-12 relative">
              {/* Quote icon */}
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                <Quote className="w-6 h-6 text-primary-foreground" />
              </div>

              {/* Stars */}
              <div className="flex items-center gap-1 mb-6">
                {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                ))}
              </div>

              {/* Content */}
              <blockquote className="text-xl lg:text-2xl font-serif leading-relaxed mb-8">
                &quot;{testimonials[currentIndex].content}&quot;
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={testimonials[currentIndex].image}
                    alt={testimonials[currentIndex].name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="font-semibold">{testimonials[currentIndex].name}</p>
                  <p className="text-sm text-muted-foreground">{testimonials[currentIndex].role}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
