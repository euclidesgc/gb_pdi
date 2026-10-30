import type {
  Area,
  Certificacao,
  Competencia,
  Habilidade,
  MatrizExpectativa,
  MatrizItem,
  NivelCarreira,
  TrilhaTemplate,
} from '@/domain/catalog'

/** Bulk payload used to seed (or import) the whole catalog at once. */
export interface CatalogSeedData {
  areas: Area[]
  niveis: NivelCarreira[]
  competencias: Competencia[]
  matriz: MatrizItem[]
  expectativas: MatrizExpectativa[]
  habilidades: Habilidade[]
  certificacoes: Certificacao[]
  trilhaTemplates: TrilhaTemplate[]
}

export interface CatalogCounts {
  areas: number
  niveis: number
  competencias: number
  matriz: number
  habilidades: number
  certificacoes: number
  trilhaTemplates: number
}

/**
 * Reference-data repository. The /admin screens depend only on this interface.
 * Swapping SQLite for a remote API later means a new implementation here.
 */
export interface CatalogRepository {
  // Áreas
  listAreas(): Promise<Area[]>
  getArea(id: string): Promise<Area | undefined>
  upsertArea(area: Area): Promise<void>
  deleteArea(id: string): Promise<void>

  // Níveis de carreira
  listNiveis(): Promise<NivelCarreira[]>
  upsertNivel(nivel: NivelCarreira): Promise<void>
  deleteNivel(id: string): Promise<void>

  // Competências
  listCompetencias(): Promise<Competencia[]>
  upsertCompetencia(comp: Competencia): Promise<void>
  deleteCompetencia(id: string): Promise<void>

  // Matriz de competências (área × nível × competência)
  listMatriz(filter?: { areaId?: string; nivelId?: string }): Promise<MatrizItem[]>
  upsertMatrizItem(item: MatrizItem): Promise<void>
  deleteMatrizItem(id: string): Promise<void>

  // Expectativa descritiva por célula (área × nível)
  listExpectativas(filter?: {
    areaId?: string
    nivelId?: string
  }): Promise<MatrizExpectativa[]>
  upsertExpectativa(item: MatrizExpectativa): Promise<void>

  // Habilidades (carreira × nível × competência)
  listHabilidades(filter?: {
    areaId?: string
    nivelId?: string
    competenciaId?: string
  }): Promise<Habilidade[]>
  upsertHabilidade(h: Habilidade): Promise<void>
  deleteHabilidade(id: string): Promise<void>

  // Certificações
  listCertificacoes(): Promise<Certificacao[]>
  getCertificacao(id: string): Promise<Certificacao | undefined>
  upsertCertificacao(cert: Certificacao): Promise<void>
  deleteCertificacao(id: string): Promise<void>

  // Templates de trilha
  listTrilhaTemplates(filter?: {
    competenciaId?: string
    areaId?: string
  }): Promise<TrilhaTemplate[]>
  upsertTrilhaTemplate(tpl: TrilhaTemplate): Promise<void>
  deleteTrilhaTemplate(id: string): Promise<void>

  // Seed / bulk
  isEmpty(): Promise<boolean>
  counts(): Promise<CatalogCounts>
  /** Replaces the entire catalog with the provided data (used for seeding/import). */
  replaceAll(data: CatalogSeedData): Promise<void>
}
