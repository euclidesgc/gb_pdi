import type { Database, Row, SqlBind } from '@/data/ports/Database'
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

export class SqlitePdiRepository implements PdiRepository {
  private db: Database

  constructor(db: Database) {
    this.db = db
  }

  // ---- Perfil ----
  async getPerfil(): Promise<Perfil> {
    const r = await this.db.get('SELECT * FROM perfil WHERE id = 1')
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
    await this.db.run(
      `UPDATE perfil SET
         nome = ?, email = ?, proposito = ?, area_id = ?, nivel_id = ?,
         wizard_concluido = ?, step_atual = ?
       WHERE id = 1`,
      [
        p.nome,
        p.email,
        p.proposito,
        p.areaId,
        p.nivelId,
        b(p.wizardConcluido),
        p.stepAtual,
      ],
    )
  }

  // ---- Hard skills ----
  async listHardSkills(): Promise<UserHardSkill[]> {
    const rows = await this.db.all('SELECT * FROM user_hard_skills ORDER BY nome')
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
      `INSERT INTO user_hard_skills (id, competencia_id, nome, nivel_atual, nivel_desejado)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         competencia_id = excluded.competencia_id, nome = excluded.nome,
         nivel_atual = excluded.nivel_atual, nivel_desejado = excluded.nivel_desejado`,
      [s.id, s.competenciaId, s.nome, s.nivelAtual, s.nivelDesejado],
    )
  }
  async deleteHardSkill(id: string): Promise<void> {
    await this.db.run('DELETE FROM user_hard_skills WHERE id = ?', [id])
  }

  // ---- Soft skills ----
  async listSoftSkills(): Promise<UserSoftSkill[]> {
    const rows = await this.db.all('SELECT * FROM user_soft_skills ORDER BY nome')
    return rows.map((r) => ({
      id: str(r.id),
      competenciaId: strOrNull(r.competencia_id),
      nome: str(r.nome),
      avaliacao: str(r.avaliacao) as SoftAvaliacao,
    }))
  }
  async upsertSoftSkill(s: UserSoftSkill): Promise<void> {
    await this.db.run(
      `INSERT INTO user_soft_skills (id, competencia_id, nome, avaliacao)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         competencia_id = excluded.competencia_id, nome = excluded.nome,
         avaliacao = excluded.avaliacao`,
      [s.id, s.competenciaId, s.nome, s.avaliacao],
    )
  }
  async deleteSoftSkill(id: string): Promise<void> {
    await this.db.run('DELETE FROM user_soft_skills WHERE id = ?', [id])
  }

  // ---- Auto-avaliação de habilidades ----
  async listAvaliacoes(): Promise<UserAvaliacao[]> {
    const rows = await this.db.all('SELECT * FROM user_autoavaliacao')
    return rows.map((r) => ({ habilidadeId: str(r.habilidade_id), nota: num(r.nota) }))
  }
  async setAvaliacao(habilidadeId: string, nota: number): Promise<void> {
    if (!nota) {
      await this.db.run('DELETE FROM user_autoavaliacao WHERE habilidade_id = ?', [habilidadeId])
      return
    }
    await this.db.run(
      `INSERT INTO user_autoavaliacao (habilidade_id, nota) VALUES (?, ?)
       ON CONFLICT(habilidade_id) DO UPDATE SET nota = excluded.nota`,
      [habilidadeId, nota],
    )
  }

  // ---- Objetivos ----
  async listObjetivos(): Promise<Objetivo[]> {
    const rows = await this.db.all('SELECT * FROM objetivos ORDER BY ordem, titulo')
    return rows.map(rowToObjetivo)
  }
  async upsertObjetivo(o: Objetivo): Promise<void> {
    await this.db.run(
      `INSERT INTO objetivos (id, titulo, categoria, prazo, justificativa, ordem)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         titulo = excluded.titulo, categoria = excluded.categoria, prazo = excluded.prazo,
         justificativa = excluded.justificativa, ordem = excluded.ordem`,
      [o.id, o.titulo, o.categoria, o.prazo, o.justificativa, o.ordem],
    )
  }
  async deleteObjetivo(id: string): Promise<void> {
    await this.db.run('DELETE FROM objetivos WHERE id = ?', [id])
  }

  // ---- Ações ----
  async listAcoes(objetivoId?: string): Promise<Acao[]> {
    const sql = objetivoId
      ? 'SELECT * FROM acoes WHERE objetivo_id = ? ORDER BY ordem'
      : 'SELECT * FROM acoes ORDER BY ordem'
    const rows = await this.db.all(sql, objetivoId ? [objetivoId] : [])
    return rows.map(rowToAcao)
  }
  async upsertAcao(a: Acao): Promise<void> {
    await this.db.run(
      `INSERT INTO acoes (id, objetivo_id, titulo, categoria, prazo, due_date, status, detalhes, ordem)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         objetivo_id = excluded.objetivo_id, titulo = excluded.titulo, categoria = excluded.categoria,
         prazo = excluded.prazo, due_date = excluded.due_date, status = excluded.status,
         detalhes = excluded.detalhes, ordem = excluded.ordem`,
      [a.id, a.objetivoId, a.titulo, a.categoria, a.prazo, a.dueDate, a.status, a.detalhes, a.ordem],
    )
  }
  async updateAcaoStatus(id: string, status: AcaoStatus): Promise<void> {
    await this.db.run('UPDATE acoes SET status = ? WHERE id = ?', [status, id])
  }
  async deleteAcao(id: string): Promise<void> {
    await this.db.run('DELETE FROM acoes WHERE id = ?', [id])
  }

  // ---- Campo de forças ----
  async listForcas(objetivoId?: string): Promise<Forca[]> {
    const sql = objetivoId
      ? 'SELECT * FROM forcas WHERE objetivo_id = ?'
      : 'SELECT * FROM forcas'
    const rows = await this.db.all(sql, objetivoId ? [objetivoId] : [])
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
      `INSERT INTO forcas (id, objetivo_id, tipo, descricao, intensidade)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         objetivo_id = excluded.objetivo_id, tipo = excluded.tipo,
         descricao = excluded.descricao, intensidade = excluded.intensidade`,
      [f.id, f.objetivoId, f.tipo, f.descricao, f.intensidade],
    )
  }
  async deleteForca(id: string): Promise<void> {
    await this.db.run('DELETE FROM forcas WHERE id = ?', [id])
  }

  // ---- Trilha do usuário ----
  async listTrilhaItens(): Promise<TrilhaItem[]> {
    const rows = await this.db.all('SELECT * FROM trilha_itens ORDER BY titulo')
    return rows.map(rowToTrilhaItem)
  }
  async upsertTrilhaItem(t: TrilhaItem): Promise<void> {
    await this.db.run(
      `INSERT INTO trilha_itens
         (id, template_id, competencia_id, tipo, titulo, descricao, duracao, recurso_url, concluido)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         template_id = excluded.template_id, competencia_id = excluded.competencia_id,
         tipo = excluded.tipo, titulo = excluded.titulo, descricao = excluded.descricao,
         duracao = excluded.duracao, recurso_url = excluded.recurso_url,
         concluido = excluded.concluido`,
      [
        t.id,
        t.templateId,
        t.competenciaId,
        t.tipo,
        t.titulo,
        t.descricao,
        t.duracao,
        t.recursoUrl,
        b(t.concluido),
      ],
    )
  }
  async setTrilhaConcluido(id: string, concluido: boolean): Promise<void> {
    await this.db.run('UPDATE trilha_itens SET concluido = ? WHERE id = ?', [b(concluido), id])
  }
  async deleteTrilhaItem(id: string): Promise<void> {
    await this.db.run('DELETE FROM trilha_itens WHERE id = ?', [id])
  }
  async replaceTrilha(itens: TrilhaItem[]): Promise<void> {
    const stmts: Array<{ sql: string; bind?: SqlBind }> = [
      { sql: 'DELETE FROM trilha_itens' },
      ...itens.map((t) => ({
        sql: `INSERT INTO trilha_itens
                (id, template_id, competencia_id, tipo, titulo, descricao, duracao, recurso_url, concluido)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        bind: [
          t.id,
          t.templateId,
          t.competenciaId,
          t.tipo,
          t.titulo,
          t.descricao,
          t.duracao,
          t.recursoUrl,
          b(t.concluido),
        ] as SqlBind,
      })),
    ]
    await this.db.tx(stmts)
  }

  // ---- Diário ----
  async listDiario(): Promise<DiarioEntry[]> {
    const rows = await this.db.all('SELECT * FROM diario ORDER BY data DESC')
    const links = await this.db.all('SELECT diario_id, habilidade_id FROM diario_habilidades')
    const byEntry = new Map<string, string[]>()
    for (const l of links) {
      const id = str(l.diario_id)
      const arr = byEntry.get(id) ?? []
      arr.push(str(l.habilidade_id))
      byEntry.set(id, arr)
    }
    return rows.map((r) => ({
      id: str(r.id),
      data: str(r.data),
      texto: str(r.texto),
      objetivoId: strOrNull(r.objetivo_id),
      habilidadeIds: byEntry.get(str(r.id)) ?? [],
    }))
  }
  async addDiario(e: DiarioEntry): Promise<void> {
    await this.db.tx([
      {
        sql: 'INSERT INTO diario (id, data, texto, objetivo_id) VALUES (?, ?, ?, ?)',
        bind: [e.id, e.data, e.texto, e.objetivoId],
      },
      ...e.habilidadeIds.map((hid) => ({
        sql: 'INSERT INTO diario_habilidades (diario_id, habilidade_id) VALUES (?, ?)',
        bind: [e.id, hid] as SqlBind,
      })),
    ])
  }
  async deleteDiario(id: string): Promise<void> {
    await this.db.tx([
      { sql: 'DELETE FROM diario_habilidades WHERE diario_id = ?', bind: [id] },
      { sql: 'DELETE FROM diario WHERE id = ?', bind: [id] },
    ])
  }

  // ---- Conquistas ----
  async listConquistas(): Promise<Conquista[]> {
    const rows = await this.db.all('SELECT * FROM conquistas ORDER BY data DESC')
    return rows.map((r) => ({
      id: str(r.id),
      tipo: str(r.tipo),
      titulo: str(r.titulo),
      data: str(r.data),
      vista: bool(r.vista),
    }))
  }
  async addConquista(c: Conquista): Promise<void> {
    // Idempotent per tipo (unique index): a second insert of the same type is a no-op,
    // so concurrent evaluations (e.g. StrictMode double-render) can't duplicate it.
    await this.db.run(
      'INSERT OR IGNORE INTO conquistas (id, tipo, titulo, data, vista) VALUES (?, ?, ?, ?, ?)',
      [c.id, c.tipo, c.titulo, c.data, b(c.vista)],
    )
  }
  async marcarConquistaVista(id: string): Promise<void> {
    await this.db.run('UPDATE conquistas SET vista = 1 WHERE id = ?', [id])
  }

  // ---- Ciclos ----
  async listCiclos(): Promise<Ciclo[]> {
    const rows = await this.db.all('SELECT * FROM ciclos ORDER BY data_inicio DESC')
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
      'INSERT INTO ciclos (id, data_inicio, data_fim, score_saude, snapshot_json) VALUES (?, ?, ?, ?, ?)',
      [c.id, c.dataInicio, c.dataFim, c.scoreSaude, c.snapshotJson],
    )
  }
  async deleteCiclo(id: string): Promise<void> {
    await this.db.run('DELETE FROM ciclos WHERE id = ?', [id])
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
      versao: 2,
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
    const p = data.perfil
    const stmts: Array<{ sql: string; bind?: SqlBind }> = [
      // Clear user data (children before parents).
      { sql: 'DELETE FROM forcas' },
      { sql: 'DELETE FROM acoes' },
      { sql: 'DELETE FROM diario_habilidades' },
      { sql: 'DELETE FROM diario' },
      { sql: 'DELETE FROM trilha_itens' },
      { sql: 'DELETE FROM conquistas' },
      { sql: 'DELETE FROM ciclos' },
      { sql: 'DELETE FROM user_hard_skills' },
      { sql: 'DELETE FROM user_soft_skills' },
      { sql: 'DELETE FROM user_autoavaliacao' },
      { sql: 'DELETE FROM objetivos' },
      // Perfil singleton.
      {
        sql: `UPDATE perfil SET nome = ?, email = ?, proposito = ?, area_id = ?, nivel_id = ?,
                 wizard_concluido = ?, step_atual = ? WHERE id = 1`,
        bind: [
          p.nome,
          p.email,
          p.proposito,
          p.areaId,
          p.nivelId,
          b(p.wizardConcluido),
          p.stepAtual,
        ] as SqlBind,
      },
      // Parents first.
      ...(data.objetivos ?? []).map((o) => ({
        sql: `INSERT INTO objetivos (id, titulo, categoria, prazo, justificativa, ordem)
              VALUES (?, ?, ?, ?, ?, ?)`,
        bind: [o.id, o.titulo, o.categoria, o.prazo, o.justificativa, o.ordem] as SqlBind,
      })),
      ...(data.hardSkills ?? []).map((s) => ({
        sql: `INSERT INTO user_hard_skills (id, competencia_id, nome, nivel_atual, nivel_desejado)
              VALUES (?, ?, ?, ?, ?)`,
        bind: [s.id, s.competenciaId, s.nome, s.nivelAtual, s.nivelDesejado] as SqlBind,
      })),
      ...(data.softSkills ?? []).map((s) => ({
        sql: `INSERT INTO user_soft_skills (id, competencia_id, nome, avaliacao) VALUES (?, ?, ?, ?)`,
        bind: [s.id, s.competenciaId, s.nome, s.avaliacao] as SqlBind,
      })),
      ...(data.avaliacoes ?? []).map((a) => ({
        sql: `INSERT INTO user_autoavaliacao (habilidade_id, nota) VALUES (?, ?)`,
        bind: [a.habilidadeId, a.nota] as SqlBind,
      })),
      ...(data.acoes ?? []).map((a) => ({
        sql: `INSERT INTO acoes (id, objetivo_id, titulo, categoria, prazo, due_date, status, detalhes, ordem)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        bind: [a.id, a.objetivoId, a.titulo, a.categoria, a.prazo, a.dueDate, a.status, a.detalhes, a.ordem] as SqlBind,
      })),
      ...(data.forcas ?? []).map((f) => ({
        sql: `INSERT INTO forcas (id, objetivo_id, tipo, descricao, intensidade) VALUES (?, ?, ?, ?, ?)`,
        bind: [f.id, f.objetivoId, f.tipo, f.descricao, f.intensidade] as SqlBind,
      })),
      ...(data.trilhaItens ?? []).map((t) => ({
        sql: `INSERT INTO trilha_itens
                (id, template_id, competencia_id, tipo, titulo, descricao, duracao, recurso_url, concluido)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        bind: [
          t.id,
          t.templateId,
          t.competenciaId,
          t.tipo,
          t.titulo,
          t.descricao,
          t.duracao,
          t.recursoUrl,
          b(t.concluido),
        ] as SqlBind,
      })),
      ...(data.diario ?? []).map((e) => ({
        sql: `INSERT INTO diario (id, data, texto, objetivo_id) VALUES (?, ?, ?, ?)`,
        bind: [e.id, e.data, e.texto, e.objetivoId] as SqlBind,
      })),
      ...(data.diario ?? []).flatMap((e) =>
        (e.habilidadeIds ?? []).map((hid) => ({
          sql: 'INSERT INTO diario_habilidades (diario_id, habilidade_id) VALUES (?, ?)',
          bind: [e.id, hid] as SqlBind,
        })),
      ),
      ...(data.conquistas ?? []).map((c) => ({
        sql: `INSERT OR IGNORE INTO conquistas (id, tipo, titulo, data, vista) VALUES (?, ?, ?, ?, ?)`,
        bind: [c.id, c.tipo, c.titulo, c.data, b(c.vista)] as SqlBind,
      })),
      ...(data.ciclos ?? []).map((c) => ({
        sql: `INSERT INTO ciclos (id, data_inicio, data_fim, score_saude, snapshot_json) VALUES (?, ?, ?, ?, ?)`,
        bind: [c.id, c.dataInicio, c.dataFim, c.scoreSaude, c.snapshotJson] as SqlBind,
      })),
    ]
    await this.db.tx(stmts)
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
  }
}
