import { createClient } from '@/lib/supabase/server'
import { ClientsClient } from './clients-client'

export default async function ClientsPage() {
  const supabase = await createClient()

  const { data: clients } = await supabase
    .from('clients')
    .select('*, profile:profiles(*)')
    .order('created_at', { ascending: false })

  return <ClientsClient initialClients={clients || []} />
}
