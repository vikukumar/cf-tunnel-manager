import type {
  APIResponse,
  Tunnel,
  TunnelWithCredentials,
  TunnelConfig,
  TunnelConfigBody,
  Zone,
  DNSRecord,
  CreateDNSRecordParams,
  NetworkRoute,
  CreateRouteParams,
  UserInfo,
  OriginRequest,
} from './types'

const BASE = '/api'

class APIError extends Error {
  constructor(
    message: string,
    public readonly detail?: string,
    public readonly status?: number,
  ) {
    super(message)
    this.name = 'APIError'
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body != null ? JSON.stringify(body) : undefined,
    credentials: 'include', // send CF_Authorization cookie
  })

  const json = (await res.json()) as APIResponse<T>

  if (!json.success || !res.ok) {
    throw new APIError(
      json.error?.message ?? `HTTP ${res.status}`,
      json.error?.detail,
      res.status,
    )
  }

  return json.data as T
}

const get  = <T>(path: string) => request<T>('GET',    path)
const post = <T>(path: string, body: unknown) => request<T>('POST',   path, body)
const put  = <T>(path: string, body: unknown) => request<T>('PUT',    path, body)
const del  = <T>(path: string, body?: unknown) => request<T>('DELETE', path, body)

// --- Auth ----------------------------------------------------------------------
export const authApi = {
  me: () => get<UserInfo>('/auth/me'),
}

// --- Tunnels -------------------------------------------------------------------
export const tunnelsApi = {
  list:         ()                              => get<Tunnel[]>('/tunnels'),
  get:          (id: string)                    => get<Tunnel>(`/tunnels/${id}`),
  create:       (name: string)                  => post<TunnelWithCredentials>('/tunnels', { name }),
  delete:       (id: string)                    => del<{ id: string }>(`/tunnels/${id}`),
  getToken:     (id: string)                    => get<{ token: string }>(`/tunnels/${id}/token`),
  getConfig:    (id: string)                    => get<TunnelConfig>(`/tunnels/${id}/config`),
  updateConfig: (id: string, cfg: TunnelConfigBody) => put<TunnelConfig>(`/tunnels/${id}/config`, cfg),

  addIngress: (id: string, params: {
    hostname: string
    service: string
    path?: string
    zone_id?: string
    create_dns?: boolean
    origin_request?: OriginRequest
  }) => post<TunnelConfig>(`/tunnels/${id}/ingress`, params),

  removeIngress: (id: string, hostname: string) =>
    del<TunnelConfig>(`/tunnels/${id}/ingress/${encodeURIComponent(hostname)}`),

  listRoutes: (id: string) => get<NetworkRoute[]>(`/tunnels/${id}/routes`),

  updateWarpRouting: (id: string, enabled: boolean) =>
    put<TunnelConfig>(`/tunnels/${id}/warp-routing`, { enabled }),

  /** Returns an EventSource that streams live log messages as SSE. */
  streamLogs: (id: string): EventSource =>
    new EventSource(`${BASE}/tunnels/${id}/logs`, { withCredentials: true }),
}

// --- Zones ---------------------------------------------------------------------
export const zonesApi = {
  list: () => get<Zone[]>('/zones'),
}

// --- DNS -----------------------------------------------------------------------
export const dnsApi = {
  list:   (zoneId: string) => get<DNSRecord[]>(`/zones/${zoneId}/dns`),
  create: (zoneId: string, params: CreateDNSRecordParams) =>
    post<DNSRecord>(`/zones/${zoneId}/dns`, params),
  delete: (zoneId: string, recordId: string) =>
    del<{ id: string }>(`/zones/${zoneId}/dns/${recordId}`),
}

// --- Private network routes ----------------------------------------------------
export const routesApi = {
  list:   ()                          => get<NetworkRoute[]>('/routes'),
  create: (params: CreateRouteParams) => post<NetworkRoute>('/routes', params),
  delete: (id: string)                => del<{ id: string }>(`/routes/${id}`),
}

export { APIError }
