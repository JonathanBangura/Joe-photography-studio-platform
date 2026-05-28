"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Download, Heart, X, ChevronLeft, ChevronRight, Images, Calendar, Lock } from "lucide-react"
import Image from "next/image"

// Mock data - will be replaced with Supabase data
const mockGalleries = [
  {
    id: "1",
    title: "Wedding Day - March 2024",
    booking_date: "2024-03-15",
    photo_count: 250,
    expires_at: "2024-06-15",
    photos: [
      { id: "1", url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80", is_selected: true },
      { id: "2", url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80", is_selected: true },
      { id: "3", url: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&q=80", is_selected: false },
      { id: "4", url: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&q=80", is_selected: true },
      { id: "5", url: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80", is_selected: false },
      { id: "6", url: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=800&q=80", is_selected: false },
    ]
  },
]

export default function PortalGalleryPage() {
  const [activeGallery, setActiveGallery] = useState(mockGalleries[0])
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>(
    activeGallery.photos.filter(p => p.is_selected).map(p => p.id)
  )
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null)

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    )
  }

  const currentPhotoIndex = lightboxPhoto 
    ? activeGallery.photos.findIndex(p => p.id === lightboxPhoto)
    : -1

  const goToNext = () => {
    if (currentPhotoIndex < activeGallery.photos.length - 1) {
      setLightboxPhoto(activeGallery.photos[currentPhotoIndex + 1].id)
    }
  }

  const goToPrev = () => {
    if (currentPhotoIndex > 0) {
      setLightboxPhoto(activeGallery.photos[currentPhotoIndex - 1].id)
    }
  }

  const currentPhoto = activeGallery.photos.find(p => p.id === lightboxPhoto)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Galleries</h1>
          <p className="text-muted-foreground">View and select your favorite photos</p>
        </div>
      </div>

      {/* Gallery Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Photos</CardTitle>
            <Images className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeGallery.photos.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Selected</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{selectedPhotos.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Session Date</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(activeGallery.booking_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Access Expires</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(activeGallery.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gallery */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{activeGallery.title}</CardTitle>
              <CardDescription>Click on photos to select your favorites</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline">
                {selectedPhotos.length} selected
              </Badge>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Download Selected
              </Button>
              <Button size="sm">
                <Download className="mr-2 h-4 w-4" />
                Download All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {activeGallery.photos.map((photo) => (
              <div 
                key={photo.id} 
                className={`group relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                  selectedPhotos.includes(photo.id) 
                    ? "border-primary ring-2 ring-primary/20" 
                    : "border-transparent hover:border-border"
                }`}
              >
                <Image
                  src={photo.url}
                  alt="Gallery photo"
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  onClick={() => setLightboxPhoto(photo.id)}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                
                {/* Selection Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    togglePhotoSelection(photo.id)
                  }}
                  className={`absolute top-2 right-2 p-2 rounded-full transition-all ${
                    selectedPhotos.includes(photo.id)
                      ? "bg-primary text-primary-foreground"
                      : "bg-black/50 text-white opacity-0 group-hover:opacity-100"
                  }`}
                >
                  <Heart className={`h-4 w-4 ${selectedPhotos.includes(photo.id) ? "fill-current" : ""}`} />
                </button>

                {/* Photo Number */}
                <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/50 text-white text-xs">
                  #{activeGallery.photos.indexOf(photo) + 1}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lightbox */}
      <Dialog open={!!lightboxPhoto} onOpenChange={() => setLightboxPhoto(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
          <button
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="h-6 w-6 text-white" />
          </button>

          {currentPhotoIndex > 0 && (
            <button
              onClick={goToPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="h-8 w-8 text-white" />
            </button>
          )}

          {currentPhotoIndex < activeGallery.photos.length - 1 && (
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ChevronRight className="h-8 w-8 text-white" />
            </button>
          )}

          {currentPhoto && (
            <div className="relative w-full h-[90vh] flex items-center justify-center">
              <Image
                src={currentPhoto.url}
                alt="Gallery photo"
                fill
                className="object-contain"
              />
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
                <span className="text-white">
                  Photo {currentPhotoIndex + 1} of {activeGallery.photos.length}
                </span>
                <div className="flex items-center gap-3">
                  <Button
                    variant={selectedPhotos.includes(currentPhoto.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => togglePhotoSelection(currentPhoto.id)}
                    className={selectedPhotos.includes(currentPhoto.id) ? "" : "bg-white/10 border-white/20 text-white hover:bg-white/20"}
                  >
                    <Heart className={`mr-2 h-4 w-4 ${selectedPhotos.includes(currentPhoto.id) ? "fill-current" : ""}`} />
                    {selectedPhotos.includes(currentPhoto.id) ? "Selected" : "Select"}
                  </Button>
                  <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
