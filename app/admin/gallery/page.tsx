"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, Star, Eye, EyeOff, Upload, Image as ImageIcon, Grid3X3, List, Loader2 } from "lucide-react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface GalleryImage {
  id: string
  title: string
  description: string | null
  session_type: string | null
  image_url: string
  is_featured: boolean
  is_public: boolean
  display_order: number
  created_at: string
}

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
  const [images, setImages] = useState<GalleryImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [filterType, setFilterType] = useState("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    session_type: "",
    image_url: "",
    is_featured: false,
    is_public: true,
  })

  useEffect(() => {
    fetchImages()
  }, [])

  const fetchImages = async () => {
    setIsLoading(true)
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from("gallery")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching gallery:", error)
      toast.error("Failed to load gallery")
    } else {
      setImages(data || [])
    }
    setIsLoading(false)
  }

  const filteredImages = filterType === "all" 
    ? images 
    : images.filter(img => img.session_type === filterType)

  const toggleFeatured = async (id: string, currentStatus: boolean) => {
    const supabase = createClient()
    
    const { error } = await supabase
      .from("gallery")
      .update({ is_featured: !currentStatus })
      .eq("id", id)

    if (error) {
      toast.error("Failed to update status")
      console.error(error)
    } else {
      setImages(images.map(img => 
        img.id === id ? { ...img, is_featured: !currentStatus } : img
      ))
      toast.success(`Image ${!currentStatus ? "featured" : "unfeatured"}`)
    }
  }

  const togglePublic = async (id: string, currentStatus: boolean) => {
    const supabase = createClient()
    
    const { error } = await supabase
      .from("gallery")
      .update({ is_public: !currentStatus })
      .eq("id", id)

    if (error) {
      toast.error("Failed to update visibility")
      console.error(error)
    } else {
      setImages(images.map(img => 
        img.id === id ? { ...img, is_public: !currentStatus } : img
      ))
      toast.success(`Image ${!currentStatus ? "made public" : "hidden"}`)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this image?")) return

    const supabase = createClient()
    
    const { error } = await supabase
      .from("gallery")
      .delete()
      .eq("id", id)

    if (error) {
      toast.error("Failed to delete image")
      console.error(error)
    } else {
      setImages(images.filter(img => img.id !== id))
      toast.success("Image deleted successfully")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    const supabase = createClient()
    
    const { error } = await supabase
      .from("gallery")
      .insert({
        title: formData.title,
        description: formData.description || null,
        session_type: formData.session_type || null,
        image_url: formData.image_url,
        is_featured: formData.is_featured,
        is_public: formData.is_public,
        display_order: images.length,
      })

    if (error) {
      toast.error("Failed to add image")
      console.error(error)
    } else {
      toast.success("Image added successfully")
      fetchImages()
      setIsDialogOpen(false)
      setFormData({
        title: "",
        description: "",
        session_type: "",
        image_url: "",
        is_featured: false,
        is_public: true,
      })
    }
    
    setIsSubmitting(false)
  }

  const featuredCount = images.filter(i => i.is_featured).length
  const publicCount = images.filter(i => i.is_public).length
  const hiddenCount = images.filter(i => !i.is_public).length

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
                Add a new image to your portfolio gallery
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Image Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Wedding at Sunset"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the image..."
                  rows={2}
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
                <Label htmlFor="image_url">Image URL *</Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter the URL of your image (e.g., from Unsplash, Cloudinary, or your hosting)
                </p>
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
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Add Image
                    </>
                  )}
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
            <div className="text-2xl font-bold">{featuredCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Public</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{publicCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Hidden</CardTitle>
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hiddenCount}</div>
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
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No images yet</h3>
              <p className="text-muted-foreground mb-4">Add your first gallery image to get started.</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Image
              </Button>
            </div>
          ) : viewMode === "grid" ? (
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
                        onClick={() => toggleFeatured(image.id, image.is_featured)}
                      >
                        <Star className={`h-4 w-4 ${image.is_featured ? "fill-current" : ""}`} />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => togglePublic(image.id, image.is_public)}
                      >
                        {image.is_public ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="icon"
                        onClick={() => handleDelete(image.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium truncate">{image.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {image.session_type && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {image.session_type}
                        </Badge>
                      )}
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
                      {image.session_type && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {image.session_type}
                        </Badge>
                      )}
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
                      onClick={() => toggleFeatured(image.id, image.is_featured)}
                    >
                      <Star className={`h-4 w-4 ${image.is_featured ? "fill-current" : ""}`} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => togglePublic(image.id, image.is_public)}
                    >
                      {image.is_public ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="text-destructive"
                      onClick={() => handleDelete(image.id)}
                    >
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
