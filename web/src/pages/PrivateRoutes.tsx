import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, RefreshCw, Network } from 'lucide-react'
import { toast } from 'sonner'
import { routesApi, tunnelsApi } from '../api/client'
import { Card } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { Input, Select } from '../components/ui/FormControls'
import type { NetworkRoute, Tunnel } from '../api/types'

function AddRouteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const tunnelsQ = useQuery({ queryKey: ['tunnels'], queryFn: tunnelsApi.list })
  const [network, setNetwork] = useState('')
  const [tunnelId, setTunnelId] = useState('')
  const [comment, setComment] = useState('')

  const mutation = useMutation({
    mutationFn: () => routesApi.create({ network, tunnel_id: tunnelId, comment: comment || undefined }),
    onSuccess: () => {
      toast.success(`Route ${network} added`)
      qc.invalidateQueries({ queryKey: ['routes'] })
      onClose()
      setNetwork(''); setTunnelId(''); setComment('')
    },
    onError: (e: Error) => toast.error(`Failed to add route: ${e.message}`),
  })

  return (
    <Modal open={open} onClose={onClose} title="Add Private Network Route" size="md">
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="space-y-4">
        <Input
          label="IP CIDR Network"
          placeholder="e.g. 10.0.0.0/8"
          value={network}
          onChange={(e) => setNetwork(e.target.value)}
          required
          helpText="The private IP range to route through Cloudflare Tunnel."
        />
        <Select
          label="Tunnel"
          value={tunnelId}
          onChange={(e) => setTunnelId(e.target.value)}
        >
          <option value="">Select tunnel...</option>
          {(tunnelsQ.data ?? []).map((t: Tunnel) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Select>
        <Input label="Comment (optional)" placeholder="e.g. Production LAN" value={comment} onChange={(e) => setComment(e.target.value)} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending} disabled={!network || !tunnelId}>Add Route</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function PrivateRoutes() {
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const { data: routes = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['routes'],
    queryFn: routesApi.list,
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => routesApi.delete(id),
    onSuccess: () => {
      toast.success('Route deleted')
      qc.invalidateQueries({ queryKey: ['routes'] })
    },
    onError: (e: Error) => toast.error(`Delete failed: ${e.message}`),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Private Network Routes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Route private IP/CIDR ranges through your tunnels for Zero Trust access.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" />
            Add Route
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-sm text-gray-400">Loading routes...</div>
      ) : routes.length === 0 ? (
        <Card className="text-center py-16">
          <Network className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm mb-2">No private network routes configured.</p>
          <p className="text-xs text-gray-300 max-w-xs mx-auto">
            Add a CIDR range to route traffic from Zero Trust users to private services via cloudflared.
          </p>
          <button onClick={() => setAddOpen(true)} className="mt-4 text-sm text-[#F6821F] hover:underline">
            + Add your first route
          </button>
        </Card>
      ) : (
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 font-medium">
                <th className="px-5 py-3 text-left">Network (CIDR)</th>
                <th className="px-5 py-3 text-left">Tunnel</th>
                <th className="px-5 py-3 text-left">Comment</th>
                <th className="px-5 py-3 text-left">Created</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {routes.map((route: NetworkRoute) => (
                <tr key={route.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 group">
                  <td className="px-5 py-3.5 font-mono text-sm font-medium text-gray-900 dark:text-gray-100">{route.network}</td>
                  <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400 text-xs">{route.tunnel_name || route.tunnel_id.slice(0, 8) + '...'}</td>
                  <td className="px-5 py-3.5 text-gray-500 dark:text-gray-500 text-xs">{route.comment || ' - '}</td>
                  <td className="px-5 py-3.5 text-gray-400 dark:text-gray-600 text-xs">{new Date(route.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => deleteMut.mutate(route.id)}
                      className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <AddRouteModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
