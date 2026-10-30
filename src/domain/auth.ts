/** The signed-in account, as returned by `/api/auth/me`. */
export interface AuthUser {
  id: string
  email: string
  nome: string
  /** Admins can edit the shared catalog (/admin). */
  isAdmin: boolean
}

/** Repository methods that only read the catalog; everything else needs an admin. */
export const CATALOG_READ_METHODS = [
  'listAreas',
  'getArea',
  'listNiveis',
  'listCompetencias',
  'listMatriz',
  'listExpectativas',
  'listHabilidades',
  'listCertificacoes',
  'getCertificacao',
  'listTrilhaTemplates',
  'isEmpty',
  'counts',
] as const

export const CATALOG_WRITE_METHODS = [
  'upsertArea',
  'deleteArea',
  'upsertNivel',
  'deleteNivel',
  'upsertCompetencia',
  'deleteCompetencia',
  'upsertMatrizItem',
  'deleteMatrizItem',
  'upsertExpectativa',
  'upsertHabilidade',
  'deleteHabilidade',
  'upsertCertificacao',
  'deleteCertificacao',
  'upsertTrilhaTemplate',
  'deleteTrilhaTemplate',
] as const

export const PDI_METHODS = [
  'getPerfil',
  'savePerfil',
  'listHardSkills',
  'upsertHardSkill',
  'deleteHardSkill',
  'listSoftSkills',
  'upsertSoftSkill',
  'deleteSoftSkill',
  'listAvaliacoes',
  'setAvaliacao',
  'listObjetivos',
  'upsertObjetivo',
  'deleteObjetivo',
  'listAcoes',
  'upsertAcao',
  'updateAcaoStatus',
  'deleteAcao',
  'listForcas',
  'upsertForca',
  'deleteForca',
  'listTrilhaItens',
  'upsertTrilhaItem',
  'setTrilhaConcluido',
  'deleteTrilhaItem',
  'replaceTrilha',
  'listDiario',
  'addDiario',
  'deleteDiario',
  'listConquistas',
  'addConquista',
  'marcarConquistaVista',
  'listCiclos',
  'addCiclo',
  'deleteCiclo',
  'exportAll',
  'importAll',
] as const
