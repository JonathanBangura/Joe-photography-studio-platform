'use client'

import { useState } from 'react'
import { Plus, Search, Users, MoreHorizontal, Edit, Trash2, Eye, Mail, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Client, Profile } from '@/lib/types'

interface ClientsClientProps {
  initialClients: (Client & { profile?: Profile })[]
}

export function ClientsClient({ initialClients }: ClientsClientProps) {
  const [clients] = useState(initialClients)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredClients = clients.filter((client) =>
    client.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.city?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Clients</h1>
          <p className="text-muted-foreground mt-1">
            Manage your client database and contact information.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Client
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or city..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            All Clients ({filteredClients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No clients found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Preferred Contact</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={client.profile?.avatar_url || ''} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {client.profile?.full_name?.charAt(0) || 'C'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{client.profile?.full_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{client.profile?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {client.profile?.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="w-3 h-3 text-muted-foreground" />
                              <span className="truncate max-w-[150px]">{client.profile.email}</span>
                            </div>
                          )}
                          {client.profile?.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              <span>{client.profile.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{client.city || 'N/A'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm capitalize">{client.preferred_contact || 'Email'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(client.created_at).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 mr-2" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Client
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="w-4 h-4 mr-2" />
                              Send Email
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
