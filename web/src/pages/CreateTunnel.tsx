import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Terminal, Copy, CheckCheck } from 'lucide-react'
import { toast } from 'sonner'
import { tunnelsApi } from '../api/client'
import { Card } from '../components/ui/Card'
import Button from '../components/ui/Button'
import { Input } from '../components/ui/FormControls'
import type { TunnelWithCredentials } from '../api/types'

export default function CreateTunnel() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [created, setCreated] = useState<TunnelWithCredentials | null>(null)
  const [copied, setCopied] = useState(false)

  const mutation = useMutation({
    mutationFn: () => tunnelsApi.create(name.trim()),
    onSuccess: (data) => {
      setCreated(data)
      qc.invalidateQueries({ queryKey: ['tunnels'] })
    },
    onError: (e: Error) => toast.error(`Failed to create tunnel: ${e.message}`),
  })

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (created) {
    const dockerCmd = `docker run cloudflare/cloudflared:latest tunnel --no-autoupdate run --token ${created.token ?? '<TOKEN>'}`
    const linuxCmd  = `sudo cloudflared service install ${created.token ?? '<TOKEN>'}`

    return (
      <div className="max-w-xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-lg">
            OK
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Tunnel Created!</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-gray-700 dark:text-gray-300">{created.name}</span> is ready to run.
            </p>
          </div>
        </div>

        <Card>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-gray-400" />
            Run with Docker
          </h2>
          <div className="relative bg-gray-950 rounded-lg p-3 group">
            <pre className="text-xs text-green-400 whitespace-pre-wrap break-all font-mono">{dockerCmd}</pre>
            <button
              onClick={() => copy(dockerCmd)}
              className="absolute top-2 right-2 p-1.5 rounded bg-gray-800 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
            >
              {copied ? <CheckCheck className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-gray-400" />
            Run on Linux / macOS
          </h2>
          <div className="relative bg-gray-950 rounded-lg p-3 group">
            <pre className="text-xs text-green-400 whitespace-pre-wrap break-all font-mono">{linuxCmd}</pre>
            <button
              onClick={() => copy(linuxCmd)}
              className="absolute top-2 right-2 p-1.5 rounded bg-gray-800 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </Card>

        {created.token && (
          <Card>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tunnel Token</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Store this securely. It allows anyone to run your tunnel.</p>
            <div className="relative bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 group">
              <p className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">{created.token}</p>
              <button
                onClick={() => copy(created.token!)}
                className="absolute top-2 right-2 p-1 rounded text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </Card>
        )}

        <div className="flex gap-3">
          <Button onClick={() => navigate(`/tunnels/${created.id}`)}>
            Go to Tunnel Detail
          </Button>
          <Button variant="secondary" onClick={() => navigate('/tunnels')}>
            Back to Tunnels
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md space-y-6">
      <div>
        <button
          onClick={() => navigate('/tunnels')}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tunnels
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create Tunnel</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Create a new remotely-managed Cloudflare Tunnel.
        </p>
      </div>

      <Card>
        <form
          onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}
          className="space-y-5"
        >
          <Input
            label="Tunnel Name"
            placeholder="e.g. my-homelab"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            helpText="A descriptive name to identify this tunnel. Letters, numbers, and hyphens only."
          />

          <div className="pt-2 flex gap-3">
            <Button
              type="submit"
              loading={mutation.isPending}
              disabled={!name.trim()}
            >
              Create Tunnel
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/tunnels')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">What happens next?</h3>
        <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-decimal list-inside">
          <li>A new tunnel is created and registered with Cloudflare.</li>
          <li>You receive a token to run <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">cloudflared</code> on your server.</li>
          <li>Add public hostnames to route internet traffic to your services.</li>
          <li>Optionally add private network CIDR routes for Zero Trust access.</li>
        </ol>
      </Card>
    </div>
  )
}
