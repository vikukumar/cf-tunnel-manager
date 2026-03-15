import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, RefreshCw, ArrowRight, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { toast } from 'sonner'
import { tunnelsApi } from '../api/client'
import { Card } from '../components/ui/Card'
import StatusBadge from '../components/StatusBadge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import type { Tunnel } from '../api/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export default function TunnelsList() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<Tunnel | null>(null)

  const { data: tunnels = [], isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['tunnels'],
    queryFn: tunnelsApi.list,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tunnelsApi.delete(id),
    onSuccess: () => {
      toast.success('Tunnel deleted')
      qc.invalidateQueries({ queryKey: ['tunnels'] })
      setConfirmDelete(null)
    },
    onError: (e: Error) => toast.error(`Delete failed: ${e.message}`),
  })

  const filtered = tunnels.filter((t: Tunnel) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.id.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tunnels</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{tunnels.length} tunnel{tunnels.length !== 1 ? 's' : ''} total</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <Link to="/tunnels/new">
            <Button size="md">
              <Plus className="w-4 h-4" />
              New Tunnel
            </Button>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search tunnels..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-4 py-2 w-full border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#F6821F] focus:border-transparent"
        />
      </div>

      {/* Tunnel table */}
      {isLoading ? (
        <div className="text-center py-16 text-sm text-gray-400">Loading tunnels...</div>
      ) : error ? (
        <div className="text-center py-16 text-sm text-red-500">
          Failed to load tunnels: {(error as Error).message}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-16">
          <p className="text-gray-400 text-sm">
            {search ? 'No tunnels match your search.' : 'No tunnels yet.'}
          </p>
          {!search && (
            <Link to="/tunnels/new" className="mt-3 inline-block text-sm text-[#F6821F] hover:underline">
              + Create your first tunnel
            </Link>
          )}
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs text-gray-500 dark:text-gray-400 font-medium">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Connections</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((tunnel: Tunnel) => (
                  <tr key={tunnel.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{tunnel.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-600 font-mono mt-0.5">{tunnel.id.slice(0, 16)}...</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={tunnel.status} />
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400">
                      {tunnel.connections?.length ?? 0} active
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 dark:text-gray-500 text-xs font-mono">
                      {tunnel.tun_type}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400">
                      {formatDate(tunnel.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => { e.preventDefault(); setConfirmDelete(tunnel) }}
                          className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all"
                          title="Delete tunnel"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          to={`/tunnels/${tunnel.id}`}
                          className="p-1.5 rounded text-gray-400 hover:text-[#F6821F] hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors"
                          title="View details"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Delete confirmation modal */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Tunnel"
        size="sm"
      >
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-gray-900">{confirmDelete?.name}</span>?
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
          This will remove the tunnel and disconnect all running cloudflared instances.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
          >
            Delete Tunnel
          </Button>
        </div>
      </Modal>
    </div>
  )
}
