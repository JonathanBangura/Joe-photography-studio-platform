"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Mail, MessageSquare, Phone, Calendar, Search, Eye, Reply, CheckCircle, Clock, Inbox } from "lucide-react"

// Mock data
const mockInquiries = [
  { 
    id: "1", 
    name: "Amanda Foster", 
    email: "amanda@email.com", 
    phone: "+1 555-123-4567",
    subject: "Wedding Photography Inquiry",
    message: "Hi! My fiance and I are getting married on June 15th, 2024 and we're looking for a photographer. We love your portfolio and would love to discuss packages. We're expecting around 150 guests.",
    session_type: "wedding",
    preferred_date: "2024-06-15",
    is_read: false,
    is_responded: false,
    created_at: "2024-02-28T10:30:00Z"
  },
  { 
    id: "2", 
    name: "David Kim", 
    email: "david.kim@company.com", 
    phone: "+1 555-987-6543",
    subject: "Corporate Headshots for Team",
    message: "We need professional headshots for our entire team of 25 people. Can you provide on-site services at our office? What would be the pricing for bulk?",
    session_type: "corporate",
    preferred_date: "2024-03-20",
    is_read: true,
    is_responded: false,
    created_at: "2024-02-27T14:15:00Z"
  },
  { 
    id: "3", 
    name: "Rachel Martinez", 
    email: "rachel.m@email.com", 
    phone: null,
    subject: "Family Portrait Session",
    message: "I'd like to book a family session for my parents' 50th anniversary. There will be about 15 family members. Do you have availability in April?",
    session_type: "family",
    preferred_date: "2024-04-10",
    is_read: true,
    is_responded: true,
    created_at: "2024-02-25T09:00:00Z"
  },
  { 
    id: "4", 
    name: "James Thompson", 
    email: "james.t@email.com", 
    phone: "+1 555-456-7890",
    subject: "Product Photography",
    message: "I run an e-commerce jewelry store and need high-quality product photos. Looking for someone who can capture the details and sparkle of our pieces.",
    session_type: "product",
    preferred_date: null,
    is_read: false,
    is_responded: false,
    created_at: "2024-02-28T16:45:00Z"
  },
]

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState(mockInquiries)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedInquiry, setSelectedInquiry] = useState<typeof mockInquiries[0] | null>(null)
  const [replyMessage, setReplyMessage] = useState("")

  const filteredInquiries = inquiries.filter(inquiry => {
    const matchesSearch = 
      inquiry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inquiry.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inquiry.subject.toLowerCase().includes(searchQuery.toLowerCase())
    
    let matchesStatus = true
    if (statusFilter === "unread") matchesStatus = !inquiry.is_read
    if (statusFilter === "read") matchesStatus = inquiry.is_read && !inquiry.is_responded
    if (statusFilter === "responded") matchesStatus = inquiry.is_responded
    
    return matchesSearch && matchesStatus
  })

  const markAsRead = (id: string) => {
    setInquiries(inquiries.map(i => 
      i.id === id ? { ...i, is_read: true } : i
    ))
  }

  const handleViewInquiry = (inquiry: typeof mockInquiries[0]) => {
    setSelectedInquiry(inquiry)
    if (!inquiry.is_read) {
      markAsRead(inquiry.id)
    }
  }

  const handleSendReply = () => {
    if (selectedInquiry && replyMessage) {
      setInquiries(inquiries.map(i => 
        i.id === selectedInquiry.id ? { ...i, is_responded: true } : i
      ))
      setReplyMessage("")
      setSelectedInquiry(null)
    }
  }

  const unreadCount = inquiries.filter(i => !i.is_read).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inquiries</h1>
          <p className="text-muted-foreground">Manage contact form submissions and inquiries</p>
        </div>
        {unreadCount > 0 && (
          <Badge className="bg-primary text-primary-foreground">
            {unreadCount} new
          </Badge>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Inquiries</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inquiries.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{inquiries.filter(i => !i.is_read).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Awaiting Reply</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inquiries.filter(i => i.is_read && !i.is_responded).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Responded</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inquiries.filter(i => i.is_responded).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Inquiries Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Inquiries</CardTitle>
              <CardDescription>View and respond to contact form submissions</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search inquiries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[250px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Awaiting Reply</SelectItem>
                  <SelectItem value="responded">Responded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30px]"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Preferred Date</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInquiries.map((inquiry) => (
                <TableRow key={inquiry.id} className={!inquiry.is_read ? "bg-primary/5" : ""}>
                  <TableCell>
                    {!inquiry.is_read && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className={`font-medium ${!inquiry.is_read ? "text-foreground" : ""}`}>
                        {inquiry.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{inquiry.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{inquiry.subject}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {inquiry.session_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {inquiry.preferred_date 
                      ? new Date(inquiry.preferred_date).toLocaleDateString()
                      : "-"
                    }
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(inquiry.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {inquiry.is_responded ? (
                      <Badge className="bg-green-500/20 text-green-400" variant="outline">
                        Responded
                      </Badge>
                    ) : inquiry.is_read ? (
                      <Badge className="bg-yellow-500/20 text-yellow-400" variant="outline">
                        Pending
                      </Badge>
                    ) : (
                      <Badge className="bg-primary/20 text-primary" variant="outline">
                        New
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleViewInquiry(inquiry)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleViewInquiry(inquiry)}
                      >
                        <Reply className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View/Reply Dialog */}
      <Dialog open={!!selectedInquiry} onOpenChange={() => setSelectedInquiry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Inquiry Details</DialogTitle>
            <DialogDescription>
              View the full inquiry and send a response
            </DialogDescription>
          </DialogHeader>
          {selectedInquiry && (
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">From</Label>
                  <p className="font-medium">{selectedInquiry.name}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Session Type</Label>
                  <p className="font-medium capitalize">{selectedInquiry.session_type}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email
                  </Label>
                  <p className="font-medium">{selectedInquiry.email}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Phone
                  </Label>
                  <p className="font-medium">{selectedInquiry.phone || "Not provided"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Preferred Date
                  </Label>
                  <p className="font-medium">
                    {selectedInquiry.preferred_date 
                      ? new Date(selectedInquiry.preferred_date).toLocaleDateString()
                      : "Not specified"
                    }
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Received</Label>
                  <p className="font-medium">
                    {new Date(selectedInquiry.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> Subject
                </Label>
                <p className="font-medium">{selectedInquiry.subject}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Message</Label>
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <p className="whitespace-pre-wrap">{selectedInquiry.message}</p>
                </div>
              </div>

              {!selectedInquiry.is_responded && (
                <div className="space-y-2 pt-4 border-t">
                  <Label htmlFor="reply">Your Reply</Label>
                  <Textarea
                    id="reply"
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your response..."
                    rows={4}
                  />
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setSelectedInquiry(null)}>
                      Close
                    </Button>
                    <Button onClick={handleSendReply} disabled={!replyMessage}>
                      <Reply className="mr-2 h-4 w-4" />
                      Send Reply
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
