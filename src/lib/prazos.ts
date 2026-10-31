import type { Acao, DiarioEntry, Objetivo, TrilhaItem } from '@/domain/pdi'
import { daysUntil, formatDateBr } from '@/lib/pdiStats'

/**
 * Prazos e prioridades do PDI: junta os prazos de ações e objetivos em aberto,
 * classifica pela urgência e sugere qual é o próximo passo.
 */

export type Urgencia = 'atrasado' | 'hoje' | 'urgente' | 'semana' | 'proximo' | 'futuro'

/** atrasado < 0 · hoje = 0 · urgente 1–3 dias · semana 4–7 · próximo 8–30 · futuro > 30. */
export function urgenciaDe(dias: number): Urgencia {
  if (dias < 0) return 'atrasado'
  if (dias === 0) return 'hoje'
  if (dias <= 3) return 'urgente'
  if (dias <= 7) return 'semana'
  if (dias <= 30) return 'proximo'
  return 'futuro'
}

export const URGENCIA: Record<
  Urgencia,
  { label: string; grupo: string; badge: string; borda: string; dot: string }
> = {
  atrasado: {
    label: 'Atrasado',
    grupo: 'Atrasados',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    borda: 'border-l-rose-500',
    dot: 'bg-rose-500',
  },
  hoje: {
    label: 'Hoje',
    grupo: 'Vencem hoje',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
    borda: 'border-l-orange-500',
    dot: 'bg-orange-500',
  },
  urgente: {
    label: 'Urgente',
    grupo: 'Nos próximos 3 dias',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    borda: 'border-l-amber-500',
    dot: 'bg-amber-500',
  },
  semana: {
    label: 'Esta semana',
    grupo: 'Nesta semana',
    badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-300',
    borda: 'border-l-yellow-400',
    dot: 'bg-yellow-400',
  },
  proximo: {
    label: 'Próximo',
    grupo: 'Nos próximos 30 dias',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    borda: 'border-l-sky-400',
    dot: 'bg-sky-400',
  },
  futuro: {
    label: 'Mais adiante',
    grupo: 'Mais adiante',
    badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    borda: 'border-l-slate-300 dark:border-l-slate-600',
    dot: 'bg-slate-300 dark:bg-slate-600',
  },
}

export const URGENCIA_ORDEM: Urgencia[] = ['atrasado', 'hoje', 'urgente', 'semana', 'proximo', 'futuro']

/** "atrasado há 3 dias", "vence hoje", "amanhã", "em 5 dias" ou a data. */
export function prazoTexto(dias: number, data: string): string {
  if (dias < -1) return `atrasado há ${-dias} dias`
  if (dias === -1) return 'atrasado desde ontem'
  if (dias === 0) return 'vence hoje'
  if (dias === 1) return 'vence amanhã'
  if (dias <= 30) return `em ${dias} dias`
  return formatDateBr(data)
}

export interface PrazoItem {
  kind: 'acao' | 'objetivo'
  id: string
  titulo: string
  data: string
  dias: number
  urgencia: Urgencia
  /** Objetivo da ação, ou "n de m ações concluídas" de um objetivo. */
  contexto: string | null
  emAndamento: boolean
  /** Ação com prazo depois do prazo do objetivo. */
  depoisDoObjetivo: boolean
  to: string
}

/** Um objetivo está concluído quando tem ações e todas foram concluídas. */
export function objetivoConcluido(o: Objetivo, acoes: Acao[]): boolean {
  const minhas = acoes.filter((a) => a.objetivoId === o.id)
  return minhas.length > 0 && minhas.every((a) => a.status === 'concluido')
}

/** A ação vence depois do prazo do objetivo a que está ligada. */
export function acaoDepoisDoObjetivo(acao: Pick<Acao, 'dueDate'>, objetivo?: Objetivo | null): boolean {
  return Boolean(acao.dueDate && objetivo?.prazo && acao.dueDate > objetivo.prazo)
}

/** Prazos em aberto (ações não concluídas e objetivos não concluídos), do mais urgente ao mais distante. */
export function coletarPrazos(objetivos: Objetivo[], acoes: Acao[]): PrazoItem[] {
  const objById = new Map(objetivos.map((o) => [o.id, o]))
  const itens: PrazoItem[] = []
  for (const a of acoes) {
    if (!a.dueDate || a.status === 'concluido') continue
    const dias = daysUntil(a.dueDate)
    const obj = a.objetivoId ? objById.get(a.objetivoId) : undefined
    itens.push({
      kind: 'acao',
      id: a.id,
      titulo: a.titulo,
      data: a.dueDate,
      dias,
      urgencia: urgenciaDe(dias),
      contexto: obj?.titulo ?? null,
      emAndamento: a.status === 'em_andamento',
      depoisDoObjetivo: acaoDepoisDoObjetivo(a, obj),
      to: '/app/plano',
    })
  }
  for (const o of objetivos) {
    if (!o.prazo || objetivoConcluido(o, acoes)) continue
    const dias = daysUntil(o.prazo)
    const minhas = acoes.filter((a) => a.objetivoId === o.id)
    const feitas = minhas.filter((a) => a.status === 'concluido').length
    itens.push({
      kind: 'objetivo',
      id: o.id,
      titulo: o.titulo,
      data: o.prazo,
      dias,
      urgencia: urgenciaDe(dias),
      contexto:
        minhas.length === 0
          ? 'sem ações no plano'
          : `${feitas} de ${minhas.length} ${minhas.length === 1 ? 'ação concluída' : 'ações concluídas'}`,
      emAndamento: false,
      depoisDoObjetivo: false,
      to: '/app/objetivos',
    })
  }
  // Mesma data: o que já está em andamento primeiro, depois ações antes de objetivos.
  return itens.sort(
    (x, y) =>
      x.dias - y.dias ||
      Number(y.emAndamento) - Number(x.emAndamento) ||
      (x.kind === y.kind ? 0 : x.kind === 'acao' ? -1 : 1),
  )
}

