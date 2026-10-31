import type { Database, Row, SqlBind } from '../db/Database'
import type { PdiRepository } from '@/data/ports/PdiRepository'
import type {
  Acao,
  AcaoStatus,
  Ciclo,
  Conquista,
  DiarioEntry,
  Forca,
  ForcaTipo,
  Objetivo,
  ObjetivoCategoria,
  PdiExport,
  Perfil,
  SoftAvaliacao,
  TrilhaItem,
  UserAvaliacao,
  UserHardSkill,
  UserSoftSkill,
} from '@/domain/pdi'
import { PERFIL_PADRAO } from '@/domain/pdi'

const b = (v: boolean) => (v ? 1 : 0)
const str = (v: unknown): string => (typeof v === 'string' ? v : String(v ?? ''))
const strOrNull = (v: unknown): string | null => (v == null ? null : String(v))
const num = (v: unknown): number => Number(v ?? 0)
const bool = (v: unknown): boolean => Number(v ?? 0) === 1

type Stmt = { sql: string; bind?: SqlBind }

/** Today (yyyy-mm-dd) in Brazil, the date stamped on finished ações and trilha items. */
const HOJE_SQL = `to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')`

/** Link tables of a diário entry, in the order listDiario reads them. */
const DIARIO_LINKS = [
  { table: 'diario_habilidades', col: 'habilidade_id' },
  { table: 'diario_objetivos', col: 'objetivo_id' },
  { table: 'diario_acoes', col: 'acao_id' },
  { table: 'diario_trilha', col: 'trilha_item_id' },
] as const

/**
 * The PDI of ONE user. Every query is scoped by `user_id`, and upserts only
 * update a row when it already belongs to this user (`WHERE t.user_id = …`), so
 * a client can never read or overwrite someone else's records by guessing ids.
 */
export class PgPdiRepository implements PdiRepository {
  private db: Database
  private userId: string

  constructor(db: Database, userId: string) {
    this.db = db
    this.userId = userId
  }

  // ---- Perfil ----
  async getPerfil(): Promise<Perfil> {
    const r = await this.db.get('SELECT * FROM perfil WHERE user_id = ?', [this.userId])
    if (!r) return { ...PERFIL_PADRAO }
    return {
      nome: str(r.nome),
      email: strOrNull(r.email),
      proposito: strOrNull(r.proposito),
      areaId: strOrNull(r.area_id),
      nivelId: strOrNull(r.nivel_id),
      wizardConcluido: bool(r.wizard_concluido),
      stepAtual: num(r.step_atual),
    }
  }
  async savePerfil(p: Perfil): Promise<void> {
    await this.db.run(this.perfilUpsert.sql, this.perfilUpsert.bind(p))
  }
  private perfilUpsert = {
    sql: `INSERT INTO perfil
            (user_id, nome, email, proposito, area_id, nivel_id, wizard_concluido, step_atual)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            nome = excluded.nome, email = excluded.email, proposito = excluded.proposito,
            area_id = excluded.area_id, nivel_id = excluded.nivel_id,
            wizard_concluido = excluded.wizard_concluido, step_atual = excluded.step_atual`,
    bind: (p: Perfil): SqlBind => [
      this.userId,
      p.nome,
      p.email,
      p.proposito,
      p.areaId,
      p.nivelId,
      b(p.wizardConcluido),
      p.stepAtual,
    ],
  }

  // ---- Hard skills ----
  async listHardSkills(): Promise<UserHardSkill[]> {
    const rows = await this.db.all(
      'SELECT * FROM user_hard_skills WHERE user_id = ? ORDER BY nome',
      [this.userId],
    )
    return rows.map((r) => ({
      id: str(r.id),
      competenciaId: strOrNull(r.competencia_id),
      nome: str(r.nome),
      nivelAtual: num(r.nivel_atual),
      nivelDesejado: num(r.nivel_desejado),
    }))
  }
  async upsertHardSkill(s: UserHardSkill): Promise<void> {
    await this.db.run(
      `INSERT INTO user_hard_skills AS t (id, user_id, competencia_id, nome, nivel_atual, nivel_desejado)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         competencia_id = excluded.competencia_id, nome = excluded.nome,
         nivel_atual = excluded.nivel_atual, nivel_desejado = excluded.nivel_desejado
       WHERE t.user_id = excluded.user_id`,
      [s.id, this.userId, s.competenciaId, s.nome, s.nivelAtual, s.nivelDesejado],
    )
  }
  async deleteHardSkill(id: string): Promise<void> {
    await this.deleteOwned('user_hard_skills', id)
  }

