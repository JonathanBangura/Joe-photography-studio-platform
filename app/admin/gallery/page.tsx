"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, Star, Eye, EyeOff, Upload, Image as ImageIcon, Grid3X3, List } from "lucide-react"
import Image from "next/image"

// Mock data
const mockGalleryImages = [
  { id: "1", title: "Wedding Bliss", session_type: "wedding", image_url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&q=80", is_featured: true, is_public: true },
  { id: "2", title: "Portrait Session", session_type: "portrait", image_url: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&q=80", is_featured: false, is_public: true },
  { id: "3", title: "Engagement Day", session_type: "wedding", image_url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&q=80", is_featured: true, is_public: true },
  { id: "4", title: "Corporate Event", session_type: "event", image_url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80", is_featured: false, is_public: true },
  { id: "5", title: "Professional Headshot", session_type: "corporate", image_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80", is_featured: false, is_public: true },
  { id: "6", title: "Family Moments", session_type: "family", image_url: "https://images.unsplash.com/photo-1609220136736-443140cffec6?w=400&q=80", is_featured: true, is_public: true },
]

const sessionTypes = [
  { value: "all", label: "All Types" },
  { value: "portrait", label: "Portrait" },
  { value: "wedding", label: "Wedding" },
  { value: "event", label: "Event" },
  { value: "corporate", label: "Corporate" },
  { value: "product", label: "Product" },
  { value: "family", label: "Family" },
  { value: "maternity", label: "Maternity" },
  { value: "newborn", label: "Newborn" },
]

export default function AdminGalleryPage() {
  const [images, setImages] = useState(mockGalleryImages)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [filterType, setFilterType] = useState("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    session_type: "",
    image_url: "",
    is_featured: false,
    is_public: true,
  })

  const filteredImages = filterType === "all" 
    ? images 
    : images.filter(img => img.session_type === filterType)

  const toggleFeatured = (id: string) => {
    setImages(images.map(img => 
      img.id === id ? { ...img, is_featured: !img.is_featured } : img
    ))
  }

  const togglePublic = (id: string) => {
    setImages(images.map(img => 
      img.id === id ? { ...img, is_public: !img.is_public } : img
    ))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In production, this would save to Supabase
    setIsDialogOpen(false)
    setFormData({
      title: "",
      session_type: "",
      image_url: "",
      is_featured: false,
      is_public: true,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gallery Management</h1>
          <p className="text-muted-foreground">Manage your portfolio and gallery images</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Image
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Image</DialogTitle>
              <DialogDescription>
                Upload a new image to your portfolio gallery
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Image Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Wedding at Sunset"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session_type">Category</Label>
                <Select
                  value={formData.session_type}
                  onValueChange={(value) => setFormData({ ...formData, session_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessionTypes.filter(t => t.value !== "all").map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="image_url">Image URL</Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                  required
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                  />
                  <Label>Featured Image</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_public}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                  />
                  <Label>Public</Label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  <Upload className="mr-2 h-4 w-4" />
                  Add Image
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Images</CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{images.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Featured</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{images.filter(i => i.is_featured).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Public</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{images.filter(i => i.is_public).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Hidden</CardTitle>
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{images.filter(i => !i.is_public).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and View Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gallery Images</CardTitle>
              <CardDescription>Manage and organize your portfolio</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  {sessionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center border rounded-lg">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredImages.map((image) => (
                <div key={image.id} className="group relative rounded-lg overflow-hidden border">
                  <div className="aspect-square relative">
                    <Image
                      src={image.image_url}
                      alt={image.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        variant={image.is_featured ? "default" : "secondary"}
                        size="icon"
                        onClick={() => toggleFeatured(image.id)}
                      >
                        <Star className={`h-4 w-4 ${image.is_featured ? "fill-current" : ""}`} />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => togglePublic(image.id)}
                      >
                        {image.is_public ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                      <Button variant="destructive" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium truncate">{image.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs capitalize">
                        {image.session_type}
                      </Badge>
                      {image.is_featured && (
                        <Badge className="text-xs bg-primary/20 text-primary">
                          Featured
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredImages.map((image) => (
                <div key={image.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50">
                  <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0">
                    <Image
                      src={image.image_url}
                      alt={image.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium">{image.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs capitalize">
                        {image.session_type}
                      </Badge>
                      {image.is_featured && (
                        <Badge className="text-xs bg-primary/20 text-primary">
                          Featured
                        </Badge>
                      )}
                      {!image.is_public && (
                        <Badge variant="secondary" className="text-xs">
                          Hidden
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={image.is_featured ? "default" : "outline"}
                      size="icon"
                      onClick={() => toggleFeatured(image.id)}
                    >
                      <Star className={`h-4 w-4 ${image.is_featured ? "fill-current" : ""}`} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => togglePublic(image.id)}
                    >
                      {image.is_public ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="icon" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
