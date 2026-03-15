import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { zonesApi, dnsApi } from '../api/client'
import { Card } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { Input, Select, Checkbox } from '../components/ui/FormControls'
import type { Zone, DNSRecord } from '../api/types'

const DNS_TYPES = ['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS', 'SRV']

function CreateRecordModal({
  open, onClose, zoneId,
}: { open: boolean; onClose: () => void; zoneId: string }) {
  const qc = useQueryClient()
  const [type, setType] = useState('A')
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [proxied, setProxied] = useState(false)
  const [ttl, setTtl] = useState('')

  const mutation = useMutation({
    mutationFn: () => dnsApi.create(zoneId, {
      type, name, content, proxied,
      ttl: parseInt(ttl) || 1,
    }),
    onSuccess: () => {
      toast.success('DNS record created')
      qc.invalidateQueries({ queryKey: ['dns', zoneId] })
      onClose()
      setName(''); setContent('')
    },
    onError: (e: Error) => toast.error(`Failed to create record: ${e.message}`),
  })

  return (
    <Modal open={open} onClose={onClose} title="Create DNS Record" size="md">
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="space-y-4">
        <Select label="Type" value={type} onChange={(e) => setType(e.target.value)}>
          {DNS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Input label="Name" placeholder="sub.example.com or @" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="Content / Target" placeholder={type === 'A' ? '1.2.3.4' : type === 'CNAME' ? 'target.example.com' : ''} value={content} onChange={(e) => setContent(e.target.value)} required />
        <Input label="TTL (seconds, 1 = auto)" type="number" value={ttl} placeholder="1" onChange={(e) => setTtl(e.target.value)} />
        {['A', 'AAAA', 'CNAME'].includes(type) && (
          <Checkbox label="Proxy through Cloudflare" helpText="Enable Cloudflare proxy (orange cloud)" checked={proxied} onChange={(e) => setProxied(e.target.checked)} />
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>Create Record</Button>
        </div>
      </form>
    </Modal>
  )
}

function ZoneDNSTable({ zone }: { zone: Zone }) {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const { data: records = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['dns', zone.id],
    queryFn: () => dnsApi.list(zone.id),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => dnsApi.delete(zone.id, id),
    onSuccess: () => {
      toast.success('Record deleted')
      qc.invalidateQueries({ queryKey: ['dns', zone.id] })
    },
    onError: (e: Error) => toast.error(`Delete failed: ${e.message}`),
  })

  return (
    <Card padding="none">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{zone.name}</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{records.length} records</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="p-1.5 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            Add Record
          </Button>
        </div>
      </div>
      {isLoading ? (
        <div className="px-5 py-6 text-sm text-gray-400 text-center">Loading records...</div>
      ) : records.length === 0 ? (
        <div className="px-5 py-6 text-sm text-gray-400 text-center">No DNS records found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 dark:text-gray-400 font-medium border-b border-gray-100 dark:border-gray-800">
                <th className="px-5 py-3 text-left">Type</th>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Content</th>
                <th className="px-5 py-3 text-center">Proxied</th>
                <th className="px-5 py-3 text-right">TTL</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {records.map((r: DNSRecord) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 group text-xs">
                  <td className="px-5 py-3">
                    <span className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded font-mono font-semibold">
                      {r.type}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-gray-700 dark:text-gray-300 max-w-[200px] truncate">{r.name}</td>
                  <td className="px-5 py-3 font-mono text-gray-600 dark:text-gray-400 max-w-[240px] truncate">{r.content}</td>
                  <td className="px-5 py-3 text-center">
                    {r.proxied
                      ? <span className="text-orange-500 font-bold">*</span>
                      : <span className="text-gray-300">o</span>}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-400 dark:text-gray-500">{r.ttl === 1 ? 'Auto' : `${r.ttl}s`}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => deleteMut.mutate(r.id)}
                      className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CreateRecordModal open={createOpen} onClose={() => setCreateOpen(false)} zoneId={zone.id} />
    </Card>
  )
}

export default function ZonesDNS() {
  const { data: zones = [], isLoading } = useQuery({
    queryKey: ['zones'],
    queryFn: zonesApi.list,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">DNS Records</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage DNS records across all your Cloudflare zones.</p>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-sm text-gray-400">Loading zones...</div>
      ) : zones.length === 0 ? (
        <Card className="text-center py-16">
          <p className="text-gray-400 text-sm">No zones found for this account.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {zones.map((zone: Zone) => <ZoneDNSTable key={zone.id} zone={zone} />)}
        </div>
      )}
    </div>
  )
}
