import type { PdiRepository } from '@/data/ports/PdiRepository'
import type { Conquista } from '@/domain/pdi'
import { newId } from '@/lib/id'
import { todayIso } from '@/lib/pdiStats'

/** Facts the gamification rules are evaluated against. */
export interface ConquistaContext {
  wizardConcluido: boolean
  objetivos: number
  skills: number
  acoesTotal: number
  acoesConcluidas: number
  trilhaConcluida: number
  diario: number
}

interface Regra {
  tipo: string
  titulo: string
  test: (c: ConquistaContext) => boolean
}

export const REGRAS: Regra[] = [
  { tipo: 'pdi_iniciado', titulo: 'PDI iniciado', test: (c) => c.wizardConcluido },
  { tipo: 'autoconhecimento', titulo: 'Autoconhecimento (5+ competências)', test: (c) => c.skills >= 5 },
  { tipo: 'primeiro_objetivo', titulo: 'Primeiro objetivo definido', test: (c) => c.objetivos >= 1 },
  { tipo: 'plano_em_acao', titulo: 'Plano em ação', test: (c) => c.acoesTotal >= 1 },
  { tipo: 'primeira_entrega', titulo: 'Primeira ação concluída', test: (c) => c.acoesConcluidas >= 1 },
  { tipo: 'cinco_entregas', titulo: '5 ações concluídas', test: (c) => c.acoesConcluidas >= 5 },
  { tipo: 'trilha_iniciada', titulo: 'Trilha em andamento', test: (c) => c.trilhaConcluida >= 1 },
  { tipo: 'reflexao', titulo: 'Primeira reflexão no diário', test: (c) => c.diario >= 1 },
]

/**
 * Awards any newly-earned achievements (idempotent per tipo). Returns the ones
 * just granted so the UI can celebrate them.
 */
export async function evaluateConquistas(
  pdi: PdiRepository,
  ctx: ConquistaContext,
): Promise<Conquista[]> {
  const existentes = await pdi.listConquistas()
  const have = new Set(existentes.map((c) => c.tipo))
  const novas: Conquista[] = []
  for (const r of REGRAS) {
    if (!have.has(r.tipo) && r.test(ctx)) {
      const c: Conquista = {
        id: newId(),
        tipo: r.tipo,
        titulo: r.titulo,
        data: todayIso(),
        vista: false,
      }
      await pdi.addConquista(c)
      novas.push(c)
    }
  }
  return novas
}
