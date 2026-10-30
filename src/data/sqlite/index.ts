import type { Database } from '@/data/ports/Database'
import { SqliteDatabase } from './SqliteDatabase'
import { SqliteCatalogRepository } from './SqliteCatalogRepository'
import { runMigrations } from './migrations'
import { buildCatalogSeed } from './seed'

/**
 * Single database instance for the whole page. The OPFS SAH Pool VFS acquires
 * exclusive access handles, so only ONE worker may own the files — React
 * StrictMode's double-mount and Vite HMR must share this instance, hence the
 * globalThis-backed singleton and a single shared init/migrations promise.
 */
interface DbGlobals {
  __pdiDb?: SqliteDatabase
  __pdiDbReady?: Promise<Database>
  __pdiReleaseLock?: () => void
  __pdiLockAbort?: AbortController
}

function globals(): DbGlobals {
  return globalThis as unknown as DbGlobals
}

/**
 * Name of the exclusive Web Lock that serializes OPFS ownership across tabs.
 * OPFS SAH Pool access handles are exclusive per origin, so a second tab that
 * opens the app would otherwise crash with "createSyncAccessHandle ... another
 * open Access Handle". Holding this lock for the page's lifetime makes the
 * second tab WAIT until the first releases it (tab closed), then proceed.
 */
const DB_LOCK_NAME = 'pdi-db-exclusive'

function hasWebLocks(): boolean {
  return typeof navigator !== 'undefined' && 'locks' in navigator
}

/**
 * Acquire the exclusive lock and hold it until the page unloads (or
 * `resetDatabase()` releases it). Resolves as soon as the lock is held. When
 * another tab holds it, this stays pending until that tab lets go. Falls back
 * to a no-op where Web Locks are unavailable.
 */
function acquireExclusiveLock(g: DbGlobals): Promise<void> {
  if (!hasWebLocks()) return Promise.resolve()
  const ctrl = new AbortController()
  g.__pdiLockAbort = ctrl
  return new Promise<void>((held, reject) => {
    navigator.locks
      .request(
        DB_LOCK_NAME,
        { mode: 'exclusive', signal: ctrl.signal },
        () =>
          new Promise<void>((release) => {
            g.__pdiReleaseLock = release
            held()
          }),
      )
      .catch((err) => {
        // `request` rejects with AbortError when a still-queued request is
        // cancelled (user hit "Tentar de novo" while waiting on another tab) —
        // surface it so the stalled init settles. Any other rejection means we
        // could not use the lock at all, so proceed without it.
        if (ctrl.signal.aborted) reject(err as Error)
        else held()
      })
  })
}

/** True when ANOTHER tab currently holds the exclusive DB lock (not us). */
export async function isDatabaseHeldByOtherTab(): Promise<boolean> {
  if (!hasWebLocks()) return false
  // If we already hold the lock ourselves, a held entry is ours, not another tab.
  if (globals().__pdiReleaseLock) return false
  try {
    const { held = [] } = await navigator.locks.query()
    return held.some((l) => l.name === DB_LOCK_NAME)
  } catch {
    return false
  }
}

export function initDatabase(): Promise<Database> {
  const g = globals()
  if (g.__pdiDbReady) return g.__pdiDbReady
  g.__pdiDbReady = (async () => {
    // Serialize OPFS ownership across tabs before touching the files.
    await acquireExclusiveLock(g)
    const db = g.__pdiDb ?? (g.__pdiDb = new SqliteDatabase())
    try {
      await db.whenReady()
      await runMigrations(db)
      await ensureCatalogSeeded(db)
      return db
    } catch (err) {
      // A failed init must leave nothing cached, so a later retry starts clean
      // (e.g. once the other tab closed).
      await resetDatabase()
      throw err
    }
  })()
  return g.__pdiDbReady
}

/**
 * Tear down the database and release the lock so the next `initDatabase()`
 * starts fresh. Used by the "Tentar de novo" retry and by HMR disposal.
 *
 * Disposes the worker first (closing the DB and uninstalling the OPFS VFS, which
 * releases its exclusive sync access handles) and only then lets go of the Web
 * Lock, so a waiting tab never grabs the lock while our handles are still held.
 * A still-queued lock request (we were waiting on another tab) is aborted.
 */
