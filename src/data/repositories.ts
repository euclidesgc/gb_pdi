import { useMemo } from 'react'
import { useDatabase } from '@/data/DatabaseProvider'
import type { CatalogRepository } from '@/data/ports/CatalogRepository'
import type { PdiRepository } from '@/data/ports/PdiRepository'
import { SqliteCatalogRepository } from '@/data/sqlite/SqliteCatalogRepository'
import { SqlitePdiRepository } from '@/data/sqlite/SqlitePdiRepository'

/**
 * Repository injection seam. Feature code and /admin screens call these hooks,
 * never a concrete class. To move to a different backend later (HTTP API,
 * Firestore, …), swap the implementation constructed here — nothing else changes.
 */
export function useCatalogRepository(): CatalogRepository {
  const db = useDatabase()
  return useMemo(() => new SqliteCatalogRepository(db), [db])
}

export function usePdiRepository(): PdiRepository {
  const db = useDatabase()
  return useMemo(() => new SqlitePdiRepository(db), [db])
}
