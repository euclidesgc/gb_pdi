/**
 * Catalog / reference domain — the curated data behind the PDI experience.
 * Managed through the /admin area; seeded on first run. Distinct from the
 * user's own PDI data (see domain/pdi.ts, added in a later phase).
 */

export type CompetenciaTipo = 'hard' | 'soft'

export type TrilhaTipo =
  | 'certificacao'
  | 'pratica'
  | 'portfolio'
  | 'leitura'
  | 'curso'
  | 'mentoria'
  | 'projeto'

export interface Area {
  id: string
  nome: string
  familia: string | null
  descricao: string | null
  ordem: number
}

export interface NivelCarreira {
  id: string
  nome: string
  ordem: number
  descricao: string | null
}

export interface Competencia {
  id: string
  nome: string
  tipo: CompetenciaTipo
  descricao: string | null
}

/** One expected-competency cell of the area × level matrix. */
export interface MatrizItem {
  id: string
  areaId: string
  nivelId: string
  competenciaId: string
  /** Expected level on a 0–5 scale; null when the source has no numeric target. */
  nivelEsperado: number | null
  /** What is expected of this competency at this level (the leveling-matrix cell text). */
  descricao: string | null
}

/**
 * One observable skill of a carreira × nível × competência cell — a single
 * bullet of the leveling matrix. The Matriz admin is a CRUD over these.
 */
export interface Habilidade {
  id: string
  areaId: string
  nivelId: string
  competenciaId: string
  texto: string
  ordem: number
}

/**
 * Self-assessment scale (1–4) the user picks per habilidade. The expected
 * baseline is "Faz bonito" (3); values 1–2 are gaps that feed the development
 * plan (see docs/plano-matriz-habilidades.md).
 */
export const ESCALA_AUTOAVALIACAO = [
  { valor: 1, label: 'Precisa agir' },
  { valor: 2, label: 'Pode mais' },
  { valor: 3, label: 'Faz bonito' },
  { valor: 4, label: 'Muda o jogo' },
] as const

/** Descriptive expectation for an (area, level) cell (the matrix has no numeric target). */
export interface MatrizExpectativa {
  areaId: string
  nivelId: string
  expectativa: string | null
}

export interface Certificacao {
  id: string
  nome: string
  provedor: string | null
  url: string | null
  gratuita: boolean
  descricao: string | null
  /** Category label from the source catalog (e.g. "Plataformas Brasileiras"). */
  categoria: string | null
  /** Free-text search terms used to match the credential to gaps. */
  keywords: string[]
  /** Competencies this credential helps develop. */
  competenciaIds: string[]
  /** Areas this credential is suggested for (empty = all). */
  areaIds: string[]
}

export interface TrilhaTemplate {
  id: string
  competenciaId: string | null
  areaId: string | null
  tipo: TrilhaTipo
  titulo: string
  descricao: string | null
  duracao: string | null
  recursoUrl: string | null
  /** Free-text search terms linking the template to skills/areas. */
  keywords: string[]
  /** Display label of the area from the source (not a normalized area id). */
  areaDisplay: string | null
}
