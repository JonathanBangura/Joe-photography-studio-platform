import { createClient } from "@/lib/supabase/server"
import { Navbar } from "@/components/public/navbar"
import { Footer } from "@/components/public/footer"
import { GalleryClient } from "./gallery-client"

export const revalidate = 3600 // Revalidate every hour

async function getGalleryImages() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("gallery")
    .select("*")
    .eq("is_public", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching gallery:", error)
    return []
  }

  return data || []
}

export default async function GalleryPage() {
  const images = await getGalleryImages()

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

        <GalleryClient initialImages={images} />
      </main>

      <Footer />
    </div>
  )
}