  // ---- Soft skills ----
  async listSoftSkills(): Promise<UserSoftSkill[]> {
    const rows = await this.db.all(
      'SELECT * FROM user_soft_skills WHERE user_id = ? ORDER BY nome',
      [this.userId],
    )
    return rows.map((r) => ({
      id: str(r.id),
      competenciaId: strOrNull(r.competencia_id),
      nome: str(r.nome),
      avaliacao: str(r.avaliacao) as SoftAvaliacao,
    }))
  }
  async upsertSoftSkill(s: UserSoftSkill): Promise<void> {
    await this.db.run(
      `INSERT INTO user_soft_skills AS t (id, user_id, competencia_id, nome, avaliacao)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         competencia_id = excluded.competencia_id, nome = excluded.nome,
         avaliacao = excluded.avaliacao
       WHERE t.user_id = excluded.user_id`,
      [s.id, this.userId, s.competenciaId, s.nome, s.avaliacao],
    )
  }
  async deleteSoftSkill(id: string): Promise<void> {
    await this.deleteOwned('user_soft_skills', id)
  }

  // ---- Auto-avaliação de habilidades ----
  async listAvaliacoes(): Promise<UserAvaliacao[]> {
    const rows = await this.db.all('SELECT * FROM user_autoavaliacao WHERE user_id = ?', [
      this.userId,
    ])
    return rows.map((r) => ({ habilidadeId: str(r.habilidade_id), nota: num(r.nota) }))
  }
  async setAvaliacao(habilidadeId: string, nota: number): Promise<void> {
    if (!nota) {
      await this.db.run(
        'DELETE FROM user_autoavaliacao WHERE user_id = ? AND habilidade_id = ?',
        [this.userId, habilidadeId],
      )
      return
    }
    await this.db.run(
      `INSERT INTO user_autoavaliacao (user_id, habilidade_id, nota) VALUES (?, ?, ?)
       ON CONFLICT(user_id, habilidade_id) DO UPDATE SET nota = excluded.nota`,
      [this.userId, habilidadeId, nota],
    )
  }

  // ---- Objetivos ----
  async listObjetivos(): Promise<Objetivo[]> {
    const rows = await this.db.all(
      'SELECT * FROM objetivos WHERE user_id = ? ORDER BY ordem, titulo',
      [this.userId],
    )
    return rows.map(rowToObjetivo)
  }
  async upsertObjetivo(o: Objetivo): Promise<void> {
    await this.db.run(
      `INSERT INTO objetivos AS t (id, user_id, titulo, categoria, prazo, justificativa, ordem)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         titulo = excluded.titulo, categoria = excluded.categoria, prazo = excluded.prazo,
         justificativa = excluded.justificativa, ordem = excluded.ordem
       WHERE t.user_id = excluded.user_id`,
      [o.id, this.userId, o.titulo, o.categoria, o.prazo, o.justificativa, o.ordem],
    )
  }
  async deleteObjetivo(id: string): Promise<void> {
    await this.deleteOwned('objetivos', id)
  }

  // ---- Ações ----
  async listAcoes(objetivoId?: string): Promise<Acao[]> {
    const rows = objetivoId
      ? await this.db.all(
          'SELECT * FROM acoes WHERE user_id = ? AND objetivo_id = ? ORDER BY ordem',
          [this.userId, objetivoId],
        )
      : await this.db.all('SELECT * FROM acoes WHERE user_id = ? ORDER BY ordem', [this.userId])
    return rows.map(rowToAcao)
  }
  async upsertAcao(a: Acao): Promise<void> {
    await this.db.run(
      `INSERT INTO acoes AS t
         (id, user_id, objetivo_id, titulo, categoria, prazo, due_date, status, detalhes, ordem, concluido_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'concluido' THEN ${HOJE_SQL} END)
       ON CONFLICT(id) DO UPDATE SET
         objetivo_id = excluded.objetivo_id, titulo = excluded.titulo, categoria = excluded.categoria,
         prazo = excluded.prazo, due_date = excluded.due_date, status = excluded.status,
         detalhes = excluded.detalhes, ordem = excluded.ordem,
         concluido_em = CASE WHEN excluded.status = 'concluido'
                             THEN COALESCE(t.concluido_em, excluded.concluido_em) END
       WHERE t.user_id = excluded.user_id`,
      [
        a.id,
        this.userId,
        a.objetivoId,
        a.titulo,
        a.categoria,
        a.prazo,
        a.dueDate,
        a.status,
        a.detalhes,
        a.ordem,
        a.status,
      ],
    )
  }
  async updateAcaoStatus(id: string, status: AcaoStatus): Promise<void> {
    await this.db.run(
      `UPDATE acoes SET status = ?,
         concluido_em = CASE WHEN ? = 'concluido' THEN COALESCE(concluido_em, ${HOJE_SQL}) END
       WHERE id = ? AND user_id = ?`,
      [status, status, id, this.userId],
    )
  }
  async deleteAcao(id: string): Promise<void> {
    await this.deleteOwned('acoes', id)
  }

