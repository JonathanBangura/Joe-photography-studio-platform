import { Navbar } from '@/components/public/navbar'
import { Footer } from '@/components/public/footer'
import { PaymentClient } from './payment-client'

type PageProps = {
  params: Promise<{ token: string }>
}

export default async function CustomerPaymentPage({ params }: PageProps) {
  const { token } = await params

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24">
        <PaymentClient token={token} />
      </main>
      <Footer />
    </div>
  )
}