export interface Atencao {
  id: string
  texto: string
  to: string
  /** 'alerta' pede ação; 'dica' é só uma sugestão. */
  nivel: 'alerta' | 'dica'
}

/** Inconsistências e lacunas do plano que valem um aviso discreto. */
export function pontosDeAtencao(objetivos: Objetivo[], acoes: Acao[]): Atencao[] {
  const out: Atencao[] = []
  const objById = new Map(objetivos.map((o) => [o.id, o]))
  for (const a of acoes) {
    if (a.status === 'concluido') continue
    const obj = a.objetivoId ? objById.get(a.objetivoId) : undefined
    if (obj && acaoDepoisDoObjetivo(a, obj)) {
      out.push({
        id: `fora:${a.id}`,
        texto: `"${a.titulo}" vence em ${formatDateBr(a.dueDate)}, depois do prazo do objetivo "${obj.titulo}" (${formatDateBr(obj.prazo)}).`,
        to: '/app/plano',
        nivel: 'alerta',
      })
    }
  }
  const semPrazo = acoes.filter((a) => a.status !== 'concluido' && !a.dueDate)
  if (semPrazo.length > 0) {
    out.push({
      id: 'sem-prazo',
      texto:
        semPrazo.length === 1
          ? `A ação "${semPrazo[0].titulo}" não tem prazo. Uma data ajuda a não deixar para depois.`
          : `${semPrazo.length} ações em aberto não têm prazo. Uma data ajuda a não deixar para depois.`,
      to: '/app/plano',
      nivel: 'dica',
    })
  }
  for (const o of objetivos) {
    if (!acoes.some((a) => a.objetivoId === o.id)) {
      out.push({
        id: `sem-acao:${o.id}`,
        texto: `O objetivo "${o.titulo}" ainda não tem ações no plano.`,
        to: '/app/plano',
        nivel: 'dica',
      })
    }
  }
  return out
}

export interface ProximoPasso {
  titulo: string
  descricao: string
  to: string
  cta: string
  urgencia: Urgencia | null
}

/**
 * A coisa mais importante a fazer agora: o prazo mais urgente; sem prazos, a
 * ação em andamento; sem ações, o passo que falta para o PDI andar.
 */
export function proximoPasso(input: {
  objetivos: Objetivo[]
  acoes: Acao[]
  trilha: TrilhaItem[]
  diario: DiarioEntry[]
  prazos: PrazoItem[]
}): ProximoPasso {
  const { objetivos, acoes, trilha, diario, prazos } = input
  const primeiro = prazos[0]
  if (primeiro && primeiro.dias <= 7) {
    return {
      titulo: primeiro.titulo,
      descricao:
        (primeiro.kind === 'objetivo' ? 'Objetivo' : 'Ação') +
        ` · ${prazoTexto(primeiro.dias, primeiro.data)}` +
        (primeiro.contexto ? ` · ${primeiro.contexto}` : ''),
      to: primeiro.to,
      cta: primeiro.kind === 'objetivo' ? 'Ver objetivo' : 'Abrir o plano',
      urgencia: primeiro.urgencia,
    }
  }
  if (objetivos.length === 0) {
    return {
      titulo: 'Defina seu primeiro objetivo',
      descricao: 'Um objetivo com prazo dá direção ao PDI. Comece por um que você queira atingir neste ciclo.',
      to: '/app/objetivos',
      cta: 'Criar objetivo',
      urgencia: null,
    }
  }
  const abertas = acoes.filter((a) => a.status !== 'concluido')
  if (abertas.length === 0) {
    return {
      titulo: 'Quebre seus objetivos em ações',
      descricao: 'Ações pequenas e com prazo transformam o objetivo em algo que dá para fazer nesta semana.',
      to: '/app/plano',
      cta: 'Planejar ações',
      urgencia: null,
    }
  }
  const andamento = abertas.find((a) => a.status === 'em_andamento')
  if (andamento) {
    return {
      titulo: andamento.titulo,
      descricao: 'Em andamento · continue de onde parou' + (primeiro ? ` · próximo prazo ${prazoTexto(primeiro.dias, primeiro.data)}` : ''),
      to: '/app/plano',
      cta: 'Abrir o plano',
      urgencia: primeiro ? primeiro.urgencia : null,
    }
  }
  if (primeiro) {
    return {
      titulo: primeiro.titulo,
      descricao: `Próximo prazo · ${prazoTexto(primeiro.dias, primeiro.data)}`,
      to: primeiro.to,
      cta: 'Abrir o plano',
      urgencia: primeiro.urgencia,
    }
  }
  const ultima = diario[0]?.data
  if (!ultima || daysUntil(ultima) <= -7) {
    return {
      titulo: 'Registre como foi sua semana',
      descricao: 'Uma nota curta no diário vira evidência para o feedback e para o brag document.',
      to: '/app/diario',
      cta: 'Escrever no diário',
      urgencia: null,
    }
  }
  const curso = trilha.find((t) => !t.concluido)
  return {
    titulo: curso ? curso.titulo : abertas[0].titulo,
    descricao: curso ? 'Próximo item da sua trilha' : 'Comece esta ação do plano',
    to: curso ? '/app/trilha' : '/app/plano',
    cta: curso ? 'Ver trilha' : 'Abrir o plano',
    urgencia: null,
  }
}