export async function resetDatabase(): Promise<void> {
  const g = globals()
  const db = g.__pdiDb
  const release = g.__pdiReleaseLock
  const abort = g.__pdiLockAbort
  g.__pdiDb = undefined
  g.__pdiReleaseLock = undefined
  g.__pdiLockAbort = undefined
  g.__pdiDbReady = undefined
  try {
    await db?.dispose()
  } finally {
    abort?.abort()
    release?.()
  }
}

/** True when the error is the OPFS "already open in another tab" failure. */
export function isMultiTabLockError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /createSyncAccessHandle|Access Handle|SAH/i.test(msg)
}

/**
 * Current catalog-seed version. Bump this whenever the seed data in
 * `seed/raw/*` changes and that change should be pushed to existing installs.
 * On the next boot an install whose stored version is lower is refreshed from
 * `buildCatalogSeed()` (replacing the whole catalog).
 *
 * v1 = catálogo genérico original · v2 = leveling de Engenharia de Software (GB)
 * · v3 = + templates de trilha placeholder (1 por competência) · v4 = certificações
 * reais, trilha curada (26 itens) e descrições de competência · v5 = habilidades
 * (bullets da matriz divididos por célula carreira × nível × competência).
 */
const CATALOG_SEED_VERSION = 5

/**
 * On a fresh database the reference catalog is empty, so the whole app (Trilha,
 * Comparador, wizard pickers, /admin) would start blank. Seed it automatically
 * on first boot, and re-seed when CATALOG_SEED_VERSION advances so existing
 * installs pick up new catalog data.
 *
 * The catalog ships seeded by default: this runs on an empty catalog (fresh
 * install, or one that somehow ended up with no reference data) AND whenever
 * CATALOG_SEED_VERSION advances, so existing installs pick up new catalog data.
 * Bumping the version intentionally replaces the whole catalog, which also
 * overwrites manual /admin edits — that is the point of a version bump. A seed
 * failure (e.g. the asset fetch fails) must not brick the app: it boots with
 * whatever catalog it has and leaves the version unset so a later boot retries.
 */
async function ensureCatalogSeeded(db: Database): Promise<void> {
  try {
    const row = await db.get<{ valor: string }>(
      `SELECT valor FROM app_config WHERE chave = 'catalog_seed_version'`,
    )
    const stored = row ? Number(row.valor) : 0
    const countRow = await db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM areas`)
    const isEmpty = !countRow || Number(countRow.n) === 0
    // Up to date AND not empty -> nothing to do. An empty catalog always gets
    // re-seeded so the app never starts blank.
    if (stored >= CATALOG_SEED_VERSION && !isEmpty) return
    const data = await buildCatalogSeed()
    const catalog = new SqliteCatalogRepository(db)
    await catalog.replaceAll(data)
    await db.run(
      `INSERT INTO app_config (chave, valor) VALUES ('catalog_seed_version', ?)
       ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor`,
      [String(CATALOG_SEED_VERSION)],
    )
  } catch (err) {
    console.warn('[pdi] seed automático do catálogo falhou; use /admin para semear', err)
  }
}

if (typeof window !== 'undefined') {
  // When this page goes away (same-tab navigation, tab close), release the Web
  // Lock immediately so the NEXT page can acquire it without waiting/timing out.
  // The browser tears down the worker (freeing the OPFS handles) on real unload;
  // installPool() retries cover the brief release window.
  const releaseLockForNavigation = () => {
    const g = globals()
    try {
      g.__pdiLockAbort?.abort()
    } catch {
      /* ignore */
    }
    try {
      g.__pdiReleaseLock?.()
    } catch {
      /* ignore */
    }
    g.__pdiReleaseLock = undefined
    g.__pdiLockAbort = undefined
  }
  window.addEventListener('pagehide', releaseLockForNavigation)
  // Restored from the back/forward cache: we released our lock on pagehide and
  // the globalThis DB singleton may be stale, so reload to re-initialise cleanly.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) window.location.reload()
  })
}

if (import.meta.hot) {
  // Release the exclusive OPFS handles and the Web Lock before the module is
  // replaced so the next version can re-acquire them.
  import.meta.hot.dispose(() => {
    void resetDatabase()
  })
}
