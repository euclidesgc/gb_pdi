/**
 * Account role. `admin` can edit the shared catalog and manage users (/admin);
 * `user` only has their own PDI. More roles will come later.
 */
export type UserRole = 'user' | 'admin'

export const USER_ROLES: readonly UserRole[] = ['user', 'admin']

/** The signed-in account, as returned by `/api/auth/me`. */
export interface AuthUser {
  id: string
  email: string
  nome: string
  role: UserRole
  emailVerified: boolean
}

/** One row of the /admin user search. */
export interface AdminUserRow extends AuthUser {
  createdAt: string
  /** Listed in the server's ADMIN_EMAILS: always admin, role can't be changed here. */
  roleLocked: boolean
}

/** A personal access token (for AI agents over MCP). The secret is only shown once, on creation. */
export interface ApiToken {
  id: string
  nome: string
  /** First characters of the token, to tell tokens apart in the list. */
  prefixo: string
  createdAt: string
  lastUsedAt: string | null
}

export const isAdmin =(u: AuthUser | null | undefined): boolean => u?.role === 'admin'

/** Minimum password length, enforced by the API and hinted by the forms. */
export const SENHA_MIN = 8

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
