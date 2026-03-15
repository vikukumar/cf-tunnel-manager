// --- API types matching the Go backend models ----------------------------------

export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: { message: string; detail?: string }
}

// --- Tunnel types --------------------------------------------------------------

export type TunnelStatus = 'healthy' | 'degraded' | 'inactive' | 'down'

export interface TunnelConnection {
  id: string
  uuid: string
  colo_name: string
  is_pending_reconnect: boolean
  origin_ip: string
  hostname?: string   // reverse-DNS enriched by backend
  opened_at: string
  client_id: string
  client_version: string
}

export interface Tunnel {
  id: string
  account_tag: string
  name: string
  status: TunnelStatus
  tun_type: string
  remote_config: boolean
  created_at: string
  deleted_at?: string
  conns_active_at?: string
  conns_inactive_at?: string
  connections: TunnelConnection[]
}

export interface TunnelWithCredentials extends Tunnel {
  credentials_file?: {
    AccountTag: string
    TunnelID: string
    TunnelName: string
    TunnelSecret: string
  }
  token?: string
}

// --- Ingress / Config types ----------------------------------------------------

export interface OriginRequest {
  noTLSVerify?: boolean
  connectTimeout?: string        // e.g. "30s"
  tlsTimeout?: string
  tcpKeepAlive?: string
  noHappyEyeballs?: boolean
  keepAliveConnections?: number
  keepAliveTimeout?: string
  http2Origin?: boolean
  http3Origin?: boolean
  proxyType?: string             // "socks" | ""
  proxyAddress?: string
  proxyPort?: number
  bastionMode?: boolean
  disableChunkedEncoding?: boolean
  httpHostHeader?: string
  originServerName?: string
}

export interface IngressRule {
  hostname?: string
  service: string
  path?: string
  originRequest?: OriginRequest
}

export interface TunnelConfigBody {
  ingress: IngressRule[]
  'warp-routing'?: { enabled: boolean }
  originRequest?: OriginRequest
}

export interface TunnelConfig {
  tunnel_id: string
  version: number
  config: TunnelConfigBody
  source: string
  created_at: string
}

// --- DNS types -----------------------------------------------------------------

export interface DNSRecord {
  id: string
  zone_id: string
  zone_name: string
  name: string
  type: string
  content: string
  proxied: boolean
  ttl: number
  created_on: string
  modified_on: string
  comment?: string
}

export interface CreateDNSRecordParams {
  name: string
  type: string
  content: string
  proxied: boolean
  ttl?: number
  comment?: string
}

// --- Zone types ----------------------------------------------------------------

export interface Zone {
  id: string
  name: string
  status: string
  type: string
  paused: boolean
  plan: { name: string }
  account: { id: string; name: string }
}

// --- Network route types -------------------------------------------------------

export interface NetworkRoute {
  id: string
  network: string
  tunnel_id: string
  tunnel_name: string
  comment?: string
  created_at: string
  deleted_at?: string
}

export interface CreateRouteParams {
  network: string
  tunnel_id: string
  comment?: string
}

// --- Auth types ----------------------------------------------------------------

export interface UserInfo {
  email: string
  sub: string
}

// --- Live log types ------------------------------------------------------------

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface TunnelLogEntry {
  time: string
  level: LogLevel
  message: string
  fields?: Record<string, unknown>
}

// The Cloudflare management WebSocket wraps each log line in this envelope.
export interface TunnelLogEvent {
  type: string
  log: TunnelLogEntry
}

// --- Protocol helpers ----------------------------------------------------------

export type ProtocolMode = 'host_port' | 'socket_path' | 'fixed' | 'status_code'

export interface ServiceProtocol {
  label: string
  value: string
  mode: ProtocolMode
  defaultPort: string
  description: string
}

export const SERVICE_PROTOCOLS: ServiceProtocol[] = [
  // HTTP-based
  { label: 'HTTP',           value: 'http',        mode: 'host_port',   defaultPort: '8080',  description: 'Plain HTTP proxy' },
  { label: 'HTTPS',          value: 'https',       mode: 'host_port',   defaultPort: '8443',  description: 'HTTPS proxy (TLS to origin)' },
  { label: 'HTTP/2',         value: 'http2',       mode: 'host_port',   defaultPort: '8080',  description: 'Force HTTP/2 cleartext (h2c) to origin' },
  { label: 'H2MUX',          value: 'h2mux',       mode: 'host_port',   defaultPort: '8080',  description: 'HTTP/2 multiplexed connection' },
  // WebSocket
  { label: 'WebSocket (WS)', value: 'ws',          mode: 'host_port',   defaultPort: '8080',  description: 'WebSocket (plain)' },
  { label: 'WebSocket (WSS)',value: 'wss',         mode: 'host_port',   defaultPort: '8443',  description: 'WebSocket Secure (TLS)' },
  // gRPC
  { label: 'gRPC',           value: 'grpc',        mode: 'host_port',   defaultPort: '50051', description: 'gRPC (plaintext)' },
  { label: 'gRPCS',          value: 'grpcs',       mode: 'host_port',   defaultPort: '50051', description: 'gRPC over TLS' },
  // Network
  { label: 'TCP',            value: 'tcp',         mode: 'host_port',   defaultPort: '1234',  description: 'Raw TCP proxy' },
  { label: 'SSH',            value: 'ssh',         mode: 'host_port',   defaultPort: '22',    description: 'SSH access via browser terminal' },
  { label: 'RDP',            value: 'rdp',         mode: 'host_port',   defaultPort: '3389',  description: 'Remote Desktop Protocol' },
  { label: 'SMB',            value: 'smb',         mode: 'host_port',   defaultPort: '445',   description: 'SMB / Windows file sharing' },
  // Unix sockets
  { label: 'Unix Socket',    value: 'unix',        mode: 'socket_path', defaultPort: '',      description: 'Local Unix domain socket' },
  { label: 'Unix TLS',       value: 'unix+tls',    mode: 'socket_path', defaultPort: '',      description: 'Unix socket with TLS' },
  // Special
  { label: 'Hello World',    value: 'hello_world', mode: 'fixed',       defaultPort: '',      description: 'Built-in test page (no origin needed)' },
  { label: 'HTTP Status',    value: 'http_status', mode: 'status_code', defaultPort: '',      description: 'Return a fixed HTTP status code' },
  { label: 'Bastion',        value: 'bastion',     mode: 'fixed',       defaultPort: '',      description: 'SSH bastion / jump-host mode' },
]
