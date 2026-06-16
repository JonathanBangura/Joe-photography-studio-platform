'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { adminDbMutation } from '@/lib/admin-api-client'
import { Mail, Phone, Calendar, Search, Eye, Reply, RefreshCw, Inbox } from 'lucide-react'
import { toast } from 'sonner'

type Inquiry = {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string | null
  message: string
  session_type: string | null
  preferred_date: string | null
  is_read: boolean
  is_responded: boolean
  created_at: string
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString()
}

function getStatus(inquiry: Inquiry) {
  if (inquiry.is_responded) return 'Responded'
  if (!inquiry.is_read) return 'New'
  return 'Pending'
}

export default function AdminInquiriesPage() {
  const supabase = createClient()
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [replyLoading, setReplyLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null)
  const [replyMessage, setReplyMessage] = useState('')

  useEffect(() => {
    fetchInquiries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchInquiries() {
    setLoading(true)

    try {
      const response = await fetch('/api/admin/inquiries')

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error)
      }

      setInquiries(result.data || [])
    } catch (error) {
      console.error(error)
      toast.error('Failed to load inquiries')
    } finally {
      setLoading(false)
    }
  }

  async function openInquiry(inquiry: Inquiry) {
    setSelectedInquiry(inquiry)
    setReplyMessage('')

    if (!inquiry.is_read) {
      try {
        await adminDbMutation({
          table: 'contact_submissions',
          action: 'update',
          id: inquiry.id,
          payload: { is_read: true },
        })
        setInquiries((items) =>
          items.map((item) => (item.id === inquiry.id ? { ...item, is_read: true } : item)),
        )
      } catch (error) {
        console.error(error)
      }
    }
  }

  async function sendReply() {
    if (!selectedInquiry || !replyMessage.trim()) return

    setReplyLoading(true)

    try {
      const response = await fetch(`/api/admin/inquiries/${selectedInquiry.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: replyMessage }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send reply')
      }

      toast.success('Reply sent to client email')
      setSelectedInquiry(null)
      setReplyMessage('')
      await fetchInquiries()
    } catch (error) {
      console.error('Reply error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send reply')
    } finally {
      setReplyLoading(false)
    }
  }

  const filteredInquiries = inquiries.filter((inquiry) => {
    const status = getStatus(inquiry).toLowerCase()
    const matchesSearch =
      inquiry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inquiry.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(inquiry.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(inquiry.session_type || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || status === statusFilter
    return matchesSearch && matchesStatus
  })

  const counts = useMemo(
    () => ({
      total: inquiries.length,
      new: inquiries.filter((item) => !item.is_read).length,
      pending: inquiries.filter((item) => item.is_read && !item.is_responded).length,
      responded: inquiries.filter((item) => item.is_responded).length,
    }),
    [inquiries],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold">Inquiries</h1>
          <p className="text-muted-foreground">Manage contact form submissions and client replies.</p>
        </div>
        <Button variant="outline" onClick={fetchInquiries} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Total</p><p className="text-3xl font-bold">{counts.total}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">New</p><p className="text-3xl font-bold">{counts.new}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Pending</p><p className="text-3xl font-bold">{counts.pending}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Responded</p><p className="text-3xl font-bold">{counts.responded}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search inquiries..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="responded">Responded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Inquiries</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Preferred Date</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInquiries.map((inquiry) => {
                const status = getStatus(inquiry)
                return (
                  <TableRow key={inquiry.id}>
                    <TableCell>
                      <p className="font-medium">{inquiry.name}</p>
                      <p className="text-xs text-muted-foreground">{inquiry.email}</p>
                    </TableCell>
                    <TableCell>{inquiry.subject || 'No subject'}</TableCell>
                    <TableCell className="capitalize">{inquiry.session_type || '-'}</TableCell>
                    <TableCell>{formatDate(inquiry.preferred_date)}</TableCell>
                    <TableCell>{formatDate(inquiry.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openInquiry(inquiry)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filteredInquiries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Inbox className="mx-auto mb-3 h-10 w-10 opacity-50" />
                    {loading ? 'Loading inquiries...' : 'No inquiries found'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedInquiry)} onOpenChange={(open) => !open && setSelectedInquiry(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Inquiry Details</DialogTitle>
            <DialogDescription>View the full inquiry and send a response to the client email.</DialogDescription>
          </DialogHeader>

          {selectedInquiry && (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div><Label>From</Label><p className="font-semibold">{selectedInquiry.name}</p></div>
                <div><Label>Session Type</Label><p className="font-semibold capitalize">{selectedInquiry.session_type || '-'}</p></div>
                <div><Label className="flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label><p className="font-semibold">{selectedInquiry.email}</p></div>
                <div><Label className="flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</Label><p className="font-semibold">{selectedInquiry.phone || '-'}</p></div>
                <div><Label className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Preferred Date</Label><p className="font-semibold">{formatDate(selectedInquiry.preferred_date)}</p></div>
                <div><Label>Received</Label><p className="font-semibold">{new Date(selectedInquiry.created_at).toLocaleString()}</p></div>
              </div>

              <div><Label>Subject</Label><p className="font-semibold">{selectedInquiry.subject || 'No subject'}</p></div>

              <div>
                <Label>Message</Label>
                <div className="mt-2 rounded-lg border bg-muted/30 p-4 whitespace-pre-wrap">{selectedInquiry.message}</div>
              </div>

              <div className="border-t pt-4">
                <Label>Your Reply</Label>
                <Textarea
                  className="mt-2 min-h-[130px]"
                  value={replyMessage}
                  onChange={(event) => setReplyMessage(event.target.value)}
                  placeholder="Type your response..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedInquiry(null)}>Close</Button>
            <Button onClick={sendReply} disabled={!replyMessage.trim() || replyLoading}>
              <Reply className="mr-2 h-4 w-4" />
              {replyLoading ? 'Sending...' : 'Send Reply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
