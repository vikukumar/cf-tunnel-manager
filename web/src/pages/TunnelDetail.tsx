import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, RefreshCw, Plus, Trash2, Copy,
  Globe, Network, Activity, Key, Terminal,
  ChevronDown, ChevronUp, Shield, Zap,
  Pencil, GripVertical, Search, Wand2, AlertCircle,
  CheckCircle2, Monitor, Cpu, FolderOpen, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { clsx } from 'clsx'
import { tunnelsApi, zonesApi, routesApi } from '../api/client'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import StatusBadge from '../components/StatusBadge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { Input, Select, Checkbox } from '../components/ui/FormControls'
import type { IngressRule, NetworkRoute, Zone, OriginRequest, TunnelLogEntry, TunnelLogEvent } from '../api/types'
import { SERVICE_PROTOCOLS } from '../api/types'

type Tab = 'overview' | 'approutes' | 'networkroutes' | 'logs'

// ---------------------------------------------------------------------------
// Advanced origin-request state
// ---------------------------------------------------------------------------

interface AdvancedOptions {
  noTLSVerify: boolean; http2Origin: boolean; http3Origin: boolean
  disableChunkedEncoding: boolean; noHappyEyeballs: boolean; bastionMode: boolean
  httpHostHeader: string; originServerName: string; connectTimeout: string
  tlsTimeout: string; tcpKeepAlive: string; keepAliveConnections: string
  keepAliveTimeout: string; proxyAddress: string; proxyPort: string; proxyType: string
}

const DEFAULT_ADV: AdvancedOptions = {
  noTLSVerify: false, http2Origin: false, http3Origin: false,
  disableChunkedEncoding: false, noHappyEyeballs: false, bastionMode: false,
  httpHostHeader: '', originServerName: '', connectTimeout: '',
  tlsTimeout: '', tcpKeepAlive: '', keepAliveConnections: '',
  keepAliveTimeout: '', proxyAddress: '', proxyPort: '', proxyType: '',
}

function buildOriginRequest(adv: AdvancedOptions): OriginRequest | undefined {
  const or: OriginRequest = {}
  if (adv.noTLSVerify)            or.noTLSVerify            = true
  if (adv.http2Origin)            or.http2Origin            = true
  if (adv.http3Origin)            or.http3Origin            = true
  if (adv.disableChunkedEncoding) or.disableChunkedEncoding = true
  if (adv.noHappyEyeballs)        or.noHappyEyeballs        = true
  if (adv.bastionMode)            or.bastionMode            = true
  if (adv.httpHostHeader)         or.httpHostHeader         = adv.httpHostHeader
  if (adv.originServerName)       or.originServerName       = adv.originServerName
  if (adv.connectTimeout)         or.connectTimeout         = adv.connectTimeout
  if (adv.tlsTimeout)             or.tlsTimeout             = adv.tlsTimeout
  if (adv.tcpKeepAlive)           or.tcpKeepAlive           = adv.tcpKeepAlive
  if (adv.keepAliveConnections)   or.keepAliveConnections   = parseInt(adv.keepAliveConnections)
  if (adv.keepAliveTimeout)       or.keepAliveTimeout       = adv.keepAliveTimeout
  if (adv.proxyAddress)           or.proxyAddress           = adv.proxyAddress
  if (adv.proxyPort)              or.proxyPort              = parseInt(adv.proxyPort)
  if (adv.proxyType)              or.proxyType              = adv.proxyType
  return Object.keys(or).length > 0 ? or : undefined
}

function hasAdvanced(adv: AdvancedOptions): boolean {
  return Object.entries(adv).some(([, v]) => (typeof v === 'boolean' ? v : v !== ''))
}

function buildService(protocol: string, serviceHost: string, servicePort: string, socketPath: string, statusCode: string): string {
  if (protocol === 'hello_world') return 'hello_world'
  if (protocol === 'bastion')     return 'bastion'
  if (protocol === 'http_status') return `http_status:${statusCode}`
  if (protocol === 'unix' || protocol === 'unix+tls') return `${protocol}://${socketPath}`
  if (servicePort) return `${protocol}://${serviceHost}:${servicePort}`
  return `${protocol}://${serviceHost}`
}

// ---------------------------------------------------------------------------
// Domain grouping utilities
// ---------------------------------------------------------------------------

function getApexDomain(hostname: string): string {
  const parts = hostname.replace(/^\*\./, '').split('.')
  if (parts.length <= 2) return parts.join('.')
  return parts.slice(-2).join('.')
}

function groupRulesByDomain(rules: IngressRule[]): Map<string, IngressRule[]> {
  const map = new Map<string, IngressRule[]>()
  for (const rule of rules) {
    const apex = getApexDomain(rule.hostname ?? '')
    if (!map.has(apex)) map.set(apex, [])
    map.get(apex)!.push(rule)
  }
  return map
}

function sortRulesByDomain(rules: IngressRule[]): IngressRule[] {
  return [...rules].sort((a, b) => {
    const apexA = getApexDomain(a.hostname ?? ''), apexB = getApexDomain(b.hostname ?? '')
    if (apexA !== apexB) return apexA.localeCompare(apexB)
    return (a.hostname ?? '').localeCompare(b.hostname ?? '')
  })
}

// ---------------------------------------------------------------------------
// Advanced Options accordion
// ---------------------------------------------------------------------------

