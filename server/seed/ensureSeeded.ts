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
 * Additions to the catalog that must NOT replace it (so /admin edits survive):
 * seed items from these positions on are inserted when their id is missing.
 *
 * v1 = +60 itens de trilha gratuitos (tpl-26…) e +8 certificações gratuitas.
 */
const CATALOG_ADDITIONS_VERSION = 1
const ADICOES = { trilhaDesde: 26, certificacoesDesde: 16 }

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
    if (stored >= CATALOG_SEED_VERSION && !isEmpty) {
      await ensureCatalogAdditions(db)
      return
    }
    const data = await buildCatalogSeed()
    await new PgCatalogRepository(db).replaceAll(data)
    await setConfig(db, 'catalog_seed_version', CATALOG_SEED_VERSION)
    // A full seed already carries every addition.
    await setConfig(db, 'catalog_additions_version', CATALOG_ADDITIONS_VERSION)
    console.log(`[seed] catálogo semeado (v${CATALOG_SEED_VERSION})`)
  } catch (err) {
    console.warn('[seed] seed automático do catálogo falhou', err)
  }
}

/** Insert the newer seed items (ADICOES) that the catalog doesn't have yet. */
async function ensureCatalogAdditions(db: Database): Promise<void> {
  const row = await db.get<{ valor: string }>(
    `SELECT valor FROM app_config WHERE chave = 'catalog_additions_version'`,
  )
  if ((row ? Number(row.valor) : 0) >= CATALOG_ADDITIONS_VERSION) return
  const repo = new PgCatalogRepository(db)
  const data = await buildCatalogSeed()
  const [tpls, certs] = await Promise.all([repo.listTrilhaTemplates(), repo.listCertificacoes()])
  const tplIds = new Set(tpls.map((t) => t.id))
  const certIds = new Set(certs.map((c) => c.id))
  const novosTpl = data.trilhaTemplates.slice(ADICOES.trilhaDesde).filter((t) => !tplIds.has(t.id))
  const novasCert = data.certificacoes
    .slice(ADICOES.certificacoesDesde)
    .filter((c) => !certIds.has(c.id))
  for (const t of novosTpl) await repo.upsertTrilhaTemplate(t)
  for (const c of novasCert) await repo.upsertCertificacao(c)
  await setConfig(db, 'catalog_additions_version', CATALOG_ADDITIONS_VERSION)
  console.log(
    `[seed] adições ao catálogo (v${CATALOG_ADDITIONS_VERSION}): ${novosTpl.length} itens de trilha, ${novasCert.length} certificações`,
  )
}

async function setConfig(db: Database, chave: string, valor: number): Promise<void> {
  await db.run(
    `INSERT INTO app_config (chave, valor) VALUES (?, ?)
     ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor`,
    [chave, String(valor)],
  )
}
