import type { Competencia, Habilidade } from '@/domain/catalog'
import type {
  Acao,
  Conquista,
  DiarioEntry,
  Forca,
  Objetivo,
  Perfil,
  TrilhaItem,
  UserAvaliacao,
} from '@/domain/pdi'
import { daysUntil, formatDateBr, todayIso } from '@/lib/pdiStats'
import { objetivoConcluido, prazoTexto } from '@/lib/prazos'

/**
 * Monta um brag document em Markdown a partir do PDI: entregas (ações
 * concluídas), aprendizado (trilha), destaques e evidências (diário),
 * competências (auto-avaliação), conquistas e próximos passos, filtrados por
 * período. Onde falta informação entra um marcador {{…}} para a pessoa
 * completar: o documento nunca inventa números.
 */

export type SecaoBrag =
  | 'resumo'
  | 'destaques'
  | 'objetivos'
  | 'entregas'
  | 'aprendizado'
  | 'competencias'
  | 'reconhecimentos'
  | 'diario'
  | 'proximos'

export const SECOES_BRAG: { id: SecaoBrag; label: string; padrao: boolean }[] = [
  { id: 'resumo', label: 'Resumo do período', padrao: true },
  { id: 'destaques', label: 'Destaques', padrao: true },
  { id: 'objetivos', label: 'Objetivos', padrao: true },
  { id: 'entregas', label: 'Entregas', padrao: true },
  { id: 'aprendizado', label: 'Aprendizado', padrao: true },
  { id: 'competencias', label: 'Competências', padrao: true },
  { id: 'reconhecimentos', label: 'Reconhecimentos e feedbacks', padrao: true },
  { id: 'diario', label: 'Registro completo do diário', padrao: false },
  { id: 'proximos', label: 'Próximos passos', padrao: true },
]

export interface Periodo {
  inicio: string
  fim: string
}

export type PresetPeriodo = '30d' | 'trimestre' | 'semestre' | '12m' | 'ano'

export const PRESETS: { id: PresetPeriodo; label: string }[] = [
  { id: '30d', label: 'Últimos 30 dias' },
  { id: 'trimestre', label: 'Últimos 3 meses' },
  { id: 'semestre', label: 'Últimos 6 meses' },
  { id: '12m', label: 'Últimos 12 meses' },
  { id: 'ano', label: 'Este ano' },
]

export function periodoDoPreset(p: PresetPeriodo): Periodo {
  const fim = todayIso()
  const d = new Date(`${fim}T12:00:00`)
  if (p === '30d') d.setDate(d.getDate() - 30)
  else if (p === 'trimestre') d.setMonth(d.getMonth() - 3)
  else if (p === 'semestre') d.setMonth(d.getMonth() - 6)
  else if (p === '12m') d.setFullYear(d.getFullYear() - 1)
  else return { inicio: `${fim.slice(0, 4)}-01-01`, fim }
  return { inicio: d.toISOString().slice(0, 10), fim }
}

export interface DadosBrag {
  perfil: Perfil
  areaNome: string | null
  nivelNome: string | null
  objetivos: Objetivo[]
  acoes: Acao[]
  trilha: TrilhaItem[]
  diario: DiarioEntry[]
  conquistas: Conquista[]
  forcas: Forca[]
  avaliacoes: UserAvaliacao[]
  habilidades: Habilidade[]
  competencias: Competencia[]
}

const TIPO_TRILHA: Record<string, string> = {
  curso: 'Curso',
  leitura: 'Leitura',
  pratica: 'Prática',
  projeto: 'Projeto',
  mentoria: 'Mentoria',
  portfolio: 'Portfólio',
  certificacao: 'Certificação',
}

const dentro = (iso: string | null | undefined, p: Periodo) => Boolean(iso && iso >= p.inicio && iso <= p.fim)

/** Uma linha de tabela Markdown sem quebrar a tabela. */
const cel = (s: string) => s.replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim()

/** Texto de uma entrada do diário como item de lista (linhas seguintes recuadas). */
function citarEntrada(e: DiarioEntry, recuo = '  '): string {
  const linhas = e.texto.trim().split('\n')
  return [`${recuo}- _${formatDateBr(e.data)}:_ ${linhas[0]}`, ...linhas.slice(1).map((l) => `${recuo}  ${l}`)].join(
    '\n',
  )
}

