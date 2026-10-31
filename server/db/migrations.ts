import type { PgDatabase } from './PgDatabase'

export interface Migration {
  version: number
  name: string
  sql: string
}

/**
 * Ordered schema migrations. Each runs exactly once, inside its own transaction,
 * and is recorded in `schema_migrations`. Once a migration has run in hml, never
 * edit it: add a new one with the next `version`.
 *
 * Booleans stay as INTEGER 0/1 to match the repository mappers. User tables do
 * NOT reference catalog tables with foreign keys: the catalog is replaced
 * wholesale on a seed bump, and that must not touch anyone's PDI.
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
    name: 'auth',
    sql: /* sql */ `
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        nome TEXT NOT NULL DEFAULT '',
        password_hash TEXT NOT NULL,
        is_admin BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX idx_users_email ON users (lower(email));

      -- id = SHA-256 do token do cookie (o token em si nunca é gravado).
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_sessions_user ON sessions(user_id);
    `,
  },
  {
    version: 4,
    name: 'user_pdi',
    sql: /* sql */ `
      -- Um perfil por usuário, criado no cadastro.
      CREATE TABLE perfil (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        nome TEXT NOT NULL DEFAULT '',
        email TEXT,
        proposito TEXT,
        area_id TEXT,
        nivel_id TEXT,
        wizard_concluido INTEGER NOT NULL DEFAULT 0,
        step_atual INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE user_hard_skills (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        competencia_id TEXT,
        nome TEXT NOT NULL,
        nivel_atual INTEGER NOT NULL DEFAULT 0,
        nivel_desejado INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX idx_hard_skills_user ON user_hard_skills(user_id);

      CREATE TABLE user_soft_skills (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        competencia_id TEXT,
        nome TEXT NOT NULL,
        avaliacao TEXT NOT NULL DEFAULT 'nao_avaliada'
      );
      CREATE INDEX idx_soft_skills_user ON user_soft_skills(user_id);

      CREATE TABLE objetivos (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        titulo TEXT NOT NULL,
        categoria TEXT NOT NULL DEFAULT 'funcional',
        prazo TEXT,
        justificativa TEXT,
        ordem INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX idx_objetivos_user ON objetivos(user_id);

      CREATE TABLE acoes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        objetivo_id TEXT REFERENCES objetivos(id) ON DELETE SET NULL,
        titulo TEXT NOT NULL,
        categoria TEXT NOT NULL DEFAULT 'funcional',
        prazo TEXT,
        due_date TEXT,
        status TEXT NOT NULL DEFAULT 'pendente',
        detalhes TEXT,
        ordem INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX idx_acoes_user ON acoes(user_id);
      CREATE INDEX idx_acoes_objetivo ON acoes(objetivo_id);

      CREATE TABLE forcas (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        objetivo_id TEXT REFERENCES objetivos(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL,
        descricao TEXT NOT NULL,
        intensidade INTEGER NOT NULL DEFAULT 3
      );
      CREATE INDEX idx_forcas_user ON forcas(user_id);

      CREATE TABLE trilha_itens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        template_id TEXT,
        competencia_id TEXT,
        tipo TEXT NOT NULL,
        titulo TEXT NOT NULL,
        descricao TEXT,
        duracao TEXT,
        recurso_url TEXT,
        concluido INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX idx_trilha_itens_user ON trilha_itens(user_id);

      CREATE TABLE diario (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        data TEXT NOT NULL,
        texto TEXT NOT NULL,
        objetivo_id TEXT REFERENCES objetivos(id) ON DELETE SET NULL
      );
      CREATE INDEX idx_diario_user ON diario(user_id);

      -- Auto-avaliação: nota 1–4 por habilidade do catálogo (sem FK: re-seed).
      CREATE TABLE user_autoavaliacao (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        habilidade_id TEXT NOT NULL,
        nota INTEGER NOT NULL,
        PRIMARY KEY (user_id, habilidade_id)
      );

      -- Vínculo N:N de uma entrada do diário com habilidades (sem FK: re-seed).
      CREATE TABLE diario_habilidades (
        diario_id TEXT NOT NULL REFERENCES diario(id) ON DELETE CASCADE,
        habilidade_id TEXT NOT NULL,
        PRIMARY KEY (diario_id, habilidade_id)
      );

      -- Cada conquista (tipo) só pode ser ganha uma vez por usuário.
      CREATE TABLE conquistas (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL,
        titulo TEXT NOT NULL,
        data TEXT NOT NULL,
        vista INTEGER NOT NULL DEFAULT 0
      );
      CREATE UNIQUE INDEX idx_conquistas_user_tipo ON conquistas(user_id, tipo);

      CREATE TABLE ciclos (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        data_inicio TEXT NOT NULL,
        data_fim TEXT,
        score_saude INTEGER,
        snapshot_json TEXT
      );
      CREATE INDEX idx_ciclos_user ON ciclos(user_id);
    `,
  },
  {
    version: 5,
    name: 'auth_roles_tokens',
    sql: /* sql */ `
      -- Papel do usuário (por enquanto só 'user' e 'admin'; mais papéis virão).
      ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
        CHECK (role IN ('user', 'admin'));
      UPDATE users SET role = 'admin' WHERE is_admin;
      ALTER TABLE users DROP COLUMN is_admin;

      ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ;
      ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMPTZ;

      -- Tokens de uso único enviados por e-mail (id = SHA-256 do token).
      CREATE TABLE auth_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        purpose TEXT NOT NULL CHECK (purpose IN ('reset_password', 'verify_email')),
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_auth_tokens_user ON auth_tokens(user_id, purpose);
    `,
  },
  {
    version: 6,
    name: 'diario_vinculos',
    sql: /* sql */ `
      -- Vínculos N:N de uma entrada do diário com objetivos, ações do plano e
      -- itens da trilha. Somem junto com o item vinculado; a entrada fica.
      CREATE TABLE diario_objetivos (
        diario_id TEXT NOT NULL REFERENCES diario(id) ON DELETE CASCADE,
        objetivo_id TEXT NOT NULL REFERENCES objetivos(id) ON DELETE CASCADE,
        PRIMARY KEY (diario_id, objetivo_id)
      );
      CREATE INDEX idx_diario_objetivos_obj ON diario_objetivos(objetivo_id);

      CREATE TABLE diario_acoes (
        diario_id TEXT NOT NULL REFERENCES diario(id) ON DELETE CASCADE,
        acao_id TEXT NOT NULL REFERENCES acoes(id) ON DELETE CASCADE,
        PRIMARY KEY (diario_id, acao_id)
      );
      CREATE INDEX idx_diario_acoes_acao ON diario_acoes(acao_id);

      CREATE TABLE diario_trilha (
        diario_id TEXT NOT NULL REFERENCES diario(id) ON DELETE CASCADE,
        trilha_item_id TEXT NOT NULL REFERENCES trilha_itens(id) ON DELETE CASCADE,
        PRIMARY KEY (diario_id, trilha_item_id)
      );
      CREATE INDEX idx_diario_trilha_item ON diario_trilha(trilha_item_id);

      -- O vínculo único com objetivo (nunca usado pela UI) vira N:N.
      INSERT INTO diario_objetivos (diario_id, objetivo_id)
        SELECT id, objetivo_id FROM diario WHERE objetivo_id IS NOT NULL;
      ALTER TABLE diario DROP COLUMN objetivo_id;
    `,
  },
  {
    version: 7,
    name: 'api_tokens',
    sql: /* sql */ `
      -- Tokens pessoais de acesso (agentes de IA via MCP). Guarda só o SHA-256 do
      -- token; o prefixo serve para o usuário reconhecer o token na lista.
      CREATE TABLE api_tokens (
        id TEXT PRIMARY KEY,
        token_hash TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        prefixo TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_used_at TIMESTAMPTZ
      );
      CREATE INDEX idx_api_tokens_user ON api_tokens(user_id);
    `,
  },
  {
    version: 8,
    name: 'datas_conclusao_diario',
    sql: /* sql */ `
      -- Data (yyyy-mm-dd) em que a ação ou o item da trilha foi concluído: o
      -- brag document filtra as entregas por período. Itens já concluídos ficam
      -- sem data.
      ALTER TABLE acoes ADD COLUMN concluido_em TEXT;
      ALTER TABLE trilha_itens ADD COLUMN concluido_em TEXT;

      -- Ordena as entradas de um mesmo dia e registra a última edição.
      ALTER TABLE diario ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
      ALTER TABLE diario ADD COLUMN updated_at TIMESTAMPTZ;
      -- Entrada marcada como destaque: vai para o topo do brag document.
      ALTER TABLE diario ADD COLUMN destaque INTEGER NOT NULL DEFAULT 0;
      CREATE INDEX idx_diario_user_data ON diario(user_id, data);
    `,
  },
]

/** Arbitrary key for the advisory lock that serializes migrations across replicas. */
const MIGRATION_LOCK = 4_242_001

export async function runMigrations(db: PgDatabase): Promise<number> {
  const client = await db.pool.connect()
  let applied = 0
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK])
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)
    const { rows } = await client.query<{ v: number | null }>(
      'SELECT MAX(version) AS v FROM schema_migrations',
    )
    const current = rows[0]?.v ?? 0
    for (const m of MIGRATIONS) {
      if (m.version <= current) continue
      await client.query('BEGIN')
      try {
        await client.query(m.sql)
        await client.query('INSERT INTO schema_migrations (version, name) VALUES ($1, $2)', [
          m.version,
          m.name,
        ])
        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      }
      applied += 1
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK]).catch(() => {})
    client.release()
  }
  return applied
}