  // ---- Campo de forças ----
  async listForcas(objetivoId?: string): Promise<Forca[]> {
    const rows = objetivoId
      ? await this.db.all('SELECT * FROM forcas WHERE user_id = ? AND objetivo_id = ?', [
          this.userId,
          objetivoId,
        ])
      : await this.db.all('SELECT * FROM forcas WHERE user_id = ?', [this.userId])
    return rows.map((r) => ({
      id: str(r.id),
      objetivoId: strOrNull(r.objetivo_id),
      tipo: str(r.tipo) as ForcaTipo,
      descricao: str(r.descricao),
      intensidade: num(r.intensidade),
    }))
  }
  async upsertForca(f: Forca): Promise<void> {
    await this.db.run(
      `INSERT INTO forcas AS t (id, user_id, objetivo_id, tipo, descricao, intensidade)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         objetivo_id = excluded.objetivo_id, tipo = excluded.tipo,
         descricao = excluded.descricao, intensidade = excluded.intensidade
       WHERE t.user_id = excluded.user_id`,
      [f.id, this.userId, f.objetivoId, f.tipo, f.descricao, f.intensidade],
    )
  }
  async deleteForca(id: string): Promise<void> {
    await this.deleteOwned('forcas', id)
  }

  // ---- Trilha do usuário ----
  async listTrilhaItens(): Promise<TrilhaItem[]> {
    const rows = await this.db.all(
      'SELECT * FROM trilha_itens WHERE user_id = ? ORDER BY titulo',
      [this.userId],
    )
    return rows.map(rowToTrilhaItem)
  }
  async upsertTrilhaItem(t: TrilhaItem): Promise<void> {
    await this.db.run(
      `INSERT INTO trilha_itens AS t
         (id, user_id, template_id, competencia_id, tipo, titulo, descricao, duracao, recurso_url, concluido, concluido_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 1 THEN ${HOJE_SQL} END)
       ON CONFLICT(id) DO UPDATE SET
         template_id = excluded.template_id, competencia_id = excluded.competencia_id,
         tipo = excluded.tipo, titulo = excluded.titulo, descricao = excluded.descricao,
         duracao = excluded.duracao, recurso_url = excluded.recurso_url,
         concluido = excluded.concluido,
         concluido_em = CASE WHEN excluded.concluido = 1
                             THEN COALESCE(t.concluido_em, excluded.concluido_em) END
       WHERE t.user_id = excluded.user_id`,
      [...this.trilhaBind(t), b(t.concluido)],
    )
  }
  async setTrilhaConcluido(id: string, concluido: boolean): Promise<void> {
    await this.db.run(
      `UPDATE trilha_itens SET concluido = ?,
         concluido_em = CASE WHEN ? = 1 THEN COALESCE(concluido_em, ${HOJE_SQL}) END
       WHERE id = ? AND user_id = ?`,
      [b(concluido), b(concluido), id, this.userId],
    )
  }
  async deleteTrilhaItem(id: string): Promise<void> {
    await this.deleteOwned('trilha_itens', id)
  }
  async replaceTrilha(itens: TrilhaItem[]): Promise<void> {
    await this.db.tx([
      { sql: 'DELETE FROM trilha_itens WHERE user_id = ?', bind: [this.userId] },
      ...itens.map((t) => this.trilhaInsert(t)),
    ])
  }
  private trilhaBind(t: TrilhaItem): SqlBind {
    return [
      t.id,
      this.userId,
      t.templateId,
      t.competenciaId,
      t.tipo,
      t.titulo,
      t.descricao,
      t.duracao,
      t.recursoUrl,
      b(t.concluido),
    ]
  }
  private trilhaInsert(t: TrilhaItem): Stmt {
    return {
      sql: `INSERT INTO trilha_itens
              (id, user_id, template_id, competencia_id, tipo, titulo, descricao, duracao, recurso_url, concluido, concluido_em)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      bind: [...this.trilhaBind(t), t.concluido ? (t.concluidoEm ?? null) : null],
    }
  }

  // ---- Diário ----
  async listDiario(): Promise<DiarioEntry[]> {
    const rows = await this.db.all('SELECT * FROM diario WHERE user_id = ? ORDER BY data DESC, created_at DESC', [
      this.userId,
    ])
    const [habs, objs, acoes, trilha] = await Promise.all(
      DIARIO_LINKS.map((l) =>
        this.db.all(
          `SELECT x.diario_id, x.${l.col} AS ref FROM ${l.table} x
             JOIN diario d ON d.id = x.diario_id
            WHERE d.user_id = ?`,
          [this.userId],
        ),
      ),
    )
    const group = (links: Row[]) => {
      const byEntry = new Map<string, string[]>()
      for (const l of links) {
        const id = str(l.diario_id)
        const arr = byEntry.get(id) ?? []
        arr.push(str(l.ref))
        byEntry.set(id, arr)
      }
      return byEntry
    }
    const [h, o, a, t] = [habs, objs, acoes, trilha].map(group)
    return rows.map((r) => {
      const id = str(r.id)
      return {
        id,
        data: str(r.data),
        texto: str(r.texto),
        objetivoIds: o.get(id) ?? [],
        acaoIds: a.get(id) ?? [],
        trilhaItemIds: t.get(id) ?? [],
        habilidadeIds: h.get(id) ?? [],
        destaque: bool(r.destaque),
      }
    })
  }
  async addDiario(e: DiarioEntry): Promise<void> {
    await this.db.tx(this.diarioInserts(e))
  }
  async updateDiario(e: DiarioEntry): Promise<void> {
    await this.db.tx([
      {
        sql: `UPDATE diario SET data = ?, texto = ?, destaque = ?, updated_at = now()
               WHERE id = ? AND user_id = ?`,
        bind: [e.data, e.texto, b(e.destaque ?? false), e.id, this.userId],
      },
      ...DIARIO_LINKS.map((l) => ({
        sql: `DELETE FROM ${l.table}
               WHERE diario_id = (SELECT id FROM diario WHERE id = ? AND user_id = ?)`,
        bind: [e.id, this.userId],
      })),
      ...this.diarioLinkInserts(e),
    ])
  }
  async deleteDiario(id: string): Promise<void> {
    // The link tables cascade from diario.
    await this.deleteOwned('diario', id)
  }
  private diarioInserts(e: DiarioEntry & { objetivoId?: string | null }): Stmt[] {
    return [
      {
        sql: 'INSERT INTO diario (id, user_id, data, texto, destaque) VALUES (?, ?, ?, ?, ?)',
        bind: [e.id, this.userId, e.data, e.texto, b(e.destaque ?? false)],
      },
      ...this.diarioLinkInserts(e),
    ]
  }
  private diarioLinkInserts(e: DiarioEntry & { objetivoId?: string | null }): Stmt[] {
    // Exports before v3 carried a single objetivoId.
    const objetivoIds = e.objetivoIds ?? (e.objetivoId ? [e.objetivoId] : [])
    // The entry and the linked records must belong to this user; unknown ids are
    // skipped, not errors.
    const mine = 'EXISTS (SELECT 1 FROM diario WHERE id = ? AND user_id = ?)'
    const owned = (table: string, col: string, ownerTable: string, ids: string[] | undefined) =>
      (ids ?? []).map((ref) => ({
        sql: `INSERT INTO ${table} (diario_id, ${col})
                SELECT ?, id FROM ${ownerTable} WHERE id = ? AND user_id = ? AND ${mine}
              ON CONFLICT DO NOTHING`,
        bind: [e.id, ref, this.userId, e.id, this.userId],
      }))
    return [
      ...(e.habilidadeIds ?? []).map((hid) => ({
        sql: `INSERT INTO diario_habilidades (diario_id, habilidade_id)
                SELECT ?, ? WHERE ${mine}
              ON CONFLICT DO NOTHING`,
        bind: [e.id, hid, e.id, this.userId],
      })),
      ...owned('diario_objetivos', 'objetivo_id', 'objetivos', objetivoIds),
      ...owned('diario_acoes', 'acao_id', 'acoes', e.acaoIds),
      ...owned('diario_trilha', 'trilha_item_id', 'trilha_itens', e.trilhaItemIds),
    ]
  }

  // ---- Conquistas ----
  async listConquistas(): Promise<Conquista[]> {
    const rows = await this.db.all(
      'SELECT * FROM conquistas WHERE user_id = ? ORDER BY data DESC',
      [this.userId],
    )
    return rows.map((r) => ({
      id: str(r.id),
      tipo: str(r.tipo),
      titulo: str(r.titulo),
      data: str(r.data),
      vista: bool(r.vista),
    }))
  }
  async addConquista(c: Conquista): Promise<void> {
    // Idempotent per (user, tipo): a second insert of the same type is a no-op,
    // so concurrent evaluations (e.g. StrictMode double-render) can't duplicate it.
    await this.db.run(this.conquistaInsert(c).sql, this.conquistaInsert(c).bind)
  }
  async marcarConquistaVista(id: string): Promise<void> {
    await this.db.run('UPDATE conquistas SET vista = 1 WHERE id = ? AND user_id = ?', [
      id,
      this.userId,
    ])
  }
  private conquistaInsert(c: Conquista): Stmt {
    return {
      sql: `INSERT INTO conquistas (id, user_id, tipo, titulo, data, vista) VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT DO NOTHING`,
      bind: [c.id, this.userId, c.tipo, c.titulo, c.data, b(c.vista)],
    }
  }

  // ---- Ciclos ----
  async listCiclos(): Promise<Ciclo[]> {
    const rows = await this.db.all(
      'SELECT * FROM ciclos WHERE user_id = ? ORDER BY data_inicio DESC',
      [this.userId],
    )
    return rows.map((r) => ({
      id: str(r.id),
      dataInicio: str(r.data_inicio),
      dataFim: strOrNull(r.data_fim),
      scoreSaude: r.score_saude == null ? null : num(r.score_saude),
      snapshotJson: strOrNull(r.snapshot_json),
    }))
  }
  async addCiclo(c: Ciclo): Promise<void> {
    await this.db.run(
      `INSERT INTO ciclos (id, user_id, data_inicio, data_fim, score_saude, snapshot_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [c.id, this.userId, c.dataInicio, c.dataFim, c.scoreSaude, c.snapshotJson],
    )
  }
  async deleteCiclo(id: string): Promise<void> {
    await this.deleteOwned('ciclos', id)
  }

  // ---- Portabilidade (LGPD) ----
  async exportAll(): Promise<PdiExport> {
    const [perfil, hardSkills, softSkills, avaliacoes, objetivos, acoes, forcas, trilhaItens, diario, conquistas, ciclos] =
      await Promise.all([
        this.getPerfil(),
        this.listHardSkills(),
        this.listSoftSkills(),
        this.listAvaliacoes(),
        this.listObjetivos(),
        this.listAcoes(),
        this.listForcas(),
        this.listTrilhaItens(),
        this.listDiario(),
        this.listConquistas(),
        this.listCiclos(),
      ])
    return {
      versao: 3,
      exportadoEm: new Date().toISOString(),
      perfil,
      hardSkills,
      softSkills,
      avaliacoes,
      objetivos,
      acoes,
      forcas,
      trilhaItens,
      diario,
      conquistas,
      ciclos,
    }
  }

  async importAll(data: PdiExport): Promise<void> {
    const u = this.userId
    const stmts: Stmt[] = [
      // Clear this user's data (children before parents; the diário link tables cascade).
      ...[
        'forcas',
        'acoes',
        'diario',
        'trilha_itens',
        'conquistas',
        'ciclos',
        'user_hard_skills',
        'user_soft_skills',
        'user_autoavaliacao',
        'objetivos',
      ].map((t) => ({ sql: `DELETE FROM ${t} WHERE user_id = ?`, bind: [u] })),
      { sql: this.perfilUpsert.sql, bind: this.perfilUpsert.bind(data.perfil) },
      // Parents first.
      ...(data.objetivos ?? []).map((o) => ({
        sql: `INSERT INTO objetivos (id, user_id, titulo, categoria, prazo, justificativa, ordem)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        bind: [o.id, u, o.titulo, o.categoria, o.prazo, o.justificativa, o.ordem],
      })),
      ...(data.hardSkills ?? []).map((s) => ({
        sql: `INSERT INTO user_hard_skills (id, user_id, competencia_id, nome, nivel_atual, nivel_desejado)
              VALUES (?, ?, ?, ?, ?, ?)`,
        bind: [s.id, u, s.competenciaId, s.nome, s.nivelAtual, s.nivelDesejado],
      })),
      ...(data.softSkills ?? []).map((s) => ({
        sql: `INSERT INTO user_soft_skills (id, user_id, competencia_id, nome, avaliacao)
              VALUES (?, ?, ?, ?, ?)`,
        bind: [s.id, u, s.competenciaId, s.nome, s.avaliacao],
      })),
      ...(data.avaliacoes ?? []).map((a) => ({
        sql: `INSERT INTO user_autoavaliacao (user_id, habilidade_id, nota) VALUES (?, ?, ?)`,
        bind: [u, a.habilidadeId, a.nota],
      })),
      ...(data.acoes ?? []).map((a) => ({
        sql: `INSERT INTO acoes
                (id, user_id, objetivo_id, titulo, categoria, prazo, due_date, status, detalhes, ordem, concluido_em)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        bind: [
          a.id, u, a.objetivoId, a.titulo, a.categoria, a.prazo, a.dueDate, a.status, a.detalhes, a.ordem,
          a.status === 'concluido' ? (a.concluidoEm ?? null) : null,
        ],
      })),
      ...(data.forcas ?? []).map((f) => ({
        sql: `INSERT INTO forcas (id, user_id, objetivo_id, tipo, descricao, intensidade)
              VALUES (?, ?, ?, ?, ?, ?)`,
        bind: [f.id, u, f.objetivoId, f.tipo, f.descricao, f.intensidade],
      })),
      ...(data.trilhaItens ?? []).map((t) => this.trilhaInsert(t)),
      ...(data.diario ?? []).flatMap((e) => this.diarioInserts(e)),
      ...(data.conquistas ?? []).map((c) => this.conquistaInsert(c)),
      ...(data.ciclos ?? []).map((c) => ({
        sql: `INSERT INTO ciclos (id, user_id, data_inicio, data_fim, score_saude, snapshot_json)
              VALUES (?, ?, ?, ?, ?, ?)`,
        bind: [c.id, u, c.dataInicio, c.dataFim, c.scoreSaude, c.snapshotJson],
      })),
    ]
    await this.db.tx(stmts)
  }

  private async deleteOwned(table: string, id: string): Promise<void> {
    await this.db.run(`DELETE FROM ${table} WHERE id = ? AND user_id = ?`, [id, this.userId])
  }
}

// ---- row mappers ----
function rowToObjetivo(r: Row): Objetivo {
  return {
    id: str(r.id),
    titulo: str(r.titulo),
    categoria: str(r.categoria) as ObjetivoCategoria,
    prazo: strOrNull(r.prazo),
    justificativa: strOrNull(r.justificativa),
    ordem: num(r.ordem),
  }
}
function rowToAcao(r: Row): Acao {
  return {
    id: str(r.id),
    objetivoId: strOrNull(r.objetivo_id),
    titulo: str(r.titulo),
    categoria: str(r.categoria) as ObjetivoCategoria,
    prazo: strOrNull(r.prazo),
    dueDate: strOrNull(r.due_date),
    status: str(r.status) as AcaoStatus,
    detalhes: strOrNull(r.detalhes),
    ordem: num(r.ordem),
    concluidoEm: strOrNull(r.concluido_em),
  }
}
function rowToTrilhaItem(r: Row): TrilhaItem {
  return {
    id: str(r.id),
    templateId: strOrNull(r.template_id),
    competenciaId: strOrNull(r.competencia_id),
    tipo: str(r.tipo),
    titulo: str(r.titulo),
    descricao: strOrNull(r.descricao),
    duracao: strOrNull(r.duracao),
    recursoUrl: strOrNull(r.recurso_url),
    concluido: bool(r.concluido),
    concluidoEm: strOrNull(r.concluido_em),
  }
}