function AdvancedAccordion({ adv, setA }: {
  adv: AdvancedOptions
  setA: <K extends keyof AdvancedOptions>(k: K, v: AdvancedOptions[K]) => void
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button type="button" onClick={() => setShow(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
        <span className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-gray-400" />
          Advanced Origin Settings
          {hasAdvanced(adv) && <span className="text-xs bg-orange-100 dark:bg-orange-950/50 text-[#F6821F] px-1.5 py-0.5 rounded-full">configured</span>}
        </span>
        {show ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {show && (
        <div className="p-4 space-y-5 max-h-80 overflow-y-auto bg-white dark:bg-gray-900">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">TLS &amp; Certificate</p>
            <div className="space-y-3">
              <Checkbox label="Skip TLS verification (noTLSVerify)" helpText="Disable cert checks - for self-signed origins." checked={adv.noTLSVerify} onChange={e => setA('noTLSVerify', e.target.checked)} />
              <Input label="TLS SNI hostname" placeholder="internal.example.com" value={adv.originServerName} onChange={e => setA('originServerName', e.target.value)} helpText="Override SNI for cert validation." />
              <Input label="TLS handshake timeout" placeholder="10s" value={adv.tlsTimeout} onChange={e => setA('tlsTimeout', e.target.value)} />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Force Protocol</p>
            <div className="space-y-3">
              <Checkbox label="Force HTTP/2 to origin" helpText="Dial origin using h2c." checked={adv.http2Origin} onChange={e => setA('http2Origin', e.target.checked)} />
              <Checkbox label="Force HTTP/3 / QUIC to origin" helpText="Requires UDP reachability." checked={adv.http3Origin} onChange={e => setA('http3Origin', e.target.checked)} />
              <Checkbox label="Disable chunked encoding" checked={adv.disableChunkedEncoding} onChange={e => setA('disableChunkedEncoding', e.target.checked)} />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Request Headers</p>
            <Input label="Override Host header" placeholder="internal.example.com" value={adv.httpHostHeader} onChange={e => setA('httpHostHeader', e.target.value)} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Connection Tuning</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Connect timeout" placeholder="30s" value={adv.connectTimeout} onChange={e => setA('connectTimeout', e.target.value)} />
              <Input label="TCP keep-alive" placeholder="30s" value={adv.tcpKeepAlive} onChange={e => setA('tcpKeepAlive', e.target.value)} />
              <Input label="Keep-alive connections" type="number" placeholder="100" value={adv.keepAliveConnections} onChange={e => setA('keepAliveConnections', e.target.value)} />
              <Input label="Keep-alive timeout" placeholder="1m30s" value={adv.keepAliveTimeout} onChange={e => setA('keepAliveTimeout', e.target.value)} />
            </div>
            <div className="mt-3">
              <Checkbox label="Disable Happy Eyeballs" helpText="Turn off IPv4/IPv6 dual-stack." checked={adv.noHappyEyeballs} onChange={e => setA('noHappyEyeballs', e.target.checked)} />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Outbound Proxy</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Proxy address" placeholder="127.0.0.1" value={adv.proxyAddress} onChange={e => setA('proxyAddress', e.target.value)} />
              <Input label="Proxy port" type="number" placeholder="1080" value={adv.proxyPort} onChange={e => setA('proxyPort', e.target.value)} />
            </div>
            <div className="mt-3">
              <Select label="Proxy type" value={adv.proxyType} onChange={e => setA('proxyType', e.target.value)}>
                <option value="">None</option>
                <option value="socks">SOCKS5</option>
              </Select>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">SSH</p>
            <Checkbox label="Enable bastion mode" helpText="Makes this tunnel an SSH jump host." checked={adv.bastionMode} onChange={e => setA('bastionMode', e.target.checked)} />
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add Hostname Modal
// ---------------------------------------------------------------------------

function AddHostnameModal({ open, onClose, tunnelId }: { open: boolean; onClose: () => void; tunnelId: string }) {
  const qc     = useQueryClient()
  const zonesQ = useQuery({ queryKey: ['zones'], queryFn: zonesApi.list })
  const [hostname, setHostname]       = useState('')
  const [path, setPath]               = useState('')
  const [protocol, setProtocol]       = useState('http')
  const [serviceHost, setServiceHost] = useState('localhost')
  const [servicePort, setServicePort] = useState('8080')
  const [socketPath, setSocketPath]   = useState('/var/run/app.sock')
  const [statusCode, setStatusCode]   = useState('404')
  const [zoneId, setZoneId]           = useState('')
  const [createDNS, setCreateDNS]     = useState(true)
  const [adv, setAdv]                 = useState<AdvancedOptions>(DEFAULT_ADV)
  const setA = <K extends keyof AdvancedOptions>(k: K, v: AdvancedOptions[K]) => setAdv(a => ({ ...a, [k]: v }))
  const proto = SERVICE_PROTOCOLS.find(p => p.value === protocol) ?? SERVICE_PROTOCOLS[0]
  const svc   = buildService(protocol, serviceHost, servicePort, socketPath, statusCode)

  const handleProtoChange = (v: string) => {
    setProtocol(v)
    const p = SERVICE_PROTOCOLS.find(x => x.value === v)
    if (p?.defaultPort) setServicePort(p.defaultPort)
  }

  function reset() {
    setHostname(''); setPath(''); setProtocol('http')
    setServiceHost('localhost'); setServicePort('8080')
    setSocketPath('/var/run/app.sock'); setStatusCode('404')
    setZoneId(''); setCreateDNS(true); setAdv(DEFAULT_ADV)
  }

  const mutation = useMutation({
    mutationFn: () => tunnelsApi.addIngress(tunnelId, {
      hostname, service: svc, path: path || undefined,
      zone_id: createDNS ? zoneId : undefined,
      create_dns: createDNS && !!zoneId,
      origin_request: buildOriginRequest(adv),
    }),
    onSuccess: () => {
      toast.success(`Added ${hostname}`)
      qc.invalidateQueries({ queryKey: ['tunnel-config', tunnelId] })
      onClose(); reset()
    },
    onError: (e: Error) => toast.error(`Failed: ${e.message}`),
  })

  return (
    <Modal open={open} onClose={() => { onClose(); reset() }} title="Add Application Route" size="full">
      <form onSubmit={e => { e.preventDefault(); mutation.mutate() }} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Input label="Public Hostname" placeholder="app.example.com" value={hostname} onChange={e => setHostname(e.target.value)} required helpText="The public hostname Cloudflare will proxy." />
          </div>
          <Input label="Path prefix (optional)" placeholder="/api" value={path} onChange={e => setPath(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Protocol / Service Type</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {SERVICE_PROTOCOLS.map(p => (
              <button key={p.value} type="button" onClick={() => handleProtoChange(p.value)} title={p.description}
                className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all text-left', protocol === p.value
                  ? 'border-[#F6821F] bg-orange-50 dark:bg-orange-950/40 text-[#F6821F]'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                )}>{p.label}</button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-gray-400">{proto.description}</p>
        </div>
        {proto.mode === 'host_port' && (
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><Input label="Origin Host" placeholder="localhost" value={serviceHost} onChange={e => setServiceHost(e.target.value)} required /></div>
            <Input label="Port" type="number" placeholder={proto.defaultPort || '8080'} value={servicePort} onChange={e => setServicePort(e.target.value)} />
          </div>
        )}
        {proto.mode === 'socket_path' && <Input label="Unix Socket Path" placeholder="/var/run/app.sock" value={socketPath} onChange={e => setSocketPath(e.target.value)} required helpText={`Resolves to: ${protocol}://${socketPath}`} />}
        {proto.mode === 'status_code' && <Input label="HTTP Status Code" type="number" placeholder="404" value={statusCode} onChange={e => setStatusCode(e.target.value)} required />}
        {proto.mode === 'fixed' && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 px-4 py-3 text-sm text-blue-700 dark:text-blue-400">
            Service: <code className="font-mono font-semibold">{svc}</code> - {proto.description}
          </div>
        )}
        {proto.mode !== 'fixed' && <p className="text-xs text-gray-400 dark:text-gray-500">Resolves to: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded font-mono">{svc}</code></p>}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
          <Checkbox label="Auto-create DNS CNAME record" helpText="Creates a proxied CNAME pointing to this tunnel." checked={createDNS} onChange={e => setCreateDNS(e.target.checked)} />
          {createDNS && (
            <Select label="Zone" value={zoneId} onChange={e => setZoneId(e.target.value)}>
              <option value="">Select zone...</option>
              {(zonesQ.data ?? []).map((z: Zone) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </Select>
          )}
        </div>
        <AdvancedAccordion adv={adv} setA={setA} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={() => { onClose(); reset() }}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending} disabled={!hostname}>Add Route</Button>
        </div>
      </form>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Edit Hostname Modal
// ---------------------------------------------------------------------------

function EditHostnameModal({ rule, onClose, tunnelId }: { rule: IngressRule | null; onClose: () => void; tunnelId: string }) {
  const qc = useQueryClient()
  const [protocol, setProtocol]       = useState('http')
  const [serviceHost, setServiceHost] = useState('localhost')
  const [servicePort, setServicePort] = useState('8080')
  const [socketPath, setSocketPath]   = useState('/var/run/app.sock')
  const [statusCode, setStatusCode]   = useState('404')
  const [path, setPath]               = useState('')
  const [adv, setAdv]                 = useState<AdvancedOptions>(DEFAULT_ADV)
  const setA = <K extends keyof AdvancedOptions>(k: K, v: AdvancedOptions[K]) => setAdv(a => ({ ...a, [k]: v }))

  useEffect(() => {
    if (!rule) return
    setPath(rule.path ?? '')
    const svc = rule.service ?? ''
    if (svc === 'hello_world') { setProtocol('hello_world'); return }
    if (svc === 'bastion')     { setProtocol('bastion'); return }
    if (svc.startsWith('http_status:')) { setProtocol('http_status'); setStatusCode(svc.split(':')[1]); return }
    const protoEnd = svc.indexOf('://')
    if (protoEnd === -1) return
    const proto = svc.slice(0, protoEnd)
    const rest  = svc.slice(protoEnd + 3)
    setProtocol(proto)
    if (proto === 'unix' || proto === 'unix+tls') { setSocketPath(rest); return }
    const colonIdx = rest.lastIndexOf(':')
    if (colonIdx !== -1) { setServiceHost(rest.slice(0, colonIdx)); setServicePort(rest.slice(colonIdx + 1)) }
    else { setServiceHost(rest); setServicePort('') }
    if (rule.originRequest) {
      const or = rule.originRequest
      setAdv({
        noTLSVerify: !!or.noTLSVerify, http2Origin: !!or.http2Origin, http3Origin: !!or.http3Origin,
        disableChunkedEncoding: !!or.disableChunkedEncoding, noHappyEyeballs: !!or.noHappyEyeballs, bastionMode: !!or.bastionMode,
        httpHostHeader: or.httpHostHeader ?? '', originServerName: or.originServerName ?? '',
        connectTimeout: or.connectTimeout ?? '', tlsTimeout: or.tlsTimeout ?? '',
        tcpKeepAlive: or.tcpKeepAlive ?? '', keepAliveConnections: or.keepAliveConnections?.toString() ?? '',
        keepAliveTimeout: or.keepAliveTimeout ?? '', proxyAddress: or.proxyAddress ?? '',
        proxyPort: or.proxyPort?.toString() ?? '', proxyType: or.proxyType ?? '',
      })
    }
  }, [rule])

  const proto = SERVICE_PROTOCOLS.find(p => p.value === protocol) ?? SERVICE_PROTOCOLS[0]
  const svc   = buildService(protocol, serviceHost, servicePort, socketPath, statusCode)

  const mutation = useMutation({
    mutationFn: async () => {
      const cached = qc.getQueryData<any>(['tunnel-config', tunnelId])
      if (!cached) throw new Error('Config not loaded — please try again')
      const updatedIngress = (cached.config.ingress ?? []).map((r: IngressRule) =>
        r.hostname === rule!.hostname
          ? { ...r, service: svc, path: path || undefined, originRequest: buildOriginRequest(adv) }
          : r
      )
      await tunnelsApi.updateConfig(tunnelId, { ...cached.config, ingress: updatedIngress })
    },
    onSuccess: () => { toast.success('Route updated'); qc.invalidateQueries({ queryKey: ['tunnel-config', tunnelId] }); onClose() },
    onError: (e: Error) => toast.error(`Update failed: ${e.message}`),
  })

  return (
    <Modal open={!!rule} onClose={onClose} title={`Edit: ${rule?.hostname ?? ''}`} size="full">
      <form onSubmit={e => { e.preventDefault(); mutation.mutate() }} className="space-y-4">
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400">
          Hostname: <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">{rule?.hostname}</span> — hostname cannot be changed here.
        </div>
        <Input label="Path prefix (optional)" placeholder="/api" value={path} onChange={e => setPath(e.target.value)} />
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Protocol / Service Type</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {SERVICE_PROTOCOLS.map(p => (
              <button key={p.value} type="button" onClick={() => setProtocol(p.value)}
                className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all text-left', protocol === p.value
                  ? 'border-[#F6821F] bg-orange-50 dark:bg-orange-950/40 text-[#F6821F]'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                )}>{p.label}</button>
            ))}
          </div>
        </div>
        {proto.mode === 'host_port' && (
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><Input label="Origin Host" placeholder="localhost" value={serviceHost} onChange={e => setServiceHost(e.target.value)} required /></div>
            <Input label="Port" type="number" value={servicePort} onChange={e => setServicePort(e.target.value)} />
          </div>
        )}
        {proto.mode === 'socket_path' && <Input label="Unix Socket Path" value={socketPath} onChange={e => setSocketPath(e.target.value)} required />}
        {proto.mode === 'status_code' && <Input label="HTTP Status Code" type="number" value={statusCode} onChange={e => setStatusCode(e.target.value)} required />}
        <p className="text-xs text-gray-400 dark:text-gray-500">Resolves to: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded font-mono">{svc}</code></p>
        <AdvancedAccordion adv={adv} setA={setA} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>Save Changes</Button>
        </div>
      </form>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Add Route Modal
// ---------------------------------------------------------------------------

function AddRouteModal({ open, onClose, tunnelId }: { open: boolean; onClose: () => void; tunnelId: string }) {
  const qc = useQueryClient()
  const [network, setNetwork] = useState('')
  const [comment, setComment] = useState('')

  const cidrValid = useMemo(() => {
    if (!network) return true
    return /^((\d{1,3}\.){3}\d{1,3}\/\d{1,2}|[0-9a-fA-F:]+\/\d{1,3})$/.test(network)
  }, [network])

  const cidrInfo = useMemo(() => {
    const m = network.match(/^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/)
    if (!m || !cidrValid) return null
    const prefix = parseInt(m[2])
    const hostBits = 32 - prefix
    const hosts = hostBits <= 1 ? (hostBits === 0 ? '1 host' : '2 hosts') : `${(2 ** hostBits - 2).toLocaleString()} hosts`
    return { prefix, hosts, type: prefix >= 24 ? 'subnet' : prefix >= 16 ? 'class B' : 'large range' }
  }, [network, cidrValid])

  const mutation = useMutation({
    mutationFn: () => routesApi.create({ network, tunnel_id: tunnelId, comment: comment || undefined }),
    onSuccess: () => {
      toast.success(`Route ${network} added`)
      qc.invalidateQueries({ queryKey: ['tunnel-routes', tunnelId] })
      onClose(); setNetwork(''); setComment('')
    },
    onError: (e: Error) => toast.error(`Failed: ${e.message}`),
  })

  return (
    <Modal open={open} onClose={onClose} title="Add Network Route (CIDR)" size="md">
      <form onSubmit={e => { e.preventDefault(); mutation.mutate() }} className="space-y-4">
        <Input label="IP CIDR Network" placeholder="192.168.1.0/24" value={network} onChange={e => setNetwork(e.target.value)} required
          error={network && !cidrValid ? 'Invalid CIDR (e.g. 10.0.0.0/8 or 2001:db8::/32)' : undefined}
          helpText="IPv4 or IPv6 CIDR accessible to WARP users via this tunnel." />
        {cidrInfo && (
          <div className="flex gap-2 text-xs">
            <span className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900 px-2.5 py-1 rounded-full font-medium">{cidrInfo.hosts}</span>
            <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2.5 py-1 rounded-full font-medium">/{cidrInfo.prefix} - {cidrInfo.type}</span>
          </div>
        )}
        <Input label="Comment (optional)" placeholder="Office LAN, Dev VPC..." value={comment} onChange={e => setComment(e.target.value)} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending} disabled={!network || !cidrValid}>Add Route</Button>
        </div>
      </form>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Origin badge summary
// ---------------------------------------------------------------------------

function OriginBadges({ or }: { or?: OriginRequest }) {
  if (!or) return null
  const badges: { label: string; color: string }[] = []
  if (or.noTLSVerify)            badges.push({ label: 'TLS skip', color: 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400' })
  if (or.http2Origin)            badges.push({ label: 'HTTP/2',   color: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400' })
  if (or.http3Origin)            badges.push({ label: 'HTTP/3',   color: 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400' })
  if (or.bastionMode)            badges.push({ label: 'bastion',  color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' })
  if (or.disableChunkedEncoding) badges.push({ label: 'no-chunk', color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' })
  if (or.proxyType)              badges.push({ label: or.proxyType, color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' })
  if (!badges.length) return null
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {badges.map(b => <span key={b.label} className={clsx('text-[10px] px-1.5 py-0.5 rounded-full font-medium', b.color)}>{b.label}</span>)}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Live Logs Tab
// ---------------------------------------------------------------------------

const LOG_COLORS: Record<string, string> = {
  debug: 'text-gray-600', info: 'text-green-500', warn: 'text-yellow-400', error: 'text-red-400',
}
const LOG_BG: Record<string, string> = { warn: 'bg-yellow-950/20', error: 'bg-red-950/30' }

function LogsTab({ tunnelId }: { tunnelId: string }) {
  const [logs, setLogs]               = useState<TunnelLogEntry[]>([])
  const [streaming, setStreaming]     = useState(false)
  const [levelFilter, setLevelFilter] = useState('all')
  const [search, setSearch]           = useState('')
  const esRef      = useRef<EventSource | null>(null)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const autoScroll = useRef(true)

  const stop = useCallback(() => { esRef.current?.close(); esRef.current = null; setStreaming(false) }, [])

  function start() {
    stop(); setLogs([]); setStreaming(true)
    const es = tunnelsApi.streamLogs(tunnelId)
    esRef.current = es
    es.onmessage = (e: MessageEvent<string>) => {
      try {
        const event = JSON.parse(e.data) as TunnelLogEvent
        const entry = event.log ?? { time: new Date().toISOString(), level: 'info', message: e.data }
        setLogs(prev => [...prev.slice(-1999), entry])
      } catch {
        setLogs(prev => [...prev.slice(-1999), { time: new Date().toISOString(), level: 'info', message: e.data }])
      }
    }
    es.addEventListener('error', (e: Event) => {
      const data = (e as MessageEvent<string>).data ?? ''
      if (data) setLogs(prev => [...prev, { time: new Date().toISOString(), level: 'error', message: data }])
      stop()
    })
  }

  useEffect(() => () => stop(), [stop])
  useEffect(() => { if (autoScroll.current && bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' }) }, [logs])

  const filtered = useMemo(() => {
    let list = levelFilter === 'all' ? logs : logs.filter(l => l.level === levelFilter)
    if (search.trim()) list = list.filter(l => l.message.toLowerCase().includes(search.toLowerCase()))
    return list
  }, [logs, levelFilter, search])

  const counts = logs.reduce<Record<string, number>>((acc, l) => { acc[l.level] = (acc[l.level] ?? 0) + 1; return acc }, {})

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {!streaming
          ? <Button size="sm" onClick={start}><Activity className="w-3.5 h-3.5" /> Start Streaming</Button>
          : <Button size="sm" variant="danger" onClick={stop}><X className="w-3.5 h-3.5" /> Stop</Button>
        }
        {logs.length > 0 && <Button size="sm" variant="secondary" onClick={() => setLogs([])}>Clear</Button>}
        {['all', 'debug', 'info', 'warn', 'error'].map(l => (
          <button key={l} onClick={() => setLevelFilter(l)}
            className={clsx('px-2.5 py-1 text-xs rounded-full font-medium transition-colors border', levelFilter === l
              ? 'bg-[#F6821F] text-white border-[#F6821F]'
              : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
            )}>
            {l}{l !== 'all' && counts[l] ? ` (${counts[l]})` : ''}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="text" placeholder="Filter logs..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#F6821F] w-48" />
        </div>
      </div>
      <div className="bg-gray-950 rounded-xl border border-gray-800 h-[480px] overflow-y-auto p-4 font-mono text-xs"
        onScroll={e => { const el = e.currentTarget; autoScroll.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60 }}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Terminal className="w-8 h-8 text-gray-700" />
            <p className="text-gray-500">{streaming ? 'Waiting for log events...' : 'Click "Start Streaming" to connect to cloudflared.'}</p>
          </div>
        ) : (
          filtered.map((entry, i) => (
            <div key={i} className={clsx('flex gap-3 py-0.5 px-2 rounded hover:bg-gray-900 transition-colors', LOG_BG[entry.level])}>
              <span className="text-gray-600 shrink-0 select-none">{entry.time ? new Date(entry.time).toLocaleTimeString() : '--:--:--'}</span>
              <span className={clsx('uppercase text-[10px] font-bold w-9 shrink-0 mt-0.5', LOG_COLORS[entry.level] ?? 'text-gray-400')}>{entry.level}</span>
              <span className="text-gray-300 break-all">{entry.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-600">Logs streamed from cloudflared management endpoint. Up to 2,000 entries in memory.</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Error Pages Section
// ---------------------------------------------------------------------------

function ErrorPagesSection({ tunnelId }: { tunnelId: string }) {
  const qc      = useQueryClient()
  const configQ = useQuery({ queryKey: ['tunnel-config', tunnelId], queryFn: () => tunnelsApi.getConfig(tunnelId) })
  const [expanded, setExpanded]           = useState(false)
  const [catchAllService, setCatchAll]    = useState('http_status:404')
  const [customService, setCustom]        = useState('')

  const catchAllRule = useMemo(() => {
    const rules = configQ.data?.config.ingress ?? []
    return rules.find((r: IngressRule) => !r.hostname) ?? null
  }, [configQ.data])

  useEffect(() => { if (catchAllRule) setCatchAll(catchAllRule.service ?? 'http_status:404') }, [catchAllRule])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const cfg      = configQ.data!
      const named    = (cfg.config.ingress ?? []).filter((r: IngressRule) => r.hostname)
      const newCatch: IngressRule = { service: catchAllService === 'custom' ? customService : catchAllService }
      await tunnelsApi.updateConfig(tunnelId, { ...cfg.config, ingress: [...named, newCatch] })
    },
    onSuccess: () => { toast.success('Error page updated'); qc.invalidateQueries({ queryKey: ['tunnel-config', tunnelId] }) },
    onError: (e: Error) => toast.error(`Failed: ${e.message}`),
  })

  const presets = [
    { label: '404 Not Found',           value: 'http_status:404' },
    { label: '503 Unavailable',         value: 'http_status:503' },
    { label: '200 OK',                  value: 'http_status:200' },
    { label: 'Hello World Page',        value: 'hello_world' },
    { label: 'Custom service URL',      value: 'custom' },
  ]

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300">
        <span className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-gray-400" />
          Default Error / Catch-all Rule
          {catchAllRule && (
            <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full font-mono">{catchAllRule.service}</span>
          )}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {expanded && (
        <div className="p-5 bg-white dark:bg-gray-900 space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">The catch-all rule handles requests not matching any hostname - it is always the last ingress rule.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {presets.map(p => (
              <button key={p.value} type="button" onClick={() => setCatchAll(p.value)}
                className={clsx('px-3 py-2 rounded-xl text-xs font-medium border transition-all text-left', catchAllService === p.value
                  ? 'border-[#F6821F] bg-orange-50 dark:bg-orange-950/40 text-[#F6821F]'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                )}>{p.label}</button>
            ))}
          </div>
          {catchAllService === 'custom' && (
            <Input label="Custom service URL" placeholder="http://error-page.internal:8080" value={customService} onChange={e => setCustom(e.target.value)} />
          )}
          <div className="flex justify-end">
            <Button size="sm" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Save Error Page
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// App Routes Tab
// ---------------------------------------------------------------------------

function AppRoutesTab({ ingress, tunnelId, loading, onAdd, onSave }: {
  ingress: IngressRule[]; tunnelId: string; loading: boolean
  onAdd: () => void; onSave: (rules: IngressRule[]) => void
}) {
  const qc = useQueryClient()
  const [search, setSearch]         = useState('')
  const [grouped, setGrouped]       = useState(false)
  const [editRule, setEditRule]     = useState<IngressRule | null>(null)
  const [localRules, setLocalRules] = useState<IngressRule[]>([])
  const dragIdx      = useRef<number | null>(null)
  const didMove      = useRef(false)
  const localRulesRef = useRef<IngressRule[]>([])
  const scrollRafRef = useRef<number | null>(null)

  useEffect(() => { setLocalRules(ingress) }, [ingress])
  useEffect(() => { localRulesRef.current = localRules }, [localRules])

  // Auto-scroll the window when dragging near top / bottom edge
  useEffect(() => {
    const ZONE = 80  // px from viewport edge
    const SPEED = 14 // px per frame

    function onWindowDragOver(e: DragEvent) {
      if (dragIdx.current === null) return
      const y = e.clientY
      const h = window.innerHeight
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current)
      const drift = y < ZONE ? -SPEED : y > h - ZONE ? SPEED : 0
      if (drift === 0) return
      const loop = () => {
        if (dragIdx.current === null) return
        window.scrollBy(0, drift)
        scrollRafRef.current = requestAnimationFrame(loop)
      }
      scrollRafRef.current = requestAnimationFrame(loop)
    }
    function stopScroll() {
      if (scrollRafRef.current) { cancelAnimationFrame(scrollRafRef.current); scrollRafRef.current = null }
    }
    window.addEventListener('dragover', onWindowDragOver)
    window.addEventListener('dragend',  stopScroll)
    window.addEventListener('drop',     stopScroll)
    return () => {
      window.removeEventListener('dragover', onWindowDragOver)
      window.removeEventListener('dragend',  stopScroll)
      window.removeEventListener('drop',     stopScroll)
      stopScroll()
    }
  }, [])

  const removeIngress = useMutation({
    mutationFn: (hostname: string) => tunnelsApi.removeIngress(tunnelId, hostname),
    onSuccess: () => { toast.success('Route removed'); qc.invalidateQueries({ queryKey: ['tunnel-config', tunnelId] }) },
    onError: (e: Error) => toast.error(`Remove failed: ${e.message}`),
  })

  const filteredRules = useMemo(() => {
    if (!search.trim()) return localRules
    const q = search.toLowerCase()
    return localRules.filter(r => r.hostname?.toLowerCase().includes(q) || r.service.toLowerCase().includes(q))
  }, [localRules, search])

  function onDragStart(idx: number) { dragIdx.current = idx; didMove.current = false }
  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    if (dragIdx.current === null || dragIdx.current === idx) return
    const next = [...localRulesRef.current]
    const [moved] = next.splice(dragIdx.current, 1)
    next.splice(idx, 0, moved)
    dragIdx.current = idx
    didMove.current = true
    setLocalRules(next)
  }
  function onDragEnd() {
    const movedIdx = dragIdx.current
    dragIdx.current = null
    if (scrollRafRef.current) { cancelAnimationFrame(scrollRafRef.current); scrollRafRef.current = null }
    if (didMove.current && movedIdx !== null) {
      didMove.current = false
      onSave(localRulesRef.current)
    }
  }

  function autoArrange() {
    const sorted = sortRulesByDomain(localRulesRef.current)
    setLocalRules(sorted)
    localRulesRef.current = sorted
    onSave(sorted)
    toast.success('Sorted by domain')
  }

  const groups = useMemo(() => grouped ? groupRulesByDomain(filteredRules) : null, [grouped, filteredRules])

  const renderRow = (rule: IngressRule, idx: number) => (
    <tr key={rule.hostname} draggable onDragStart={() => onDragStart(idx)} onDragOver={e => onDragOver(e, idx)} onDragEnd={onDragEnd}
      className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-default">
      <td className="px-3 py-3 w-8">
        <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-700 cursor-grab group-hover:text-gray-400 dark:group-hover:text-gray-500 transition-colors" />
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <div>
            <a href={`https://${rule.hostname}`} target="_blank" rel="noopener noreferrer"
              className="font-medium text-gray-900 dark:text-gray-100 hover:text-[#F6821F] transition-colors text-sm">{rule.hostname}</a>
            {rule.path && <span className="ml-1 text-xs text-gray-400 font-mono">{rule.path}</span>}
            <OriginBadges or={rule.originRequest} />
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-md">{rule.service}</span>
      </td>
      <td className="px-3 py-3 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setEditRule(rule)} className="p-1.5 rounded-lg text-gray-400 hover:text-[#F6821F] hover:bg-orange-50 dark:hover:bg-orange-950/40 transition-all" title="Edit">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => removeIngress.mutate(rule.hostname!)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all" title="Remove">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-gray-500 dark:text-gray-400 flex-1 min-w-0">Published application routes expose local services to the internet via Cloudflare.</p>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input type="text" placeholder="Search routes..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#F6821F] w-44" />
          </div>
          <button onClick={() => setGrouped(v => !v)} title="Toggle domain grouping"
            className={clsx('p-1.5 rounded-lg border transition-all', grouped ? 'border-[#F6821F] bg-orange-50 dark:bg-orange-950/40 text-[#F6821F]' : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-gray-300 dark:hover:border-gray-600')}>
            <FolderOpen className="w-3.5 h-3.5" />
          </button>
          <button onClick={autoArrange} title="Auto-arrange by domain"
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:border-[#F6821F] hover:text-[#F6821F] hover:bg-orange-50 dark:hover:bg-orange-950/40 transition-all">
            <Wand2 className="w-3.5 h-3.5" />
          </button>
          <Button size="sm" onClick={onAdd}><Plus className="w-3.5 h-3.5" /> Add Route</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-sm text-gray-400">Loading...</div>
      ) : localRules.length === 0 ? (
        <Card className="text-center py-12">
          <Globe className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No application routes configured.</p>
          <button onClick={onAdd} className="mt-3 text-sm text-[#F6821F] hover:underline">+ Add your first route</button>
        </Card>
      ) : groups ? (
        <div className="space-y-4">
          {Array.from(groups.entries()).map(([domain, domainRules]) => (
            <div key={domain} className="animate-fade-in-up">
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <Globe className="w-3.5 h-3.5 text-[#F6821F]" />
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{domain}</span>
                <span className="text-xs text-gray-400 ml-auto">{domainRules.length} route{domainRules.length !== 1 ? 's' : ''}</span>
              </div>
              <Card padding="none">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">{domainRules.map((r, i) => renderRow(r, i))}</tbody>
                </table>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-3 py-3 w-8" />
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Hostname</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Service</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">{filteredRules.map((r, i) => renderRow(r, i))}</tbody>
          </table>
        </Card>
      )}

      <ErrorPagesSection tunnelId={tunnelId} />
      <EditHostnameModal rule={editRule} onClose={() => setEditRule(null)} tunnelId={tunnelId} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Network Routes Tab
// ---------------------------------------------------------------------------

function NetworkRoutesTab({ routes, tunnelId, loading, onAdd }: {
  routes: NetworkRoute[]; tunnelId: string; loading: boolean; onAdd: () => void
}) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  const deleteRoute = useMutation({
    mutationFn: (routeId: string) => routesApi.delete(routeId),
    onSuccess: () => { toast.success('Route deleted'); qc.invalidateQueries({ queryKey: ['tunnel-routes', tunnelId] }) },
    onError: (e: Error) => toast.error(`Delete failed: ${e.message}`),
  })

  const filtered = useMemo(() => {
    if (!search.trim()) return routes
    const q = search.toLowerCase()
    return routes.filter(r => r.network.includes(q) || (r.comment ?? '').toLowerCase().includes(q))
  }, [routes, search])

  function parseCIDRInfo(cidr: string) {
    const m = cidr.match(/^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/)
    if (!m) return null
    const prefix = parseInt(m[2]), hostBits = 32 - prefix
    const hosts = hostBits <= 1 ? (hostBits === 0 ? '1' : '2') : (2 ** hostBits - 2).toLocaleString()
    return { prefix, hosts }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-gray-500 dark:text-gray-400 flex-1 min-w-0">Private network routes let Zero Trust WARP users reach private IPs through this tunnel.</p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="text" placeholder="Search CIDR..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#F6821F] w-44" />
        </div>
        <Button size="sm" onClick={onAdd}><Plus className="w-3.5 h-3.5" /> Add Route</Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-sm text-gray-400">Loading routes...</div>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-12">
          <Network className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">{routes.length === 0 ? 'No private network routes configured.' : 'No routes match your search.'}</p>
          {routes.length === 0 && <button onClick={onAdd} className="mt-3 text-sm text-[#F6821F] hover:underline">+ Add a private network route</button>}
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(route => {
            const info = parseCIDRInfo(route.network)
            return (
              <div key={route.id} className="group flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm transition-all animate-fade-in-up">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0">
                  <Network className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono font-semibold text-gray-900 dark:text-gray-100 text-sm">{route.network}</p>
                  {route.comment && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{route.comment}</p>}
                </div>
                {info && (
                  <div className="flex gap-1.5 shrink-0">
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">/{info.prefix}</span>
                    <span className="text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full hidden sm:block">{info.hosts} hosts</span>
                  </div>
                )}
                <span className="text-xs text-gray-400 dark:text-gray-600 hidden md:block shrink-0">{new Date(route.created_at).toLocaleDateString()}</span>
                <button onClick={() => deleteRoute.mutate(route.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------

function OverviewTab({ tunnel, configQ, warpEnabled, toggleWarp, tokenVisible, setTokenVisible, tokenQ, copy }: {
  tunnel: any; configQ: any; warpEnabled: boolean; toggleWarp: any
  tokenVisible: boolean; setTokenVisible: (v: boolean) => void; tokenQ: any; copy: (s: string) => void
}) {
  const ingress = (configQ.data?.config.ingress ?? []).filter((r: IngressRule) => r.hostname)
  const token   = tokenQ.data?.token ?? ''

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card>
        <CardHeader><CardTitle>Tunnel Info</CardTitle></CardHeader>
        <dl className="space-y-3 text-sm">
          {([
            { label: 'ID',            value: <span className="font-mono text-xs break-all text-gray-600 dark:text-gray-400">{tunnel.id}</span> },
            { label: 'Status',        value: <StatusBadge status={tunnel.status} /> },
            { label: 'Type',          value: <span className="text-gray-700 dark:text-gray-300">{tunnel.tun_type}</span> },
            { label: 'Remote Config', value: <span className={tunnel.remote_config ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}>{tunnel.remote_config ? 'Yes' : 'No'}</span> },
            { label: 'Created',       value: <span className="text-gray-600 dark:text-gray-400">{new Date(tunnel.created_at).toLocaleString()}</span> },
            { label: 'Config ver.',   value: <span className="text-gray-700 dark:text-gray-300">{configQ.data ? `v${configQ.data.version}` : '...'}</span> },
            { label: 'App routes',    value: <span className="text-gray-700 dark:text-gray-300">{configQ.isLoading ? '...' : ingress.length}</span> },
          ] as { label: string; value: React.ReactNode }[]).map(({ label, value }) => (
            <div key={label} className="flex justify-between items-start">
              <dt className="text-gray-500 dark:text-gray-400 shrink-0 mr-4">{label}</dt>
              <dd className="text-right">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Cpu className="w-4 h-4 text-gray-400" />Connected Connectors</CardTitle>
          <span className={clsx('text-xs px-2.5 py-0.5 rounded-full font-semibold', (tunnel.connections?.length ?? 0) > 0
            ? 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
          )}>
            {tunnel.connections?.length ?? 0} node{tunnel.connections?.length !== 1 ? 's' : ''}
          </span>
        </CardHeader>
        {(tunnel.connections ?? []).length === 0 ? (
          <div className="flex flex-col items-center py-6 gap-2">
            <Monitor className="w-8 h-8 text-gray-300 dark:text-gray-700" />
            <p className="text-sm text-gray-400 dark:text-gray-600 text-center">No connectors online. Run cloudflared to connect.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tunnel.connections.map((conn: any) => {
              const connAge = conn.opened_at ? (() => {
                const ms = Date.now() - new Date(conn.opened_at).getTime()
                const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000)
                return h > 0 ? `${h}h ${m}m` : `${m}m`
              })() : null
              return (
                <div key={conn.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 overflow-hidden">
                  {/* Header row */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <span className={clsx('w-2 h-2 rounded-full shrink-0', conn.is_pending_reconnect ? 'bg-yellow-500 animate-pulse' : 'bg-green-500')} />
                      <span className="text-xs font-bold text-gray-900 dark:text-gray-100 font-mono bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">{conn.colo_name}</span>
                      <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', conn.is_pending_reconnect
                        ? 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400'
                        : 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400'
                      )}>{conn.is_pending_reconnect ? 'reconnecting' : 'connected'}</span>
                    </div>
                    {connAge && <span className="text-xs text-gray-400 dark:text-gray-500">uptime {connAge}</span>}
                  </div>
                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 px-4 py-3 text-xs">
                    <div>
                      <p className="text-gray-400 dark:text-gray-500 mb-0.5">Public IP</p>
                      <p className="font-mono font-semibold text-gray-900 dark:text-gray-100">{conn.origin_ip || <span className="text-gray-400">unknown</span>}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 dark:text-gray-500 mb-0.5">Hostname</p>
                      <p className="font-mono text-gray-700 dark:text-gray-300 truncate" title={conn.hostname}>
                        {conn.hostname || <span className="text-gray-400 italic">no PTR record</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 dark:text-gray-500 mb-0.5">Connector ID</p>
                      <p className="font-mono text-gray-600 dark:text-gray-400 truncate text-[10px]" title={conn.client_id}>{conn.client_id?.slice(0, 18) ?? '—'}…</p>
                    </div>
                    <div>
                      <p className="text-gray-400 dark:text-gray-500 mb-0.5">cloudflared version</p>
                      <p className="font-mono text-gray-700 dark:text-gray-300">v{conn.client_version}</p>
                    </div>
                    {conn.opened_at && (
                      <div className="col-span-2">
                        <p className="text-gray-400 dark:text-gray-500 mb-0.5">Connected since</p>
                        <p className="text-gray-700 dark:text-gray-300">{new Date(conn.opened_at).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Zap className="w-4 h-4 text-gray-400" />WARP Routing</CardTitle>
          <div className="flex items-center gap-2">
            <span className={clsx('text-xs font-medium', warpEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-400')}>
              {configQ.isLoading ? '...' : warpEnabled ? 'Enabled' : 'Disabled'}
            </span>
            <button onClick={() => toggleWarp.mutate(!warpEnabled)} disabled={configQ.isLoading || toggleWarp.isPending}
              className={clsx('relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 focus:outline-none', warpEnabled ? 'bg-[#F6821F]' : 'bg-gray-300 dark:bg-gray-600')}>
              <span className={clsx('inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform', warpEnabled ? 'translate-x-4' : 'translate-x-1')} />
            </button>
          </div>
        </CardHeader>
        <p className="text-xs text-gray-500 dark:text-gray-400">Allows WARP users with matching private network routes to reach private IPs through this tunnel.</p>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Key className="w-4 h-4 text-gray-400" />Run Token</CardTitle>
          <Button size="sm" variant="secondary" onClick={() => setTokenVisible(!tokenVisible)}>{tokenVisible ? 'Hide' : 'Reveal'}</Button>
        </CardHeader>
        {tokenVisible ? (
          <div className="space-y-3">
            {tokenQ.isLoading ? <p className="text-sm text-gray-400">Loading...</p> : (
              <>
                <div className="relative bg-gray-950 rounded-xl p-3 border border-gray-800">
                  <p className="text-xs font-mono text-green-400 break-all pr-8">{token}</p>
                  <button onClick={() => copy(token)} className="absolute top-2 right-2 p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors"><Copy className="w-3.5 h-3.5" /></button>
                </div>
                {[
                  { label: 'Docker', cmd: `docker run cloudflare/cloudflared:latest tunnel --no-autoupdate run --token ${token}` },
                  { label: 'Linux',  cmd: `cloudflared tunnel --no-autoupdate run --token ${token}` },
                ].map(({ label, cmd }) => (
                  <div key={label} className="relative bg-gray-950 rounded-xl p-3 border border-gray-800">
                    <p className="text-xs text-gray-500 mb-1 font-medium">{label}</p>
                    <p className="text-xs font-mono text-green-400 break-all pr-8">{cmd}</p>
                    <button onClick={() => copy(cmd)} className="absolute top-2 right-2 p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors"><Copy className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500">Click "Reveal" to show the cloudflared run token.</p>
        )}
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main TunnelDetail page
// ---------------------------------------------------------------------------

export default function TunnelDetail() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc       = useQueryClient()

  const [tab, setTab]                   = useState<Tab>('overview')
  const [addHostnameOpen, setAddHost]   = useState(false)
  const [addRouteOpen, setAddRoute]     = useState(false)
  const [tokenVisible, setTokenVisible] = useState(false)

  const tunnelQ = useQuery({
    queryKey: ['tunnel', id], queryFn: () => tunnelsApi.get(id!), refetchInterval: 15_000,
  })
  const configQ = useQuery({
    queryKey: ['tunnel-config', id], queryFn: () => tunnelsApi.getConfig(id!), enabled: !!id,
  })
  const tokenQ = useQuery({
    queryKey: ['tunnel-token', id], queryFn: () => tunnelsApi.getToken(id!), enabled: tokenVisible, staleTime: Infinity,
  })
  const routesQ = useQuery({
    queryKey: ['tunnel-routes', id], queryFn: () => tunnelsApi.listRoutes(id!), enabled: tab === 'networkroutes',
  })

  const toggleWarp = useMutation({
    mutationFn: (enabled: boolean) => tunnelsApi.updateWarpRouting(id!, enabled),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tunnel-config', id] }); toast.success('WARP routing updated') },
    onError: (e: Error) => toast.error(`Update failed: ${e.message}`),
  })

  const saveOrder = useMutation({
    mutationFn: (rules: IngressRule[]) => {
      const cfg      = configQ.data!
      const catchAll = (cfg.config.ingress ?? []).find((r: IngressRule) => !r.hostname)
      const newIngress = catchAll ? [...rules, catchAll] : rules
      return tunnelsApi.updateConfig(id!, { ...cfg.config, ingress: newIngress })
    },
    onSuccess: () => { toast.success('Order saved'); qc.invalidateQueries({ queryKey: ['tunnel-config', id] }) },
    onError: (e: Error) => toast.error(`Save failed: ${e.message}`),
  })

  function copy(text: string) { navigator.clipboard.writeText(text); toast.success('Copied!') }

  const tunnel      = tunnelQ.data
  const ingress     = (configQ.data?.config.ingress ?? []).filter((r: IngressRule) => r.hostname)
  const routes      = routesQ.data ?? []
  const warpEnabled = configQ.data?.config['warp-routing']?.enabled ?? false

  const TABS = [
    { id: 'overview'      as Tab, label: 'Overview',        icon: Activity, count: null },
    { id: 'approutes'     as Tab, label: 'App Routes',      icon: Globe,    count: ingress.length },
    { id: 'networkroutes' as Tab, label: 'Network Routes',  icon: Network,  count: routes.length },
    { id: 'logs'          as Tab, label: 'Live Logs',       icon: Terminal, count: null },
  ]

  if (tunnelQ.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 border-2 border-[#F6821F] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading tunnel...</p>
      </div>
    )
  }

  if (tunnelQ.isError || !tunnel) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-sm text-red-500 mb-4">Failed to load tunnel</p>
        <Button variant="secondary" onClick={() => navigate('/tunnels')}>Back to Tunnels</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => navigate('/tunnels')} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mb-2 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> All Tunnels
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{tunnel.name}</h1>
            <StatusBadge status={tunnel.status} />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-600 font-mono mt-1">{tunnel.id}</p>
        </div>
        <button onClick={() => tunnelQ.refetch()} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <RefreshCw className={clsx('w-4 h-4', tunnelQ.isFetching && 'animate-spin')} />
        </button>
      </div>

      <div className="flex border-b border-gray-200 dark:border-gray-800 gap-0.5 overflow-x-auto">
        {TABS.map(({ id: tabId, label, icon: Icon, count }) => (
          <button key={tabId} onClick={() => setTab(tabId)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all duration-150 whitespace-nowrap',
              tab === tabId
                ? 'border-[#F6821F] text-[#F6821F]'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-700',
            )}>
            <Icon className="w-3.5 h-3.5" />
            {label}
            {count !== null && count > 0 && (
              <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="animate-fade-in-up" key={tab}>
        {tab === 'overview' && (
          <OverviewTab tunnel={tunnel} configQ={configQ} warpEnabled={warpEnabled} toggleWarp={toggleWarp}
            tokenVisible={tokenVisible} setTokenVisible={setTokenVisible} tokenQ={tokenQ} copy={copy} />
        )}
        {tab === 'approutes' && (
          <>
            <AppRoutesTab ingress={ingress} tunnelId={id!} loading={configQ.isLoading}
              onAdd={() => setAddHost(true)} onSave={rules => saveOrder.mutate(rules)} />
            <AddHostnameModal open={addHostnameOpen} onClose={() => setAddHost(false)} tunnelId={id!} />
          </>
        )}
        {tab === 'networkroutes' && (
          <>
            <NetworkRoutesTab routes={routes} tunnelId={id!} loading={routesQ.isLoading} onAdd={() => setAddRoute(true)} />
            <AddRouteModal open={addRouteOpen} onClose={() => setAddRoute(false)} tunnelId={id!} />
          </>
        )}
        {tab === 'logs' && <LogsTab tunnelId={id!} />}
      </div>
    </div>
  )
}
