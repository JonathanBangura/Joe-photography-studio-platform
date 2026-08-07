"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { X, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react"
import Image from "next/image"
import { portfolioCategoryNameFromSlug } from "@/lib/portfolio-categories"

interface GalleryImage {
  id: string
  title: string
  description: string | null
  session_type: string | null
  image_url: string
  is_featured: boolean
  display_order: number
}

interface GalleryCategory {
  id: string
  name: string
  slug: string
  sort_order?: number | null
}

// Fallback images when database is empty
const fallbackImages: GalleryImage[] = [
  { id: "1", image_url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80", title: "Wedding Bliss", session_type: "wedding", is_featured: true, display_order: 0, description: null },
  { id: "2", image_url: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=80", title: "Portrait Session", session_type: "portrait", is_featured: false, display_order: 1, description: null },
  { id: "3", image_url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80", title: "Engagement Day", session_type: "wedding", is_featured: false, display_order: 2, description: null },
  { id: "4", image_url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80", title: "Corporate Event", session_type: "event", is_featured: false, display_order: 3, description: null },
  { id: "5", image_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80", title: "Professional Headshot", session_type: "corporate", is_featured: false, display_order: 4, description: null },
  { id: "6", image_url: "https://images.unsplash.com/photo-1609220136736-443140cffec6?w=800&q=80", title: "Family Moments", session_type: "family", is_featured: false, display_order: 5, description: null },
  { id: "7", image_url: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&q=80", title: "Wedding Ceremony", session_type: "wedding", is_featured: true, display_order: 6, description: null },
  { id: "8", image_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80", title: "Natural Portrait", session_type: "portrait", is_featured: false, display_order: 7, description: null },
  { id: "9", image_url: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&q=80", title: "Conference", session_type: "event", is_featured: false, display_order: 8, description: null },
  { id: "10", image_url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&q=80", title: "Executive Portrait", session_type: "corporate", is_featured: false, display_order: 9, description: null },
  { id: "11", image_url: "https://images.unsplash.com/photo-1581952976147-5a2d15560349?w=800&q=80", title: "Family Portrait", session_type: "family", is_featured: false, display_order: 10, description: null },
  { id: "12", image_url: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&q=80", title: "First Dance", session_type: "wedding", is_featured: false, display_order: 11, description: null },
]

export function GalleryClient({
  initialImages,
  initialCategories,
}: {
  initialImages: GalleryImage[]
  initialCategories: GalleryCategory[]
}) {
  // Use database images if available, otherwise use fallback
  const galleryImages = initialImages.length > 0 ? initialImages : fallbackImages
  
  const [activeCategory, setActiveCategory] = useState("all")
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const filteredImages = activeCategory === "all" 
    ? galleryImages 
    : galleryImages.filter(img => img.session_type === activeCategory)

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

  const categorySource = initialCategories.length > 0
    ? initialCategories
    : Array.from(
        new Set(galleryImages.map((image) => image.session_type).filter(Boolean)),
      ).map((slug, index) => ({
        id: String(slug),
        name: portfolioCategoryNameFromSlug(String(slug)),
        slug: String(slug),
        sort_order: index,
      }))

  const availableCategories = [
    { id: "all", label: "All Work" },
    ...categorySource
      .filter((category) => galleryImages.some((image) => image.session_type === category.slug))
      .map((category) => ({ id: category.slug, label: category.name })),
  ]

  const getCategoryName = (slug: string | null) => {
    if (!slug) return "Photography"
    return categorySource.find((category) => category.slug === slug)?.name
      || portfolioCategoryNameFromSlug(slug)
  }

  return (
    <>
      {/* Category Filter */}
      <section className="px-4 pb-8">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-wrap justify-center gap-2">
            {availableCategories.map((category) => (
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
          {filteredImages.length === 0 ? (
            <div className="text-center py-20">
              <ImageIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No images found</h3>
              <p className="text-muted-foreground">
                Check back soon for new photos in this category.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredImages.map((image, index) => (
                <div
                  key={image.id}
                  className={`group relative overflow-hidden rounded-xl cursor-pointer ${
                    image.is_featured || index % 5 === 0 ? "sm:col-span-2 sm:row-span-2" : ""
                  }`}
                  onClick={() => setSelectedImage(image.id)}
                >
                  <div className={`relative ${image.is_featured || index % 5 === 0 ? "aspect-square" : "aspect-[4/5]"}`}>
                    <Image
                      src={image.image_url}
                      alt={image.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                      <h3 className="text-white font-semibold">{image.title}</h3>
                      <p className="text-white/70 text-sm">{getCategoryName(image.session_type)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

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
                src={selectedImageData.image_url}
                alt={selectedImageData.title}
                fill
                className="object-contain"
              />
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                <h3 className="text-white text-xl font-semibold">{selectedImageData.title}</h3>
                <p className="text-white/70">{getCategoryName(selectedImageData.session_type)}</p>
                {selectedImageData.description && (
                  <p className="text-white/60 mt-2 text-sm">{selectedImageData.description}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
