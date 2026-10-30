import type { Database, SqlBind } from '../db/Database'
import type {
  CatalogCounts,
  CatalogRepository,
  CatalogSeedData,
} from '@/data/ports/CatalogRepository'
import type {
  Area,
  Certificacao,
  Competencia,
  CompetenciaTipo,
  Habilidade,
  MatrizExpectativa,
  MatrizItem,
  NivelCarreira,
  TrilhaTemplate,
  TrilhaTipo,
} from '@/domain/catalog'

const b = (v: boolean) => (v ? 1 : 0)
const jsonArr = (v: string[]) => (v.length ? JSON.stringify(v) : null)
function parseArr(v: unknown): string[] {
  if (typeof v !== 'string' || !v) return []
  try {
    const parsed: unknown = JSON.parse(v)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

export class PgCatalogRepository implements CatalogRepository {
  private db: Database

  constructor(db: Database) {
    this.db = db
  }

  // ---- Áreas ----
  async listAreas(): Promise<Area[]> {
    const rows = await this.db.all(
      'SELECT * FROM areas ORDER BY ordem, nome',
    )
    return rows.map(rowToArea)
  }
  async getArea(id: string): Promise<Area | undefined> {
    const row = await this.db.get('SELECT * FROM areas WHERE id = ?', [id])
    return row ? rowToArea(row) : undefined
  }
  async upsertArea(a: Area): Promise<void> {
    await this.db.run(
      `INSERT INTO areas (id, nome, familia, descricao, ordem)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         nome = excluded.nome, familia = excluded.familia,
         descricao = excluded.descricao, ordem = excluded.ordem`,
      [a.id, a.nome, a.familia, a.descricao, a.ordem],
    )
  }
  async deleteArea(id: string): Promise<void> {
    await this.db.run('DELETE FROM areas WHERE id = ?', [id])
  }

  // ---- Níveis ----
  async listNiveis(): Promise<NivelCarreira[]> {
    const rows = await this.db.all(
      'SELECT * FROM niveis_carreira ORDER BY ordem, nome',
    )
    return rows.map(rowToNivel)
  }
  async upsertNivel(n: NivelCarreira): Promise<void> {
    await this.db.run(
      `INSERT INTO niveis_carreira (id, nome, ordem, descricao)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         nome = excluded.nome, ordem = excluded.ordem, descricao = excluded.descricao`,
      [n.id, n.nome, n.ordem, n.descricao],
    )
  }
  async deleteNivel(id: string): Promise<void> {
    await this.db.run('DELETE FROM niveis_carreira WHERE id = ?', [id])
  }

  // ---- Competências ----
  async listCompetencias(): Promise<Competencia[]> {
    const rows = await this.db.all(
      'SELECT * FROM competencias ORDER BY tipo, nome',
    )
    return rows.map(rowToCompetencia)
  }
  async upsertCompetencia(c: Competencia): Promise<void> {
    await this.db.run(
      `INSERT INTO competencias (id, nome, tipo, descricao)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         nome = excluded.nome, tipo = excluded.tipo, descricao = excluded.descricao`,
      [c.id, c.nome, c.tipo, c.descricao],
    )
  }
  async deleteCompetencia(id: string): Promise<void> {
    await this.db.run('DELETE FROM competencias WHERE id = ?', [id])
  }

  // ---- Matriz ----
  async listMatriz(filter?: {
    areaId?: string
    nivelId?: string
  }): Promise<MatrizItem[]> {
    const where: string[] = []
    const bind: string[] = []
    if (filter?.areaId) {
      where.push('area_id = ?')
      bind.push(filter.areaId)
    }
    if (filter?.nivelId) {
      where.push('nivel_id = ?')
      bind.push(filter.nivelId)
    }
    const sql =
      'SELECT * FROM matriz_competencias' +
      (where.length ? ` WHERE ${where.join(' AND ')}` : '')
    const rows = await this.db.all(sql, bind)
    return rows.map(rowToMatriz)
  }
  async upsertMatrizItem(m: MatrizItem): Promise<void> {
    await this.db.run(
      `INSERT INTO matriz_competencias (id, area_id, nivel_id, competencia_id, nivel_esperado, descricao)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(area_id, nivel_id, competencia_id) DO UPDATE SET
         nivel_esperado = excluded.nivel_esperado, descricao = excluded.descricao`,
      [m.id, m.areaId, m.nivelId, m.competenciaId, m.nivelEsperado, m.descricao],
    )
  }
  async deleteMatrizItem(id: string): Promise<void> {
    await this.db.run('DELETE FROM matriz_competencias WHERE id = ?', [id])
  }

  // ---- Expectativas (célula área × nível) ----
  async listExpectativas(filter?: {
    areaId?: string
    nivelId?: string
  }): Promise<MatrizExpectativa[]> {
    const where: string[] = []
    const bind: string[] = []
    if (filter?.areaId) {
      where.push('area_id = ?')
      bind.push(filter.areaId)
    }
    if (filter?.nivelId) {
      where.push('nivel_id = ?')
      bind.push(filter.nivelId)
    }
    const sql =
      'SELECT * FROM matriz_expectativas' +
      (where.length ? ` WHERE ${where.join(' AND ')}` : '')
    const rows = await this.db.all(sql, bind)
    return rows.map((r) => ({
      areaId: str(r.area_id),
      nivelId: str(r.nivel_id),
      expectativa: strOrNull(r.expectativa),
    }))
  }
  async upsertExpectativa(e: MatrizExpectativa): Promise<void> {
    await this.db.run(
      `INSERT INTO matriz_expectativas (area_id, nivel_id, expectativa)
       VALUES (?, ?, ?)
       ON CONFLICT(area_id, nivel_id) DO UPDATE SET expectativa = excluded.expectativa`,
      [e.areaId, e.nivelId, e.expectativa],
    )
  }

  // ---- Habilidades ----
  async listHabilidades(filter?: {
    areaId?: string
    nivelId?: string
    competenciaId?: string
  }): Promise<Habilidade[]> {
    const where: string[] = []
    const bind: string[] = []
    if (filter?.areaId) {
      where.push('area_id = ?')
      bind.push(filter.areaId)
    }
    if (filter?.nivelId) {
      where.push('nivel_id = ?')
      bind.push(filter.nivelId)
    }
    if (filter?.competenciaId) {
      where.push('competencia_id = ?')
      bind.push(filter.competenciaId)
    }
    const sql =
      'SELECT * FROM habilidades' +
      (where.length ? ` WHERE ${where.join(' AND ')}` : '') +
      ' ORDER BY ordem, texto'
    const rows = await this.db.all(sql, bind)
    return rows.map(rowToHabilidade)
  }
  async upsertHabilidade(h: Habilidade): Promise<void> {
    await this.db.run(
      `INSERT INTO habilidades (id, area_id, nivel_id, competencia_id, texto, ordem)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         area_id = excluded.area_id, nivel_id = excluded.nivel_id,
         competencia_id = excluded.competencia_id, texto = excluded.texto,
         ordem = excluded.ordem`,
      [h.id, h.areaId, h.nivelId, h.competenciaId, h.texto, h.ordem],
    )
  }
  async deleteHabilidade(id: string): Promise<void> {
    await this.db.run('DELETE FROM habilidades WHERE id = ?', [id])
  }

  // ---- Certificações ----
  async listCertificacoes(): Promise<Certificacao[]> {
    const rows = await this.db.all('SELECT * FROM certificacoes ORDER BY nome')
    const comp = await this.db.all(
      'SELECT certificacao_id, competencia_id FROM certificacao_competencias',
    )
    const areas = await this.db.all(
      'SELECT certificacao_id, area_id FROM certificacao_areas',
    )
    return rows.map((r) => rowToCertificacao(r, comp, areas))
  }
  async getCertificacao(id: string): Promise<Certificacao | undefined> {
    const row = await this.db.get('SELECT * FROM certificacoes WHERE id = ?', [id])
    if (!row) return undefined
    const comp = await this.db.all(
      'SELECT certificacao_id, competencia_id FROM certificacao_competencias WHERE certificacao_id = ?',
      [id],
    )
    const areas = await this.db.all(
      'SELECT certificacao_id, area_id FROM certificacao_areas WHERE certificacao_id = ?',
      [id],
    )
    return rowToCertificacao(row, comp, areas)
  }
  async upsertCertificacao(c: Certificacao): Promise<void> {
    const stmts: Array<{ sql: string; bind?: SqlBind }> = [
      {
        sql: `INSERT INTO certificacoes (id, nome, provedor, url, gratuita, descricao, categoria, keywords)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                nome = excluded.nome, provedor = excluded.provedor, url = excluded.url,
                gratuita = excluded.gratuita, descricao = excluded.descricao,
                categoria = excluded.categoria, keywords = excluded.keywords`,
        bind: [
          c.id,
          c.nome,
          c.provedor,
          c.url,
          b(c.gratuita),
          c.descricao,
          c.categoria,
          jsonArr(c.keywords),
        ],
      },
      { sql: 'DELETE FROM certificacao_competencias WHERE certificacao_id = ?', bind: [c.id] },
      { sql: 'DELETE FROM certificacao_areas WHERE certificacao_id = ?', bind: [c.id] },
      ...c.competenciaIds.map((cid) => ({
        sql: 'INSERT INTO certificacao_competencias (certificacao_id, competencia_id) VALUES (?, ?)',
        bind: [c.id, cid] as SqlBind,
      })),
      ...c.areaIds.map((aid) => ({
        sql: 'INSERT INTO certificacao_areas (certificacao_id, area_id) VALUES (?, ?)',
        bind: [c.id, aid] as SqlBind,
      })),
    ]
    await this.db.tx(stmts)
  }
  async deleteCertificacao(id: string): Promise<void> {
    await this.db.run('DELETE FROM certificacoes WHERE id = ?', [id])
  }

  // ---- Templates de trilha ----
  async listTrilhaTemplates(filter?: {
    competenciaId?: string
    areaId?: string
  }): Promise<TrilhaTemplate[]> {
    const where: string[] = []
    const bind: string[] = []
    if (filter?.competenciaId) {
      where.push('competencia_id = ?')
      bind.push(filter.competenciaId)
    }
    if (filter?.areaId) {
      where.push('area_id = ?')
      bind.push(filter.areaId)
    }
    const sql =
      'SELECT * FROM trilha_templates' +
      (where.length ? ` WHERE ${where.join(' AND ')}` : '') +
      ' ORDER BY titulo'
    const rows = await this.db.all(sql, bind)
    return rows.map(rowToTrilhaTemplate)
  }
  async upsertTrilhaTemplate(t: TrilhaTemplate): Promise<void> {
    await this.db.run(
      `INSERT INTO trilha_templates
         (id, competencia_id, area_id, tipo, titulo, descricao, duracao, recurso_url,
          keywords, area_display)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         competencia_id = excluded.competencia_id, area_id = excluded.area_id,
         tipo = excluded.tipo, titulo = excluded.titulo, descricao = excluded.descricao,
         duracao = excluded.duracao, recurso_url = excluded.recurso_url,
         keywords = excluded.keywords, area_display = excluded.area_display`,
      [
        t.id,
        t.competenciaId,
        t.areaId,
        t.tipo,
        t.titulo,
        t.descricao,
        t.duracao,
        t.recursoUrl,
        jsonArr(t.keywords),
        t.areaDisplay,
      ],
    )
  }
  async deleteTrilhaTemplate(id: string): Promise<void> {
    await this.db.run('DELETE FROM trilha_templates WHERE id = ?', [id])
  }

  // ---- Seed / bulk ----
  async isEmpty(): Promise<boolean> {
    const row = await this.db.get<{ n: number }>('SELECT COUNT(*) AS n FROM areas')
    return Number(row?.n ?? 0) === 0
  }
  async counts(): Promise<CatalogCounts> {
    const one = async (table: string) => {
      const r = await this.db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`)
      return Number(r?.n ?? 0)
    }
    return {
      areas: await one('areas'),
      niveis: await one('niveis_carreira'),
      competencias: await one('competencias'),
      matriz: await one('matriz_competencias'),
      habilidades: await one('habilidades'),
      certificacoes: await one('certificacoes'),
      trilhaTemplates: await one('trilha_templates'),
    }
  }
  async replaceAll(data: CatalogSeedData): Promise<void> {
    const stmts: Array<{ sql: string; bind?: SqlBind }> = []
    // Clear (children first; areas/niveis/competencias cascade to the rest anyway).
    for (const t of [
      'certificacao_competencias',
      'certificacao_areas',
      'trilha_templates',
      'habilidades',
      'matriz_competencias',
      'matriz_expectativas',
      'certificacoes',
      'competencias',
      'niveis_carreira',
      'areas',
    ]) {
      stmts.push({ sql: `DELETE FROM ${t}` })
    }
    // Insert parents first.
    for (const a of data.areas) {
      stmts.push({
        sql: 'INSERT INTO areas (id, nome, familia, descricao, ordem) VALUES (?, ?, ?, ?, ?)',
        bind: [a.id, a.nome, a.familia, a.descricao, a.ordem],
      })
    }
    for (const n of data.niveis) {
      stmts.push({
        sql: 'INSERT INTO niveis_carreira (id, nome, ordem, descricao) VALUES (?, ?, ?, ?)',
        bind: [n.id, n.nome, n.ordem, n.descricao],
      })
    }
    for (const c of data.competencias) {
      stmts.push({
        sql: 'INSERT INTO competencias (id, nome, tipo, descricao) VALUES (?, ?, ?, ?)',
        bind: [c.id, c.nome, c.tipo, c.descricao],
      })
    }
    for (const m of data.matriz) {
      stmts.push({
        sql: 'INSERT INTO matriz_competencias (id, area_id, nivel_id, competencia_id, nivel_esperado, descricao) VALUES (?, ?, ?, ?, ?, ?)',
        bind: [m.id, m.areaId, m.nivelId, m.competenciaId, m.nivelEsperado, m.descricao],
      })
    }
    for (const e of data.expectativas) {
      stmts.push({
        sql: 'INSERT INTO matriz_expectativas (area_id, nivel_id, expectativa) VALUES (?, ?, ?)',
        bind: [e.areaId, e.nivelId, e.expectativa],
      })
    }
    for (const h of data.habilidades) {
      stmts.push({
        sql: 'INSERT INTO habilidades (id, area_id, nivel_id, competencia_id, texto, ordem) VALUES (?, ?, ?, ?, ?, ?)',
        bind: [h.id, h.areaId, h.nivelId, h.competenciaId, h.texto, h.ordem],
      })
    }
    for (const c of data.certificacoes) {
      stmts.push({
        sql: 'INSERT INTO certificacoes (id, nome, provedor, url, gratuita, descricao, categoria, keywords) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        bind: [
          c.id,
          c.nome,
          c.provedor,
          c.url,
          b(c.gratuita),
          c.descricao,
          c.categoria,
          jsonArr(c.keywords),
        ],
      })
      for (const cid of c.competenciaIds) {
        stmts.push({
          sql: 'INSERT INTO certificacao_competencias (certificacao_id, competencia_id) VALUES (?, ?)',
          bind: [c.id, cid],
        })
      }
      for (const aid of c.areaIds) {
        stmts.push({
          sql: 'INSERT INTO certificacao_areas (certificacao_id, area_id) VALUES (?, ?)',
          bind: [c.id, aid],
        })
      }
    }
    for (const t of data.trilhaTemplates) {
      stmts.push({
        sql: `INSERT INTO trilha_templates
                (id, competencia_id, area_id, tipo, titulo, descricao, duracao, recurso_url,
                 keywords, area_display)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        bind: [
          t.id,
          t.competenciaId,
          t.areaId,
          t.tipo,
          t.titulo,
          t.descricao,
          t.duracao,
          t.recursoUrl,
          jsonArr(t.keywords),
          t.areaDisplay,
        ],
      })
    }
    await this.db.tx(stmts)
  }
}

