"use client"

import { useState } from "react"
import { Navbar } from "@/components/public/navbar"
import { Footer } from "@/components/public/footer"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"

const categories = [
  { id: "all", label: "All Work" },
  { id: "wedding", label: "Weddings" },
  { id: "portrait", label: "Portraits" },
  { id: "event", label: "Events" },
  { id: "corporate", label: "Corporate" },
  { id: "family", label: "Family" },
]

// Sample gallery data - in production this would come from Supabase
const galleryImages = [
  { id: 1, src: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80", title: "Wedding Bliss", category: "wedding" },
  { id: 2, src: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=80", title: "Portrait Session", category: "portrait" },
  { id: 3, src: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80", title: "Engagement Day", category: "wedding" },
  { id: 4, src: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80", title: "Corporate Event", category: "event" },
  { id: 5, src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80", title: "Professional Headshot", category: "corporate" },
  { id: 6, src: "https://images.unsplash.com/photo-1609220136736-443140cffec6?w=800&q=80", title: "Family Moments", category: "family" },
  { id: 7, src: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&q=80", title: "Wedding Ceremony", category: "wedding" },
  { id: 8, src: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80", title: "Natural Portrait", category: "portrait" },
  { id: 9, src: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&q=80", title: "Conference", category: "event" },
  { id: 10, src: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&q=80", title: "Executive Portrait", category: "corporate" },
  { id: 11, src: "https://images.unsplash.com/photo-1581952976147-5a2d15560349?w=800&q=80", title: "Family Portrait", category: "family" },
  { id: 12, src: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&q=80", title: "First Dance", category: "wedding" },
]

export default function GalleryPage() {
  const [activeCategory, setActiveCategory] = useState("all")
  const [selectedImage, setSelectedImage] = useState<number | null>(null)

  const filteredImages = activeCategory === "all" 
    ? galleryImages 
    : galleryImages.filter(img => img.category === activeCategory)

  const currentImageIndex = selectedImage !== null 
    ? filteredImages.findIndex(img => img.id === selectedImage) 
    : -1

  const goToNext = () => {
    if (currentImageIndex < filteredImages.length - 1) {
      setSelectedImage(filteredImages[currentImageIndex + 1].id)
    }
  }

  const goToPrev = () => {
    if (currentImageIndex > 0) {
      setSelectedImage(filteredImages[currentImageIndex - 1].id)
    }
  }

  const selectedImageData = galleryImages.find(img => img.id === selectedImage)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24">
        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl text-center">
            <span className="text-primary font-medium tracking-widest text-sm uppercase">Our Portfolio</span>
            <h1 className="text-4xl md:text-6xl font-serif font-bold mt-4 mb-6 text-balance">
              Capturing Life&apos;s <span className="text-primary">Beautiful</span> Moments
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-pretty">
              Browse through our collection of cherished memories and artistic captures. 
              Each image tells a unique story.
            </p>
          </div>
        </section>

        {/* Category Filter */}
        <section className="px-4 pb-8">
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-wrap justify-center gap-2">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={activeCategory === category.id ? "default" : "outline"}
                  onClick={() => setActiveCategory(category.id)}
                  className="rounded-full"
                >
                  {category.label}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* Gallery Grid */}
        <section className="px-4 pb-24">
          <div className="container mx-auto max-w-7xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredImages.map((image, index) => (
                <div
                  key={image.id}
                  className={`group relative overflow-hidden rounded-xl cursor-pointer ${
                    index % 5 === 0 ? "sm:col-span-2 sm:row-span-2" : ""
                  }`}
                  onClick={() => setSelectedImage(image.id)}
                >
                  <div className={`relative ${index % 5 === 0 ? "aspect-square" : "aspect-[4/5]"}`}>
                    <Image
                      src={image.src}
                      alt={image.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                      <h3 className="text-white font-semibold">{image.title}</h3>
                      <p className="text-white/70 text-sm capitalize">{image.category}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Lightbox Dialog */}
      <Dialog open={selectedImage !== null} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="h-6 w-6 text-white" />
          </button>

          {currentImageIndex > 0 && (
            <button
              onClick={goToPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="h-8 w-8 text-white" />
            </button>
          )}

          {currentImageIndex < filteredImages.length - 1 && (
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ChevronRight className="h-8 w-8 text-white" />
            </button>
          )}

          {selectedImageData && (
            <div className="relative w-full h-[90vh] flex items-center justify-center">
              <Image
                src={selectedImageData.src}
                alt={selectedImageData.title}
                fill
                className="object-contain"
              />
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                <h3 className="text-white text-xl font-semibold">{selectedImageData.title}</h3>
                <p className="text-white/70 capitalize">{selectedImageData.category}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
