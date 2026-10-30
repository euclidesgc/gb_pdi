import type { Acao, TrilhaItem, UserHardSkill, UserSoftSkill } from '@/domain/pdi'

export interface PdiSnapshot {
  objetivos: number
  acoesTotal: number
  acoesConcluidas: number
  acoesEmAndamento: number
  trilhaTotal: number
  trilhaConcluida: number
  /** 0..1 — how close current levels are to the desired ones. */
  hardProgresso: number
  hardTotal: number
  softFortes: number
  softTotal: number
  /** Auto-avaliação (modelo de habilidades). */
  autoTotal: number
  autoAvaliadas: number
  autoAtende: number
  autoGaps: number
  /** 0..100 composite health score. */
  saude: number
}

export function computeSnapshot(input: {
  objetivos: number
  acoes: Acao[]
  trilha: TrilhaItem[]
  hard: UserHardSkill[]
  soft: UserSoftSkill[]
  /** Habilidades do nível e a auto-avaliação (atende = nota ≥ 3). */
  autoavaliacao?: { total: number; avaliadas: number; atende: number }
}): PdiSnapshot {
  const { objetivos, acoes, trilha, hard, soft } = input
  const auto = input.autoavaliacao ?? { total: 0, avaliadas: 0, atende: 0 }

  const acoesConcluidas = acoes.filter((a) => a.status === 'concluido').length
  const acoesEmAndamento = acoes.filter((a) => a.status === 'em_andamento').length
  const trilhaConcluida = trilha.filter((t) => t.concluido).length

  const comDesejo = hard.filter((h) => h.nivelDesejado > 0)
  const hardProgresso =
    comDesejo.length === 0
      ? 0
      : comDesejo.reduce((s, h) => s + Math.min(h.nivelAtual / h.nivelDesejado, 1), 0) /
        comDesejo.length

  const softFortes = soft.filter((s) => s.avaliacao === 'forte').length

  // Composite: average of whichever dimensions have data.
  const partes: number[] = []
  if (acoes.length > 0) partes.push(acoesConcluidas / acoes.length)
  if (trilha.length > 0) partes.push(trilhaConcluida / trilha.length)
  if (comDesejo.length > 0) partes.push(hardProgresso)
  if (soft.length > 0) partes.push(softFortes / soft.length)
  if (auto.total > 0) partes.push(auto.atende / auto.total)
  const saude =
    partes.length === 0 ? 0 : Math.round((partes.reduce((a, b) => a + b, 0) / partes.length) * 100)

  return {
    objetivos,
    acoesTotal: acoes.length,
    acoesConcluidas,
    acoesEmAndamento,
    trilhaTotal: trilha.length,
    trilhaConcluida,
    hardProgresso,
    hardTotal: hard.length,
    softFortes,
    softTotal: soft.length,
    autoTotal: auto.total,
    autoAvaliadas: auto.avaliadas,
    autoAtende: auto.atende,
    autoGaps: Math.max(0, auto.avaliadas - auto.atende),
    saude,
  }
}

export function saudeLabel(saude: number): { label: string; tone: string } {
  if (saude >= 75) return { label: 'Ótimo ritmo', tone: 'text-emerald-600 dark:text-emerald-400' }
  if (saude >= 45) return { label: 'Evoluindo', tone: 'text-amber-600 dark:text-amber-400' }
  if (saude > 0) return { label: 'Começando', tone: 'text-sky-600 dark:text-sky-400' }
  return { label: 'Sem dados ainda', tone: 'text-slate-500 dark:text-slate-400' }
}

/** ISO date (yyyy-mm-dd) for today, local time. */
export function todayIso(): string {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

export function formatDateBr(iso: string | null): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

/** Days from today to `iso` (negative = overdue). */
export function daysUntil(iso: string): number {
  const today = new Date(todayIso() + 'T00:00:00')
  const target = new Date(iso + 'T00:00:00')
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}
