/**
 * User PDI domain — the person's own plan, one per account.
 * Skills/objectives may reference catalog entries (competencia/area/nivel) but
 * always carry their own text so the PDI stands on its own.
 */

export type ObjetivoCategoria = 'educacional' | 'funcional'
export type AcaoStatus = 'pendente' | 'em_andamento' | 'concluido'
export type SoftAvaliacao = 'forte' | 'em_desenvolvimento' | 'nao_avaliada'
export type ForcaTipo = 'impulsora' | 'restritiva'

export interface Perfil {
  nome: string
  email: string | null
  proposito: string | null
  areaId: string | null
  nivelId: string | null
  wizardConcluido: boolean
  stepAtual: number
}

export interface UserHardSkill {
  id: string
  competenciaId: string | null
  nome: string
  nivelAtual: number
  nivelDesejado: number
}

export interface UserSoftSkill {
  id: string
  competenciaId: string | null
  nome: string
  avaliacao: SoftAvaliacao
}

/**
 * The user's self-assessment of one catalog habilidade, on the 1–4 scale
 * (ESCALA_AUTOAVALIACAO: 1 Precisa agir · 2 Pode mais · 3 Faz bonito · 4 Muda o
 * jogo). Notes 1–2 are gaps that feed the development plan.
 */
export interface UserAvaliacao {
  habilidadeId: string
  nota: number
}

export interface Objetivo {
  id: string
  titulo: string
  categoria: ObjetivoCategoria
  prazo: string | null
  justificativa: string | null
  ordem: number
}

export interface Acao {
  id: string
  objetivoId: string | null
  titulo: string
  categoria: ObjetivoCategoria
  prazo: string | null
  dueDate: string | null
  status: AcaoStatus
  detalhes: string | null
  ordem: number
}

export interface Forca {
  id: string
  objetivoId: string | null
  tipo: ForcaTipo
  descricao: string
  intensidade: number
}

export interface TrilhaItem {
  id: string
  templateId: string | null
  competenciaId: string | null
  tipo: string
  titulo: string
  descricao: string | null
  duracao: string | null
  recursoUrl: string | null
  concluido: boolean
}

export interface DiarioEntry {
  id: string
  data: string
  /** Entry body, written in Markdown. */
  texto: string
  objetivoId: string | null
  /** Plan items (habilidades) this entry is linked to (N:N). */
  habilidadeIds: string[]
}

export interface Conquista {
  id: string
  tipo: string
  titulo: string
  data: string
  vista: boolean
}

export interface Ciclo {
  id: string
  dataInicio: string
  dataFim: string | null
  scoreSaude: number | null
  snapshotJson: string | null
}

/** Full portable snapshot of the user's PDI (export / import, LGPD). */
export interface PdiExport {
  versao: number
  exportadoEm: string
  perfil: Perfil
  hardSkills: UserHardSkill[]
  softSkills: UserSoftSkill[]
  avaliacoes: UserAvaliacao[]
  objetivos: Objetivo[]
  acoes: Acao[]
  forcas: Forca[]
  trilhaItens: TrilhaItem[]
  diario: DiarioEntry[]
  conquistas: Conquista[]
  ciclos: Ciclo[]
}

export const PERFIL_PADRAO: Perfil = {
  nome: '',
  email: null,
  proposito: null,
  areaId: null,
  nivelId: null,
  wizardConcluido: false,
  stepAtual: 0,
}
