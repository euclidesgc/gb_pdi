export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** Listeners told when any call comes back 401 (session expired / logged out elsewhere). */
const unauthorizedListeners = new Set<() => void>()

export function onUnauthorized(fn: () => void): () => void {
  unauthorizedListeners.add(fn)
  return () => unauthorizedListeners.delete(fn)
}

/** JSON call to the same-origin API (`/api/...`), sending the session cookie. */
export async function apiFetch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  })
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T
  if (!res.ok) {
    if (res.status === 401 && path !== '/auth/login' && path !== '/auth/me') {
      unauthorizedListeners.forEach((fn) => fn())
    }
    throw new ApiError(res.status, data.error ?? `Erro ${res.status}`)
  }
  return data
}
