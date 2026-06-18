'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { History, Search, RefreshCw, FileText } from 'lucide-react'
import { toast } from 'sonner'

type AuditLog = {
  id: string
  user_id: string | null
  action: string
  resource_type: string
  resource_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

const actionColors: Record<string, string> = {
  create: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  update: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  delete: 'bg-red-500/10 text-red-600 border-red-500/20',
  login: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [resourceFilter, setResourceFilter] = useState('all')

  useEffect(() => {
    fetchLogs()
  }, [])

  async function fetchLogs() {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/audit-logs', { cache: 'no-store' })
      const result = await response.json().catch(() => ({ error: response.statusText }))

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load audit logs')
      }

      setLogs(result.logs || [])
    } catch (error) {
      console.error('Audit logs load error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.resource_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(log.resource_id || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesAction = actionFilter === 'all' || log.action === actionFilter
    const matchesResource = resourceFilter === 'all' || log.resource_type === resourceFilter
    return matchesSearch && matchesAction && matchesResource
  })

  const uniqueActions = useMemo(() => [...new Set(logs.map((log) => log.action))], [logs])
  const uniqueResources = useMemo(() => [...new Set(logs.map((log) => log.resource_type))], [logs])

  const stats = useMemo(
    () => ({
      total: logs.length,
      creates: logs.filter((log) => log.action.includes('create')).length,
      updates: logs.filter((log) => log.action.includes('update') || log.action.includes('status') || log.action.includes('discount')).length,
      deletes: logs.filter((log) => log.action.includes('delete')).length,
    }),
    [logs],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">Track all system changes and user activity.</p>
        </div>
        <Button variant="outline" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Total Logs</p><p className="text-3xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Creates</p><p className="text-3xl font-bold">{stats.creates}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Updates</p><p className="text-3xl font-bold">{stats.updates}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Deletes</p><p className="text-3xl font-bold">{stats.deletes}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by action, resource, or ID..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="pl-9" />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full md:w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map((action) => <SelectItem key={action} value={action}>{action}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={resourceFilter} onValueChange={setResourceFilter}>
              <SelectTrigger className="w-full md:w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                {uniqueResources.map((resource) => <SelectItem key={resource} value={resource}>{resource}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Activity Log</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Resource ID</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                  <TableCell><Badge variant="outline" className={actionColors[log.action] || ''}>{log.action}</Badge></TableCell>
                  <TableCell>{log.resource_type}</TableCell>
                  <TableCell className="max-w-[220px] truncate font-mono text-xs">{log.resource_id || '-'}</TableCell>
                  <TableCell>{log.ip_address || '-'}</TableCell>
                </TableRow>
              ))}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-14 text-center text-muted-foreground">
                    <FileText className="mx-auto mb-3 h-10 w-10 opacity-50" />
                    {loading ? 'Loading audit logs...' : 'No audit logs found'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
