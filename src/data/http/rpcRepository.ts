import { apiFetch } from './api'

/**
 * Builds a client for a repository port whose every method is a remote call:
 * `repo.listAreas(filter)` → `POST /api/rpc/<namespace>/listAreas { args: [filter] }`.
 * The server keeps the real (Postgres) implementation and the method whitelist.
 */
export function createRpcRepository<T extends object>(namespace: 'catalog' | 'pdi'): T {
  return new Proxy({} as T, {
    get(_target, method) {
      if (typeof method !== 'string' || method === 'then') return undefined
      return async (...args: unknown[]) => {
        const { result } = await apiFetch<{ result: unknown }>(`/rpc/${namespace}/${method}`, {
          args,
        })
        // The server sends `null` for void/undefined results.
        return result ?? undefined
      }
    },
  })
}
