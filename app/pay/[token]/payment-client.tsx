'use client'

import { useEffect, useMemo, useState } from 'react'
import { Copy, CreditCard, ExternalLink, Loader2, QrCode, Smartphone, Wallet, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

type PaymentData = {
  link: any
  invoice: any
  booking: any
  client: any
  payments: any[]
  totals: {
    total_amount: number
    total_amount_usd?: number
    total_amount_sle?: number
    paid_amount: number
    balance_amount: number
    tip_amount: number
    exchange_rate?: number
  }
}

type PaymentMethodValue = 'vult_app' | 'mobile_money' | 'card'

type PaymentModalState = {
  type: PaymentMethodValue
  amount: number
  paymentUrl?: string | null
  paymentCode?: string | null
  qrCode?: string | null
} | null

const paymentMethods: Array<{
  value: PaymentMethodValue
  title: string
  description: string
  icon: typeof Wallet
  asset?: string
  cardAssets?: string[]
}> = [
  {
    value: 'vult_app',
    title: 'Vult App',
    description: 'Pay instantly with your Vult App',
    icon: Wallet,
    asset: '/payment-assets/vult-logo.png',
  },
  {
    value: 'card',
    title: 'Debit/Credit Card',
    description: 'Visa, Mastercard and more',
    icon: CreditCard,
    asset: '/payment-assets/card-icon.png',
    cardAssets: ['/payment-assets/visa.png', '/payment-assets/mastercard.png'],
  },
  {
    value: 'mobile_money',
    title: 'Mobile Money',
    description: 'Orange Money & Afrimoney accepted',
    icon: Smartphone,
    asset: '/payment-assets/momo.png',
  },
]

function formatSle(value: unknown) {
  return `SLE ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatUsd(value: unknown) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function qrImageUrl(value?: string | null) {
  if (!value) return ''
  if (value.startsWith('data:image') || value.startsWith('http')) return value
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(value)}`
}

export function PaymentClient({ token }: { token: string }) {
  const [data, setData] = useState<PaymentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue>('mobile_money')
  const [modal, setModal] = useState<PaymentModalState>(null)

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

  async function copyText(value?: string | null, label = 'Copied') {
    if (!value) return
    await navigator.clipboard.writeText(value)
    toast.success(label)
  }

  function dialMobileMoneyCode(code?: string | null) {
    if (!code) return
    window.location.href = `tel:${code.replace(/#/g, '%23')}`
  }

  async function startPayment() {
    if (!data) return
    if (!numericAmount || numericAmount <= 0) {
      toast.error('Enter a valid amount to pay')
      return
    }

    setPaying(true)
    setModal(null)
    try {
      const response = await fetch(`/api/payments/customer-link/${token}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: numericAmount, payment_method: paymentMethod }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to start payment')

      if (paymentMethod === 'card') {
        if (result.checkout_url || result.payment_url) {
          window.location.href = result.checkout_url || result.payment_url
          return
        }
        throw new Error('Card checkout link was not returned by Vult')
      }

      if (paymentMethod === 'mobile_money') {
        setModal({
          type: 'mobile_money',
          amount: Number(result.amount || numericAmount),
          paymentCode: result.payment_code,
          paymentUrl: result.payment_url || result.checkout_url,
        })
        toast.success('Mobile money payment instruction generated')
        await loadPaymentLink()
        return
      }

      setModal({
        type: 'vult_app',
        amount: Number(result.amount || numericAmount),
        paymentUrl: result.payment_url || result.checkout_url,
        qrCode: result.qr_code || result.payment_url || result.checkout_url,
      })
      toast.success('Vult App payment link generated')
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

  const selectedMethod = paymentMethods.find((method) => method.value === paymentMethod)

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
                {data.totals.total_amount_usd !== undefined && (
                  <div className="flex justify-between"><span>Total USD</span><strong>{formatUsd(data.totals.total_amount_usd)}</strong></div>
                )}
                {data.totals.exchange_rate && (
                  <div className="flex justify-between text-sm text-muted-foreground"><span>Exchange Rate</span><span>1 USD = SLE {Number(data.totals.exchange_rate).toLocaleString()}</span></div>
                )}
                <div className="flex justify-between"><span>Total Payable</span><strong>{formatSle(data.totals.total_amount)}</strong></div>
                <div className="flex justify-between"><span>Paid</span><strong>{formatSle(data.totals.paid_amount)}</strong></div>
                <div className="flex justify-between text-primary"><span>Balance</span><strong>{formatSle(data.totals.balance_amount)}</strong></div>
                {data.totals.tip_amount > 0 && (
                  <div className="flex justify-between text-muted-foreground"><span>Tips received</span><strong>{formatSle(data.totals.tip_amount)}</strong></div>
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
                        <span>{payment.payment_channel || payment.payment_method || 'Payment'}</span>
                        <span>{formatSle(payment.amount)}</span>
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
              <CardDescription>Pay by instalment or clear your remaining balance. All Vult payments are processed in SLE.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Pay With</Label>
                <div className="grid gap-4">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon
                    const selected = paymentMethod === method.value
                    return (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setPaymentMethod(method.value)}
                        className={`flex min-h-[104px] items-center gap-5 rounded-2xl border-2 p-5 text-left transition ${selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-muted hover:border-primary/50'}`}
                      >
                        <div className="flex h-16 w-28 shrink-0 items-center justify-center rounded-xl bg-background p-2 shadow-sm">
                          {method.asset ? (
                            <img src={method.asset} alt={method.title} className="max-h-12 max-w-full object-contain" />
                          ) : (
                            <Icon className="h-8 w-8 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xl font-bold">{method.title}</p>
                          <p className="text-sm text-muted-foreground md:text-base">{method.description}</p>
                          {method.cardAssets && (
                            <div className="mt-3 flex items-center gap-3">
                              {method.cardAssets.map((asset) => (
                                <img key={asset} src={asset} alt="Card brand" className="h-5 object-contain" />
                              ))}
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Amount to Pay in SLE</Label>
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
                  You are paying {formatSle(overpayment)} more than your current balance. This extra amount will be recorded as a tip to the studio.
                </div>
              )}

              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex justify-between"><span>Applied to invoice</span><strong>{formatSle(appliedAmount)}</strong></div>
                <div className="flex justify-between"><span>Tip</span><strong>{formatSle(overpayment)}</strong></div>
                <div className="flex justify-between text-lg"><span>Total to pay</span><strong>{formatSle(numericAmount)}</strong></div>
              </div>

              <Button className="w-full" size="lg" onClick={startPayment} disabled={paying}>
                {paying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {selectedMethod ? `Pay with ${selectedMethod.title}` : 'Continue to Payment'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={Boolean(modal)} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent className="max-w-lg rounded-3xl p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{modal?.type === 'mobile_money' ? 'Complete Mobile Money Payment' : 'Pay In-App with Vult'}</DialogTitle>
            <DialogDescription>Use the provided code or QR link to complete your payment.</DialogDescription>
          </DialogHeader>

          {modal?.type === 'mobile_money' && (
            <div className="p-8 text-center">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="absolute right-5 top-5 rounded-full p-2 hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-6 w-6" />
              </button>

              <div className="mx-auto mb-5 flex h-16 w-32 items-center justify-center rounded-xl bg-background p-2 shadow-sm">
                <img src="/payment-assets/momo.png" alt="Orange Money and Afrimoney" className="max-h-12 max-w-full object-contain" />
              </div>

              <h2 className="text-3xl font-bold">Complete Your Payment</h2>
              <p className="mx-auto mt-4 max-w-sm text-lg text-muted-foreground">
                Dial the code below to complete your Mobile Money payment.
              </p>

              <div className="my-6 break-all rounded-2xl bg-muted px-4 py-5 font-mono text-3xl font-black">
                {modal.paymentCode || 'Code unavailable'}
              </div>

              <div className="space-y-3">
                <Button className="w-full" size="lg" onClick={() => copyText(modal.paymentCode, 'Mobile money code copied')} disabled={!modal.paymentCode}>
                  <Copy className="mr-2 h-5 w-5" />
                  Copy Code
                </Button>
                <Button className="w-full bg-green-600 hover:bg-green-700" size="lg" onClick={() => dialMobileMoneyCode(modal.paymentCode)} disabled={!modal.paymentCode}>
                  Dial Now
                </Button>
              </div>

              <p className="mt-6 text-sm text-amber-600">⏳ Waiting for payment confirmation...</p>
              <p className="mt-2 text-xs text-muted-foreground">Your invoice will update automatically once Vult confirms the payment.</p>
            </div>
          )}

          {modal?.type === 'vult_app' && (
            <div className="p-8">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="absolute right-5 top-5 rounded-full p-2 hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-6 w-6" />
              </button>

              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-14 w-24 items-center justify-center rounded-xl bg-background p-2 shadow-sm">
                  <img src="/payment-assets/vult-logo.png" alt="Vult" className="max-h-10 max-w-full object-contain" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold">Pay In-App (Vult)</h2>
                  <p className="text-muted-foreground">Scan or open the Vult payment link.</p>
                </div>
              </div>

              <p className="mb-4 text-lg">Scan this QR code with the Vult app:</p>

              <div className="mx-auto mb-6 flex h-[300px] w-[300px] items-center justify-center rounded-2xl border bg-white p-4">
                {modal.qrCode || modal.paymentUrl ? (
                  <img src={qrImageUrl(modal.qrCode || modal.paymentUrl)} alt="Vult payment QR code" className="h-full w-full object-contain" />
                ) : (
                  <QrCode className="h-20 w-20 text-muted-foreground" />
                )}
              </div>

              <Label>or copy link:</Label>
              <div className="mt-2 flex gap-2">
                <Input value={modal.paymentUrl || ''} readOnly className="font-mono text-sm" />
                <Button variant="outline" onClick={() => copyText(modal.paymentUrl, 'Vult payment link copied')} disabled={!modal.paymentUrl}>
                  Copy
                </Button>
              </div>

              <Button className="mt-5 w-full" size="lg" onClick={() => modal.paymentUrl && window.open(modal.paymentUrl, '_blank')} disabled={!modal.paymentUrl}>
                Open in Vult App <ExternalLink className="ml-2 h-5 w-5" />
              </Button>

              <p className="mt-4 text-center text-xs text-muted-foreground">Your invoice will update once Vult confirms payment.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
