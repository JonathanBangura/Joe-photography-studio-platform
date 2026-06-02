'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DollarSign, FileText, Clock, CheckCircle, Search, Download, Eye, Send, CreditCard } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { recordPaymentAndSyncInvoice } from '@/lib/business-logic-client'
import { createAuditLog } from '@/lib/audit-log-client'
import { toast } from 'sonner'

type InvoiceRecord = {
  id: string
  booking_id: string | null
  client_id: string | null
  invoice_number: string
  amount: number
  tax_amount: number | null
  total_amount: number
  payment_status: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'
  due_date: string | null
  paid_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  client?: {
    id: string
    profile?: {
      full_name: string | null
      email: string | null
    }
  } | null
  booking?: {
    id: string
    booking_date: string
    service?: {
      name: string
    } | null
  } | null
  payments?: Array<{ amount: number }>
}

const statusStyles: Record<string, string> = {
  paid: 'bg-green-500/20 text-green-500 border-green-500/30',
  pending: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
  partial: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  overdue: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
  cancelled: 'bg-red-500/20 text-red-500 border-red-500/30',
}

export default function AdminInvoicesPage() {
  const supabase = createClient()
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'Cash',
    transaction_id: '',
    notes: '',
  })

  useEffect(() => {
    fetchInvoices()
  }, [])

  async function fetchInvoices() {
    setLoading(true)
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        client:clients(*, profile:profiles(full_name, email)),
        booking:bookings(*, service:services(name)),
        payments(amount)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to load invoices')
      console.error(error)
    } else {
      setInvoices((data || []) as InvoiceRecord[])
    }
    setLoading(false)
  }

  const invoicesWithDerivedStatus = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)

    return invoices.map((invoice) => {
      const paidAmount = (invoice.payments || []).reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
      )
      const balance = Number(invoice.total_amount || 0) - paidAmount
      const derivedStatus =
        invoice.payment_status !== 'paid' && invoice.due_date && invoice.due_date < today
          ? 'overdue'
          : invoice.payment_status

      return { ...invoice, paidAmount, balance, derivedStatus }
    })
  }, [invoices])

  const filteredInvoices = invoicesWithDerivedStatus.filter((invoice) => {
    const clientName = invoice.client?.profile?.full_name || ''
    const matchesSearch =
      clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || invoice.derivedStatus === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalRevenue = invoicesWithDerivedStatus.reduce((sum, invoice) => sum + invoice.paidAmount, 0)
  const pendingAmount = invoicesWithDerivedStatus.reduce(
    (sum, invoice) => sum + Math.max(invoice.balance, 0),
    0
  )

  function openPaymentDialog(invoice: InvoiceRecord & { balance?: number }) {
    setSelectedInvoice(invoice)
    setPaymentForm({
      amount: String(Math.max(Number(invoice.balance || invoice.total_amount || 0), 0)),
      payment_method: 'Cash',
      transaction_id: '',
      notes: '',
    })
    setPaymentOpen(true)
  }

  async function handleRecordPayment() {
    if (!selectedInvoice) return
    const amount = Number(paymentForm.amount)

    if (!amount || amount <= 0) {
      toast.error('Enter a valid payment amount')
      return
    }

    setPaymentLoading(true)
    try {
      await recordPaymentAndSyncInvoice({
        invoiceId: selectedInvoice.id,
        amount,
        paymentMethod: paymentForm.payment_method,
        transactionId: paymentForm.transaction_id || null,
        notes: paymentForm.notes || null,
      })
      toast.success('Payment recorded and invoice updated')
      setPaymentOpen(false)
      await fetchInvoices()
    } catch (error) {
      console.error(error)
      toast.error('Failed to record payment')
    } finally {
      setPaymentLoading(false)
    }
  }

  async function handleSendInvoice(invoice: InvoiceRecord) {
    await createAuditLog({
      action: 'send_invoice',
      resource_type: 'invoice',
      resource_id: invoice.id,
      new_data: { invoice_number: invoice.invoice_number },
    })
    toast.success('Invoice send action logged. Email service can be connected later.')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">Manage real invoice balances and payment records</p>
        </div>
        <Button variant="outline" onClick={fetchInvoices} disabled={loading}>
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Collected Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">from recorded payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${pendingAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">remaining balances</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoicesWithDerivedStatus.filter((i) => i.payment_status === 'paid').length}</div>
            <p className="text-xs text-muted-foreground">fully paid invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
            <p className="text-xs text-muted-foreground">all time</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>All Invoices</CardTitle>
              <CardDescription>Invoices are auto-created when bookings are created</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[250px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Booking Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono font-medium">{invoice.invoice_number}</TableCell>
                  <TableCell>{invoice.client?.profile?.full_name || 'Unknown'}</TableCell>
                  <TableCell>{invoice.booking?.service?.name || 'N/A'}</TableCell>
                  <TableCell>{invoice.booking?.booking_date ? new Date(invoice.booking.booking_date).toLocaleDateString() : '-'}</TableCell>
                  <TableCell className="font-semibold">${Number(invoice.total_amount || 0).toLocaleString()}</TableCell>
                  <TableCell>${invoice.paidAmount.toLocaleString()}</TableCell>
                  <TableCell>${Math.max(invoice.balance, 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge className={statusStyles[invoice.derivedStatus]} variant="outline">
                      {invoice.derivedStatus.charAt(0).toUpperCase() + invoice.derivedStatus.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" title="View">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Download PDF">
                        <Download className="h-4 w-4" />
                      </Button>
                      {invoice.payment_status !== 'paid' && (
                        <Button variant="ghost" size="icon" title="Record Payment" onClick={() => openPaymentDialog(invoice)}>
                          <CreditCard className="h-4 w-4" />
                        </Button>
                      )}
                      {invoice.payment_status !== 'paid' && (
                        <Button variant="ghost" size="icon" title="Send Reminder" onClick={() => handleSendInvoice(invoice)}>
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredInvoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    {loading ? 'Loading invoices...' : 'No invoices found'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Add a payment against invoice {selectedInvoice?.invoice_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={paymentForm.payment_method}
                onValueChange={(value) => setPaymentForm({ ...paymentForm, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Orange Money">Orange Money</SelectItem>
                  <SelectItem value="Afrimoney">Afrimoney</SelectItem>
                  <SelectItem value="Online Transfer">Online Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Transaction Reference</Label>
              <Input
                value={paymentForm.transaction_id}
                onChange={(e) => setPaymentForm({ ...paymentForm, transaction_id: e.target.value })}
                placeholder="Optional reference"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="Optional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={paymentLoading}>
              {paymentLoading ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
