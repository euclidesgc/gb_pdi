import type { CatalogRepository } from '@/data/ports/CatalogRepository'
import type { PdiRepository } from '@/data/ports/PdiRepository'
import { createRpcRepository } from '@/data/http/rpcRepository'

// Stateless HTTP clients: the session cookie identifies the user, so one
// instance serves the whole app.
const catalogRepository = createRpcRepository<CatalogRepository>('catalog')
const pdiRepository = createRpcRepository<PdiRepository>('pdi')

/**
 * Repository injection seam. Feature code and /admin screens call these hooks,
 * never a concrete class. The data lives in Postgres behind the API (`/api`).
 */
export function useCatalogRepository(): CatalogRepository {
  return catalogRepository
}

export function usePdiRepository(): PdiRepository {
  return pdiRepository
}
