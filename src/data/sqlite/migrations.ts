import type { Database } from '@/data/ports/Database'

export interface Migration {
  version: number
  name: string
  sql: string
}

/**
 * Revisão do esquema base (pré-publicação). As migrations abaixo são um baseline
 * consolidado que pode ser reescrito livremente enquanto o app não tem usuários
 * (editar as tabelas e regenerar o seed, em vez de empilhar ALTER TABLE). O
 * problema: um banco local já criado tem a migration antiga marcada como
 * aplicada e NÃO pega a reescrita — o schema fica defasado (ex.: faltando uma
 * coluna) e o seed quebra.
 *
 * Solução pré-publicação: sempre que uma migration já existente for editada,
 * incremente este número. No boot, um banco cujo `PRAGMA user_version` for menor
 * é reconstruído do zero a partir do baseline atual (dados locais são
 * descartáveis até o v1). DEPOIS de publicar, isto congela e passa a valer a
 * regra normal: só ACRESCENTAR novas migrations com o próximo `version` — nunca
 * editar uma já aplicada — e o baseline não é mais reconstruído.
 */
export const SCHEMA_BASELINE = 7

/**
 * Ordered schema migrations. Each runs exactly once, inside its own transaction,
 * and is recorded in `schema_migrations`.
 */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'app_config',
    sql: /* sql */ `
      CREATE TABLE app_config (
        chave TEXT PRIMARY KEY,
        valor TEXT
      );
    `,
  },
  {
    version: 2,
    name: 'catalog',
    sql: /* sql */ `
      CREATE TABLE areas (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        familia TEXT,               -- "Área" na UI (agrupamento da carreira)
        descricao TEXT,
        ordem INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE niveis_carreira (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        ordem INTEGER NOT NULL DEFAULT 0,
        descricao TEXT
      );

      CREATE TABLE competencias (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK (tipo IN ('hard', 'soft')),
        descricao TEXT
      );

      -- Célula da matriz de leveling (carreira × nível × competência).
      CREATE TABLE matriz_competencias (
        id TEXT PRIMARY KEY,
        area_id TEXT NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
        nivel_id TEXT NOT NULL REFERENCES niveis_carreira(id) ON DELETE CASCADE,
        competencia_id TEXT NOT NULL REFERENCES competencias(id) ON DELETE CASCADE,
        nivel_esperado INTEGER,
        descricao TEXT,             -- o que se espera da competência nesse nível
        UNIQUE (area_id, nivel_id, competencia_id)
      );
      CREATE INDEX idx_matriz_area_nivel ON matriz_competencias(area_id, nivel_id);

      -- Expectativa descritiva geral por célula (carreira × nível).
      CREATE TABLE matriz_expectativas (
        area_id TEXT NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
        nivel_id TEXT NOT NULL REFERENCES niveis_carreira(id) ON DELETE CASCADE,
        expectativa TEXT,
        PRIMARY KEY (area_id, nivel_id)
      );

      -- Habilidades (comportamentos observáveis) de cada célula
      -- carreira × nível × competência. Cada linha é um item da lista do nível.
      CREATE TABLE habilidades (
        id TEXT PRIMARY KEY,
        area_id TEXT NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
        nivel_id TEXT NOT NULL REFERENCES niveis_carreira(id) ON DELETE CASCADE,
        competencia_id TEXT NOT NULL REFERENCES competencias(id) ON DELETE CASCADE,
        texto TEXT NOT NULL,
        ordem INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX idx_habilidades_cell ON habilidades(area_id, nivel_id, competencia_id);

      CREATE TABLE certificacoes (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        provedor TEXT,
        url TEXT,
        gratuita INTEGER NOT NULL DEFAULT 1,
        descricao TEXT,
        categoria TEXT,
        keywords TEXT               -- JSON array de termos
      );

      CREATE TABLE certificacao_competencias (
        certificacao_id TEXT NOT NULL REFERENCES certificacoes(id) ON DELETE CASCADE,
        competencia_id TEXT NOT NULL REFERENCES competencias(id) ON DELETE CASCADE,
        PRIMARY KEY (certificacao_id, competencia_id)
      );

      CREATE TABLE certificacao_areas (
        certificacao_id TEXT NOT NULL REFERENCES certificacoes(id) ON DELETE CASCADE,
        area_id TEXT NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
        PRIMARY KEY (certificacao_id, area_id)
      );

      CREATE TABLE trilha_templates (
        id TEXT PRIMARY KEY,
        competencia_id TEXT REFERENCES competencias(id) ON DELETE SET NULL,
        area_id TEXT REFERENCES areas(id) ON DELETE SET NULL,
        tipo TEXT NOT NULL,
        titulo TEXT NOT NULL,
        descricao TEXT,
        duracao TEXT,
        recurso_url TEXT,
        keywords TEXT,              -- JSON array de termos
        area_display TEXT
      );
      CREATE INDEX idx_trilha_templates_comp ON trilha_templates(competencia_id);
    `,
  },
  {
    version: 3,
    name: 'user_pdi',
    sql: /* sql */ `
      -- Perfil único (sem autenticação): sempre id = 1.
      CREATE TABLE perfil (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        nome TEXT NOT NULL DEFAULT '',
        email TEXT,
        proposito TEXT,
        area_id TEXT REFERENCES areas(id) ON DELETE SET NULL,
        nivel_id TEXT REFERENCES niveis_carreira(id) ON DELETE SET NULL,
        wizard_concluido INTEGER NOT NULL DEFAULT 0,
        step_atual INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE user_hard_skills (
        id TEXT PRIMARY KEY,
        competencia_id TEXT REFERENCES competencias(id) ON DELETE SET NULL,
        nome TEXT NOT NULL,
        nivel_atual INTEGER NOT NULL DEFAULT 0,
        nivel_desejado INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE user_soft_skills (
        id TEXT PRIMARY KEY,
        competencia_id TEXT REFERENCES competencias(id) ON DELETE SET NULL,
        nome TEXT NOT NULL,
        avaliacao TEXT NOT NULL DEFAULT 'nao_avaliada'
      );

      CREATE TABLE objetivos (
        id TEXT PRIMARY KEY,
        titulo TEXT NOT NULL,
        categoria TEXT NOT NULL DEFAULT 'funcional',
        prazo TEXT,
        justificativa TEXT,
        ordem INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE acoes (
        id TEXT PRIMARY KEY,
        objetivo_id TEXT REFERENCES objetivos(id) ON DELETE SET NULL,
        titulo TEXT NOT NULL,
        categoria TEXT NOT NULL DEFAULT 'funcional',
        prazo TEXT,
        due_date TEXT,
        status TEXT NOT NULL DEFAULT 'pendente',
        detalhes TEXT,
        ordem INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX idx_acoes_objetivo ON acoes(objetivo_id);

      CREATE TABLE forcas (
        id TEXT PRIMARY KEY,
        objetivo_id TEXT REFERENCES objetivos(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL,
        descricao TEXT NOT NULL,
        intensidade INTEGER NOT NULL DEFAULT 3
      );

      CREATE TABLE trilha_itens (
        id TEXT PRIMARY KEY,
        template_id TEXT,
        competencia_id TEXT REFERENCES competencias(id) ON DELETE SET NULL,
        tipo TEXT NOT NULL,
        titulo TEXT NOT NULL,
        descricao TEXT,
        duracao TEXT,
        recurso_url TEXT,
        concluido INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE diario (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        texto TEXT NOT NULL,
        objetivo_id TEXT REFERENCES objetivos(id) ON DELETE SET NULL
      );

      -- Auto-avaliação do usuário: nota 1–4 por habilidade do catálogo.
      -- Sem FK para habilidades (elas são re-semeadas e não devem apagar a avaliação).
      CREATE TABLE user_autoavaliacao (
        habilidade_id TEXT PRIMARY KEY,
        nota INTEGER NOT NULL
      );

      -- Vínculo N:N de uma entrada do diário com itens do plano (habilidades).
      -- habilidade_id sem FK (re-semeadas); diario_id cascateia ao apagar a entrada.
      CREATE TABLE diario_habilidades (
        diario_id TEXT NOT NULL REFERENCES diario(id) ON DELETE CASCADE,
        habilidade_id TEXT NOT NULL,
        PRIMARY KEY (diario_id, habilidade_id)
      );

      -- Cada conquista (tipo) só pode ser ganha uma vez.
      CREATE TABLE conquistas (
        id TEXT PRIMARY KEY,
        tipo TEXT NOT NULL,
        titulo TEXT NOT NULL,
        data TEXT NOT NULL,
        vista INTEGER NOT NULL DEFAULT 0
      );
      CREATE UNIQUE INDEX idx_conquistas_tipo ON conquistas(tipo);

      CREATE TABLE ciclos (
        id TEXT PRIMARY KEY,
        data_inicio TEXT NOT NULL,
        data_fim TEXT,
        score_saude INTEGER,
        snapshot_json TEXT
      );

      INSERT INTO perfil (id) VALUES (1);
    `,
  },
]

