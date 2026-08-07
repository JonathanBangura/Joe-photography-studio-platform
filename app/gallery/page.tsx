import { createClient } from "@/lib/supabase/server"
import { Navbar } from "@/components/public/navbar"
import { Footer } from "@/components/public/footer"
import { GalleryClient } from "./gallery-client"
import { portfolioCategoryNameFromSlug } from "@/lib/portfolio-categories"

export const revalidate = 3600 // Revalidate every hour

async function getGalleryData() {
  const supabase = await createClient()

  const [galleryResult, categoryResult] = await Promise.all([
    supabase
      .from("gallery")
      .select("*")
      .eq("is_public", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("portfolio_categories")
      .select("id,name,slug,sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ])

  if (galleryResult.error) {
    console.error("Error fetching gallery:", galleryResult.error)
    return { images: [], categories: [] }
  }

  if (categoryResult.error) {
    console.warn("Portfolio categories unavailable:", categoryResult.error.message)
  }

  const images = galleryResult.data || []
  const fallbackCategories = Array.from(
    new Set(images.map((image) => String(image.session_type || '')).filter(Boolean)),
  ).map((slug, index) => ({
    id: slug,
    name: portfolioCategoryNameFromSlug(slug),
    slug,
    sort_order: index,
  }))

  return {
    images,
    categories: categoryResult.data || fallbackCategories,
  }
}

export default async function GalleryPage() {
  const { images, categories } = await getGalleryData()

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

        <GalleryClient initialImages={images} initialCategories={categories} />
      </main>

      <Footer />
    </div>
  )
}
