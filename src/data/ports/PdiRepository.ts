import type {
  Acao,
  AcaoStatus,
  Ciclo,
  Conquista,
  DiarioEntry,
  Forca,
  Objetivo,
  PdiExport,
  Perfil,
  TrilhaItem,
  UserAvaliacao,
  UserHardSkill,
  UserSoftSkill,
} from '@/domain/pdi'

/**
 * The signed-in user's own PDI. Feature screens depend only on this interface;
 * the client calls it over HTTP and the server scopes every call to the session's user.
 */
export interface PdiRepository {
  // Perfil (singleton)
  getPerfil(): Promise<Perfil>
  savePerfil(perfil: Perfil): Promise<void>

  // Inventário — hard skills
  listHardSkills(): Promise<UserHardSkill[]>
  upsertHardSkill(skill: UserHardSkill): Promise<void>
  deleteHardSkill(id: string): Promise<void>

  // Inventário — soft skills
  listSoftSkills(): Promise<UserSoftSkill[]>
  upsertSoftSkill(skill: UserSoftSkill): Promise<void>
  deleteSoftSkill(id: string): Promise<void>

  // Auto-avaliação de habilidades (nota 1–4; 0 limpa a avaliação)
  listAvaliacoes(): Promise<UserAvaliacao[]>
  setAvaliacao(habilidadeId: string, nota: number): Promise<void>

  // Objetivos
  listObjetivos(): Promise<Objetivo[]>
  upsertObjetivo(obj: Objetivo): Promise<void>
  deleteObjetivo(id: string): Promise<void>

  // Plano de ação
  listAcoes(objetivoId?: string): Promise<Acao[]>
  upsertAcao(acao: Acao): Promise<void>
  updateAcaoStatus(id: string, status: AcaoStatus): Promise<void>
  deleteAcao(id: string): Promise<void>

  // Campo de forças
  listForcas(objetivoId?: string): Promise<Forca[]>
  upsertForca(forca: Forca): Promise<void>
  deleteForca(id: string): Promise<void>

  // Trilha do usuário
  listTrilhaItens(): Promise<TrilhaItem[]>
  upsertTrilhaItem(item: TrilhaItem): Promise<void>
  setTrilhaConcluido(id: string, concluido: boolean): Promise<void>
  deleteTrilhaItem(id: string): Promise<void>
  replaceTrilha(itens: TrilhaItem[]): Promise<void>

  // Diário
  listDiario(): Promise<DiarioEntry[]>
  addDiario(entry: DiarioEntry): Promise<void>
  deleteDiario(id: string): Promise<void>

  // Conquistas
  listConquistas(): Promise<Conquista[]>
  addConquista(c: Conquista): Promise<void>
  marcarConquistaVista(id: string): Promise<void>

  // Histórico de ciclos
  listCiclos(): Promise<Ciclo[]>
  addCiclo(ciclo: Ciclo): Promise<void>
  deleteCiclo(id: string): Promise<void>

  // Portabilidade (LGPD) — exporta/importa todo o PDI do usuário
  exportAll(): Promise<PdiExport>
  importAll(data: PdiExport): Promise<void>
}