/**
 * Drop every user table so migrations can rebuild the schema from scratch. Only
 * used pre-publication, when the on-disk baseline is older than SCHEMA_BASELINE.
 * Local data is disposable until v1 ships.
 */
async function dropAllTables(db: Database): Promise<void> {
  const tables = await db.all<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`,
  )
  // Individual statements (autocommit) so we can toggle foreign_keys, which
  // cannot change inside a transaction.
  await db.run('PRAGMA foreign_keys = OFF')
  for (const { name } of tables) {
    await db.run(`DROP TABLE IF EXISTS "${name}"`)
  }
  await db.run('PRAGMA foreign_keys = ON')
}

export async function runMigrations(db: Database): Promise<number> {
  // Pre-publication baseline guard: if the local schema predates the current
  // baseline, wipe it and rebuild from the migrations below. Existing local DBs
  // (created before this guard, so user_version = 0) rebuild once; a fresh DB
  // has nothing to drop. After v1 this stays put and never fires.
  const uv = await db.get<{ user_version: number }>('PRAGMA user_version')
  const baseline = Number(uv?.user_version ?? 0)
  const rebuild = baseline < SCHEMA_BASELINE
  if (rebuild) {
    await dropAllTables(db)
  }

  await db.execScript(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `)
  const row = await db.get<{ v: number | null }>(
    'SELECT MAX(version) AS v FROM schema_migrations',
  )
  const current = row?.v ?? 0
  let applied = 0
  for (const m of MIGRATIONS) {
    if (m.version <= current) continue
    await db.execScript(`
      BEGIN;
      ${m.sql}
      INSERT INTO schema_migrations (version, applied_at)
      VALUES (${m.version}, '${new Date().toISOString()}');
      COMMIT;
    `)
    applied += 1
  }

  // Stamp the baseline so an up-to-date DB skips the rebuild next boot.
  await db.execScript(`PRAGMA user_version = ${SCHEMA_BASELINE};`)
  return applied
}
