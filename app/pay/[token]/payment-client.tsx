'use client'

import { useEffect, useMemo, useState } from 'react'
import { CreditCard, Loader2, Smartphone, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

type PaymentData = {
  link: any
  invoice: any
  booking: any
  client: any
  payments: any[]
  totals: {
    total_amount: number
    paid_amount: number
    balance_amount: number
    tip_amount: number
  }
}

const paymentMethods = [
  {
    value: 'vult_app',
    title: 'Vult App',
    description: 'Pay instantly with your Vult App',
    icon: Wallet,
  },
  {
    value: 'card',
    title: 'Debit/Credit Card',
    description: 'Visa, Mastercard and more',
    icon: CreditCard,
  },
  {
    value: 'mobile_money',
    title: 'Mobile Money',
    description: 'Orange Money and Afrimoney accepted',
    icon: Smartphone,
  },
]

function formatMoney(value: unknown) {
  return `SLE ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function PaymentClient({ token }: { token: string }) {
  const [data, setData] = useState<PaymentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('mobile_money')

  async function loadPaymentLink() {
    setLoading(true)
    try {
      const response = await fetch(`/api/payments/customer-link/${token}`, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to load payment link')
      setData(result.data)
      if (!amount) setAmount(String(result.data?.totals?.balance_amount || ''))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load payment link')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPaymentLink()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const numericAmount = Number(amount || 0)
  const balance = Number(data?.totals?.balance_amount || 0)
  const overpayment = useMemo(() => Math.max(numericAmount - balance, 0), [numericAmount, balance])
  const appliedAmount = useMemo(() => Math.min(numericAmount, balance), [numericAmount, balance])

  async function startPayment() {
    if (!data) return
    if (!numericAmount || numericAmount <= 0) {
      toast.error('Enter a valid amount to pay')
      return
    }

    setPaying(true)
    try {
      const response = await fetch(`/api/payments/customer-link/${token}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: numericAmount, payment_method: paymentMethod }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to start payment')

      if (result.checkout_url) {
        window.location.href = result.checkout_url
        return
      }

      toast.success(result.message || 'Payment order created')
      await loadPaymentLink()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to start payment')
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <section className="px-4 py-20">
        <div className="container mx-auto max-w-3xl text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading payment details...</p>
        </div>
      </section>
    )
  }

  if (!data) {
    return (
      <section className="px-4 py-20">
        <div className="container mx-auto max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>Payment Link Unavailable</CardTitle>
              <CardDescription>This payment link could not be loaded. Please contact the studio.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>
    )
  }

  return (
    <section className="px-4 py-12">
      <div className="container mx-auto max-w-4xl space-y-6">
        <div className="text-center">
          <Badge className="mb-4">Secure Payment Link</Badge>
          <h1 className="font-serif text-4xl font-bold">Pay Your Booking Balance</h1>
          <p className="mt-2 text-muted-foreground">{data.booking?.booking_reference || data.invoice?.invoice_number}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Invoice Summary</CardTitle>
              <CardDescription>{data.client?.full_name || data.client?.email || 'Client'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Service</p>
                <p className="font-medium">{data.booking?.service?.name || 'Photography Session'}</p>
              </div>
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex justify-between"><span>Total</span><strong>{formatMoney(data.totals.total_amount)}</strong></div>
                <div className="flex justify-between"><span>Paid</span><strong>{formatMoney(data.totals.paid_amount)}</strong></div>
                <div className="flex justify-between text-primary"><span>Balance</span><strong>{formatMoney(data.totals.balance_amount)}</strong></div>
                {data.totals.tip_amount > 0 && (
                  <div className="flex justify-between text-muted-foreground"><span>Tips received</span><strong>{formatMoney(data.totals.tip_amount)}</strong></div>
                )}
              </div>
              <div className="rounded-lg border p-4">
                <p className="mb-2 font-medium">Payment History</p>
                {data.payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {data.payments.map((payment) => (
                      <div key={payment.id} className="flex justify-between text-sm">
                        <span>{payment.payment_method || 'Payment'}</span>
                        <span>{formatMoney(payment.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Make a Payment</CardTitle>
              <CardDescription>Pay by instalment or clear your remaining balance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Pay With</Label>
                <div className="grid gap-3">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon
                    const selected = paymentMethod === method.value
                    return (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setPaymentMethod(method.value)}
                        className={`flex items-center gap-4 rounded-xl border p-4 text-left transition ${selected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                      >
                        <div className="rounded-lg bg-primary/10 p-3"><Icon className="h-6 w-6 text-primary" /></div>
                        <div>
                          <p className="font-semibold">{method.title}</p>
                          <p className="text-sm text-muted-foreground">{method.description}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Amount to Pay</Label>
                <Input type="number" min="1" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
                <div className="flex flex-wrap gap-2 pt-2">
                  {[25, 50, 100].map((percent) => {
                    const value = Number(((balance * percent) / 100).toFixed(2))
                    return (
                      <Button key={percent} type="button" variant="outline" size="sm" onClick={() => setAmount(String(value))} disabled={balance <= 0}>
                        {percent}% Balance
                      </Button>
                    )
                  })}
                  <Button type="button" variant="outline" size="sm" onClick={() => setAmount(String(balance))} disabled={balance <= 0}>
                    Full Balance
                  </Button>
                </div>
              </div>

              {overpayment > 0 && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-700">
                  You are paying {formatMoney(overpayment)} more than your current balance. This extra amount will be recorded as a tip to the studio.
                </div>
              )}

              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex justify-between"><span>Applied to invoice</span><strong>{formatMoney(appliedAmount)}</strong></div>
                <div className="flex justify-between"><span>Tip</span><strong>{formatMoney(overpayment)}</strong></div>
                <div className="flex justify-between text-lg"><span>Total to pay</span><strong>{formatMoney(numericAmount)}</strong></div>
              </div>

              <Button className="w-full" size="lg" onClick={startPayment} disabled={paying}>
                {paying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Continue to Payment
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