export function gerarBragdoc(d: DadosBrag, periodo: Periodo, secoes: Set<SecaoBrag>): string {
  const p = periodo
  const out: string[] = []
  const add = (...l: string[]) => out.push(...l)

  const diarioPeriodo = d.diario.filter((e) => dentro(e.data, p)).sort((a, b) => a.data.localeCompare(b.data))
  const concluidas = d.acoes.filter((a) => a.status === 'concluido' && dentro(a.concluidoEm, p))
  const semData = d.acoes.filter((a) => a.status === 'concluido' && !a.concluidoEm)
  const trilhaPeriodo = d.trilha.filter((t) => t.concluido && dentro(t.concluidoEm, p))
  const trilhaSemData = d.trilha.filter((t) => t.concluido && !t.concluidoEm)
  const conquistas = d.conquistas.filter((c) => dentro(c.data.slice(0, 10), p))
  const objById = new Map(d.objetivos.map((o) => [o.id, o]))
  const diarioPorAcao = new Map<string, DiarioEntry[]>()
  for (const e of diarioPeriodo)
    for (const id of e.acaoIds) diarioPorAcao.set(id, [...(diarioPorAcao.get(id) ?? []), e])

  // Cabeçalho
  add(`# Brag document${d.perfil.nome ? ` — ${d.perfil.nome}` : ''}`, '')
  const cargo = [d.areaNome, d.nivelNome].filter(Boolean).join(' · ')
  if (cargo) add(`**Área e nível:** ${cargo}  `)
  add(`**Período:** ${formatDateBr(p.inicio)} a ${formatDateBr(p.fim)}  `)
  add(`**Gerado em:** ${formatDateBr(todayIso())} pelo GB PDI`, '')
  if (d.perfil.proposito) add(`> ${d.perfil.proposito.trim().replace(/\n+/g, ' ')}`, '')
  add('---', '')

  if (secoes.has('resumo')) {
    add('## Resumo do período', '')
    add(
      `- **${concluidas.length}** ${concluidas.length === 1 ? 'ação concluída' : 'ações concluídas'}`,
      `- **${trilhaPeriodo.length}** ${trilhaPeriodo.length === 1 ? 'item da trilha concluído' : 'itens da trilha concluídos'}`,
      `- **${diarioPeriodo.length}** ${diarioPeriodo.length === 1 ? 'registro no diário' : 'registros no diário'}`,
    )
    if (conquistas.length > 0) add(`- **${conquistas.length}** ${conquistas.length === 1 ? 'conquista' : 'conquistas'} no app`)
    add('', '{{Em 1 a 3 frases: qual foi o tema do período e o principal impacto do seu trabalho?}}', '')
  }

  if (secoes.has('destaques')) {
    add('## Destaques', '')
    const destaques = diarioPeriodo.filter((e) => e.destaque)
    if (destaques.length === 0) {
      add(
        '{{Escolha de 3 a 5 entregas de maior impacto. Formato: **resultado** — o que você fez · impacto (antes → depois) · [evidência](link).}}',
        '',
        '_Dica: marque entradas do diário com a estrela de destaque para que elas apareçam aqui._',
        '',
      )
    } else {
      for (const e of destaques) add(citarEntrada(e, ''))
      add('')
    }
  }

  if (secoes.has('objetivos') && d.objetivos.length > 0) {
    add('## Objetivos', '', '| Objetivo | Tipo | Prazo | Situação |', '|---|---|---|---|')
    for (const o of d.objetivos) {
      const minhas = d.acoes.filter((a) => a.objetivoId === o.id)
      const feitas = minhas.filter((a) => a.status === 'concluido').length
      let situacao: string
      if (objetivoConcluido(o, d.acoes)) situacao = 'Concluído'
      else if (minhas.length === 0) situacao = 'Sem ações no plano'
      else {
        const contagem = `${feitas} de ${minhas.length} ${minhas.length === 1 ? 'ação' : 'ações'}`
        situacao = o.prazo && daysUntil(o.prazo) < 0 ? `Atrasado · ${contagem}` : `Em andamento · ${contagem}`
      }
      add(
        `| ${cel(o.titulo)} | ${o.categoria === 'educacional' ? 'Educacional' : 'Funcional'} | ${o.prazo ? formatDateBr(o.prazo) : '—'} | ${situacao} |`,
      )
    }
    add('')
  }

  if (secoes.has('entregas')) {
    add('## Entregas', '')
    if (concluidas.length === 0) {
      add('{{Nenhuma ação do plano foi concluída no período. Liste aqui entregas que não estão no plano.}}', '')
    } else {
      const grupos = new Map<string, Acao[]>()
      for (const a of concluidas) {
        const k = a.objetivoId && objById.has(a.objetivoId) ? a.objetivoId : ''
        grupos.set(k, [...(grupos.get(k) ?? []), a])
      }
      for (const [k, acoes] of grupos) {
        const obj = k ? objById.get(k) : undefined
        add(`### ${obj ? obj.titulo : 'Outras entregas'}`, '')
        if (obj?.justificativa) add(`_Por que importa:_ ${obj.justificativa.trim().replace(/\n+/g, ' ')}`, '')
        for (const a of acoes.sort((x, y) => (x.concluidoEm ?? '').localeCompare(y.concluidoEm ?? ''))) {
          add(`- **${a.titulo}** (concluída em ${formatDateBr(a.concluidoEm ?? null)})`)
          const regs = diarioPorAcao.get(a.id) ?? []
          if (regs.length > 0) for (const e of regs) add(citarEntrada(e))
          else add('  - Impacto: {{o que mudou? métrica antes → depois, quem se beneficiou}}')
        }
        add('')
      }
    }
    if (semData.length > 0) {
      add(
        '_Concluídas sem data registrada (antes de o app guardar a data de conclusão):_ ' +
          semData.map((a) => a.titulo).join('; ') +
          '.',
        '',
      )
    }
  }

  if (secoes.has('aprendizado')) {
    add('## Aprendizado', '')
    if (trilhaPeriodo.length === 0) {
      add('{{Cursos, leituras e práticas do período, e o que você aplicou de cada um.}}', '')
    } else {
      add('| Item | Tipo | Concluído em |', '|---|---|---|')
      for (const t of trilhaPeriodo.sort((x, y) => (x.concluidoEm ?? '').localeCompare(y.concluidoEm ?? '')))
        add(
          `| ${t.recursoUrl ? `[${cel(t.titulo)}](${t.recursoUrl})` : cel(t.titulo)} | ${TIPO_TRILHA[t.tipo] ?? t.tipo} | ${formatDateBr(t.concluidoEm ?? null)} |`,
        )
      add('', '{{O que você aplicou no trabalho a partir disso?}}', '')
    }
    if (trilhaSemData.length > 0)
      add('_Também concluídos (sem data registrada):_ ' + trilhaSemData.map((t) => t.titulo).join('; ') + '.', '')
  }

  if (secoes.has('competencias') && d.avaliacoes.length > 0 && d.habilidades.length > 0) {
    const notas = new Map(d.avaliacoes.map((a) => [a.habilidadeId, a.nota]))
    const compNome = new Map(d.competencias.map((c) => [c.id, c.nome]))
    const porComp = (filtro: (n: number) => boolean) => {
      const m = new Map<string, string[]>()
      for (const h of d.habilidades) {
        const n = notas.get(h.id)
        if (!n || !filtro(n)) continue
        const c = compNome.get(h.competenciaId) ?? 'Outras'
        m.set(c, [...(m.get(c) ?? []), h.texto])
      }
      return m
    }
    const fortes = porComp((n) => n >= 3)
    const gaps = porComp((n) => n <= 2)
    add('## Competências', '', '_Segundo a auto-avaliação (escala 1 a 4) no nível atual._', '')
    if (fortes.size > 0) {
      add('**Pontos fortes (nota 3 ou 4):**', '')
      for (const [c, hs] of fortes) add(`- **${c}:** ${hs.slice(0, 3).join('; ')}${hs.length > 3 ? ` (+${hs.length - 3})` : ''}`)
      add('')
    }
    if (gaps.size > 0) {
      add('**Em desenvolvimento (nota 1 ou 2):**', '')
      for (const [c, hs] of gaps) add(`- **${c}:** ${hs.slice(0, 3).join('; ')}${hs.length > 3 ? ` (+${hs.length - 3})` : ''}`)
      add('')
    }
  }

  if (secoes.has('reconhecimentos')) {
    add('## Reconhecimentos e feedbacks', '')
    const feedbacks = diarioPeriodo.filter((e) => e.texto.trimStart().startsWith('>'))
    for (const e of feedbacks) add(e.texto.trim(), '', `_Registrado no diário em ${formatDateBr(e.data)}._`, '')
    if (feedbacks.length === 0) add('{{"Citação de um feedback recebido" — quem, contexto, data}}')
    if (conquistas.length > 0) add('', `**Conquistas no app:** ${conquistas.map((c) => c.titulo).join(', ')}.`)
    add('')
  }

  if (secoes.has('diario') && diarioPeriodo.length > 0) {
    add('## Registro do diário', '')
    for (const e of diarioPeriodo) add(citarEntrada(e, ''))
    add('')
  }

  if (secoes.has('proximos')) {
    add('## Próximos passos', '')
    const abertas = d.acoes
      .filter((a) => a.status !== 'concluido')
      .sort((x, y) => (x.dueDate ?? '9999').localeCompare(y.dueDate ?? '9999'))
      .slice(0, 5)
    const objsAbertos = d.objetivos.filter((o) => !objetivoConcluido(o, d.acoes))
    if (objsAbertos.length > 0) {
      add('**Objetivos em aberto:**', '')
      for (const o of objsAbertos)
        add(`- ${o.titulo}${o.prazo ? ` (prazo ${formatDateBr(o.prazo)}${daysUntil(o.prazo) <= 30 ? `, ${prazoTexto(daysUntil(o.prazo), o.prazo)}` : ''})` : ''}`)
      add('')
    }
    if (abertas.length > 0) {
      add('**Próximas ações:**', '')
      for (const a of abertas) add(`- ${a.titulo}${a.dueDate ? ` (até ${formatDateBr(a.dueDate)})` : ''}`)
      add('')
    }
    const restritivas = d.forcas
      .filter((f) => f.tipo === 'restritiva')
      .sort((x, y) => y.intensidade - x.intensidade)
      .slice(0, 4)
    add('**Onde preciso de apoio:**', '')
    if (restritivas.length > 0) for (const f of restritivas) add(`- ${f.descricao}`)
    else add('- {{O que o gestor ou o time pode fazer para você avançar?}}')
    add('')
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}
