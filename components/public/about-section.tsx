import Image from 'next/image'
import Link from 'next/link'
import { Award, Users, Camera, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'

const stats = [
  { icon: Users, value: '500+', label: 'Happy Clients' },
  { icon: Camera, value: '50k+', label: 'Photos Delivered' },
  { icon: Award, value: '15+', label: 'Awards Won' },
  { icon: Heart, value: '12+', label: 'Years Experience' },
]

export function AboutSection() {
  return (
    <section className="py-24 bg-card">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Image Side */}
          <div className="relative">
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1554048612-b6a482bc67e5?q=80&w=1470&auto=format&fit=crop"
                alt="Joe - Professional Photographer"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            {/* Floating card */}
            <div className="absolute -bottom-6 -right-6 bg-background border border-border rounded-xl p-6 shadow-xl max-w-xs">
              <p className="font-serif text-2xl font-bold text-primary mb-1">12+ Years</p>
              <p className="text-sm text-muted-foreground">Creating timeless memories</p>
            </div>
          </div>

          {/* Content Side */}
          <div>
            <p className="text-primary font-medium mb-3">About Joe Studio</p>
            <h2 className="font-serif text-4xl sm:text-5xl font-bold mb-6">
              Passionate About Capturing Your Story
            </h2>
            <div className="space-y-4 text-muted-foreground mb-8">
              <p>
                Founded in 2012, Joe Studio has grown from a one-person passion project 
                into a full-service photography studio known for capturing life&apos;s most 
                precious moments with artistry and authenticity.
              </p>
              <p>
                Our approach combines technical excellence with a deep understanding of 
                human emotion. We believe every photograph should tell a story, evoke 
                feelings, and stand the test of time.
              </p>
              <p>
                Whether it&apos;s the joy of a wedding day, the pride of a professional portrait, 
                or the warmth of a family gathering, we&apos;re dedicated to creating images 
                that you&apos;ll treasure forever.
              </p>
            </div>

            <Link href="/about">
              <Button variant="outline" className="gap-2">
                Learn More About Us
              </Button>
            </Link>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-12 pt-8 border-t border-border">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-2xl font-serif font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
