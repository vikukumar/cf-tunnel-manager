import { useQuery } from '@tanstack/react-query'
import { CloudCog, Activity, Globe, Network, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { tunnelsApi, routesApi, zonesApi } from '../api/client'
import { Card } from '../components/ui/Card'
import StatusBadge from '../components/StatusBadge'
import type { Tunnel } from '../api/types'

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color: string
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  )
}

export default function Dashboard() {
  const tunnelsQ = useQuery({ queryKey: ['tunnels'], queryFn: tunnelsApi.list })
  const routesQ  = useQuery({ queryKey: ['routes'],  queryFn: routesApi.list })
  const zonesQ   = useQuery({ queryKey: ['zones'],   queryFn: zonesApi.list })

  const tunnels     = tunnelsQ.data ?? []
  const healthy     = tunnels.filter((t: Tunnel) => t.status === 'healthy').length
  const degraded    = tunnels.filter((t: Tunnel) => t.status === 'degraded').length
  const inactive    = tunnels.filter((t: Tunnel) => t.status === 'inactive').length
  const totalConns  = tunnels.reduce((sum, t: Tunnel) => sum + (t.connections?.length ?? 0), 0)

  const recentTunnels = [...tunnels]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Overview of your Cloudflare Tunnel infrastructure.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={CloudCog}
          label="Total Tunnels"
          value={tunnels.length}
          sub={tunnelsQ.isFetching ? 'Refreshing...' : undefined}
          color="bg-orange-50 text-[#F6821F]"
        />
        <StatCard
          icon={CheckCircle2}
          label="Healthy Tunnels"
          value={healthy}
          sub={degraded > 0 ? `${degraded} degraded` : undefined}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          icon={Activity}
          label="Active Connections"
          value={totalConns}
          sub="Across all tunnels"
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={Network}
          label="Private Routes"
          value={routesQ.data?.length ?? ' - '}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Status breakdown + recent tunnels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tunnel health breakdown */}
        <Card className="lg:col-span-1">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Tunnel Health</h2>
          <div className="space-y-3">
            {[
              { label: 'Healthy',  count: healthy,  color: 'bg-green-500' },
              { label: 'Degraded', count: degraded, color: 'bg-yellow-400' },
              { label: 'Inactive', count: inactive, color: 'bg-gray-300' },
              { label: 'Down',     count: tunnels.filter((t: Tunnel) => t.status === 'down').length, color: 'bg-red-500' },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">{label}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{count}</span>
                <div className="w-24 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} rounded-full transition-all`}
                    style={{ width: tunnels.length ? `${(count / tunnels.length) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>
          {tunnelsQ.isError && (
            <p className="text-xs text-red-500 mt-3 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Failed to load tunnels
            </p>
          )}
        </Card>

        {/* Recent tunnels */}
        <Card className="lg:col-span-2" padding="none">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Recent Tunnels</h2>
            <Link to="/tunnels" className="text-sm text-[#F6821F] hover:underline">
              View all &rarr;
            </Link>
          </div>
          {tunnelsQ.isLoading ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">Loading tunnels...</div>
          ) : recentTunnels.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              No tunnels yet.{' '}
              <Link to="/tunnels/new" className="text-[#F6821F] hover:underline">
                Create one
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {recentTunnels.map((tunnel: Tunnel) => (
                <Link
                  key={tunnel.id}
                  to={`/tunnels/${tunnel.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{tunnel.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5 font-mono">{tunnel.id.slice(0, 8)}...</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 dark:text-gray-600">
                      {tunnel.connections?.length ?? 0} conn
                    </span>
                    <StatusBadge status={tunnel.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Zones */}
      {(zonesQ.data?.length ?? 0) > 0 && (
        <Card>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-gray-400" />
            Managed Zones
          </h2>
          <div className="flex flex-wrap gap-2">
            {zonesQ.data?.map((z) => (
              <span
                key={z.id}
                className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-xs font-medium border border-blue-100 dark:border-blue-900"
              >
                {z.name}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
