import type { Database } from '../db/Database'
import { PgCatalogRepository } from '../repositories/PgCatalogRepository'
import { buildCatalogSeed } from './index'

/**
 * Current catalog-seed version. Bump this whenever the seed data in `raw/*`
 * changes and that change should replace the catalog on the next server boot.
 *
 * v1 = catálogo genérico original · v2 = leveling de Engenharia de Software (GB)
 * · v3 = + templates de trilha placeholder (1 por competência) · v4 = certificações
 * reais, trilha curada (26 itens) e descrições de competência · v5 = habilidades
 * (bullets da matriz divididos por célula carreira × nível × competência).
 */
const CATALOG_SEED_VERSION = 5

/**
 * Seed the shared catalog on an empty database and re-seed when
 * CATALOG_SEED_VERSION advances. A bump intentionally replaces the whole catalog
 * (overwriting /admin edits). Users' PDI tables have no FK to the catalog, so a
 * re-seed never touches anyone's data. A seed failure is logged, not fatal.
 */
export async function ensureCatalogSeeded(db: Database): Promise<void> {
  try {
    const row = await db.get<{ valor: string }>(
      `SELECT valor FROM app_config WHERE chave = 'catalog_seed_version'`,
    )
    const stored = row ? Number(row.valor) : 0
    const countRow = await db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM areas`)
    const isEmpty = !countRow || Number(countRow.n) === 0
    if (stored >= CATALOG_SEED_VERSION && !isEmpty) return
    const data = await buildCatalogSeed()
    await new PgCatalogRepository(db).replaceAll(data)
    await db.run(
      `INSERT INTO app_config (chave, valor) VALUES ('catalog_seed_version', ?)
       ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor`,
      [String(CATALOG_SEED_VERSION)],
    )
    console.log(`[seed] catálogo semeado (v${CATALOG_SEED_VERSION})`)
  } catch (err) {
    console.warn('[seed] seed automático do catálogo falhou', err)
  }
}