// ---- row mappers ----
function str(v: unknown): string {
  return typeof v === 'string' ? v : String(v ?? '')
}
function strOrNull(v: unknown): string | null {
  return v == null ? null : String(v)
}
function numOrNull(v: unknown): number | null {
  return v == null ? null : Number(v)
}

function rowToArea(r: Record<string, unknown>): Area {
  return {
    id: str(r.id),
    nome: str(r.nome),
    familia: strOrNull(r.familia),
    descricao: strOrNull(r.descricao),
    ordem: Number(r.ordem ?? 0),
  }
}
function rowToNivel(r: Record<string, unknown>): NivelCarreira {
  return {
    id: str(r.id),
    nome: str(r.nome),
    ordem: Number(r.ordem ?? 0),
    descricao: strOrNull(r.descricao),
  }
}
function rowToCompetencia(r: Record<string, unknown>): Competencia {
  return {
    id: str(r.id),
    nome: str(r.nome),
    tipo: str(r.tipo) as CompetenciaTipo,
    descricao: strOrNull(r.descricao),
  }
}
function rowToMatriz(r: Record<string, unknown>): MatrizItem {
  return {
    id: str(r.id),
    areaId: str(r.area_id),
    nivelId: str(r.nivel_id),
    competenciaId: str(r.competencia_id),
    nivelEsperado: numOrNull(r.nivel_esperado),
    descricao: strOrNull(r.descricao),
  }
}
function rowToHabilidade(r: Record<string, unknown>): Habilidade {
  return {
    id: str(r.id),
    areaId: str(r.area_id),
    nivelId: str(r.nivel_id),
    competenciaId: str(r.competencia_id),
    texto: str(r.texto),
    ordem: Number(r.ordem ?? 0),
  }
}
function rowToCertificacao(
  r: Record<string, unknown>,
  compLinks: Array<Record<string, unknown>>,
  areaLinks: Array<Record<string, unknown>>,
): Certificacao {
  const id = str(r.id)
  return {
    id,
    nome: str(r.nome),
    provedor: strOrNull(r.provedor),
    url: strOrNull(r.url),
    gratuita: Number(r.gratuita ?? 0) === 1,
    descricao: strOrNull(r.descricao),
    categoria: strOrNull(r.categoria),
    keywords: parseArr(r.keywords),
    competenciaIds: compLinks
      .filter((l) => str(l.certificacao_id) === id)
      .map((l) => str(l.competencia_id)),
    areaIds: areaLinks
      .filter((l) => str(l.certificacao_id) === id)
      .map((l) => str(l.area_id)),
  }
}
function rowToTrilhaTemplate(r: Record<string, unknown>): TrilhaTemplate {
  return {
    id: str(r.id),
    competenciaId: strOrNull(r.competencia_id),
    areaId: strOrNull(r.area_id),
    tipo: str(r.tipo) as TrilhaTipo,
    titulo: str(r.titulo),
    descricao: strOrNull(r.descricao),
    duracao: strOrNull(r.duracao),
    recursoUrl: strOrNull(r.recurso_url),
    keywords: parseArr(r.keywords),
    areaDisplay: strOrNull(r.area_display),
  }
}
