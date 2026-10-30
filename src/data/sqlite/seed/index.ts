import type { CatalogSeedData } from '@/data/ports/CatalogRepository'
import type {
  Area,
  Certificacao,
  Competencia,
  Habilidade,
  MatrizExpectativa,
  MatrizItem,
  NivelCarreira,
  TrilhaTemplate,
  TrilhaTipo,
} from '@/domain/catalog'
import { slugify } from '@/lib/id'

// Raw catalog extracted from the original app bundle. Loaded as separate assets
// (via ?url + fetch) so these ~900 KB of JSON stay out of the main bundle and
// out of the TypeScript type-checker; they are fetched only when seeding.
import areasUrl from './raw/areas.json?url'
import niveisUrl from './raw/niveis.json?url'
import competenciasUrl from './raw/competencias.json?url'
import matrizUrl from './raw/matriz.json?url'
import certificacoesUrl from './raw/certificacoes.json?url'
import trilhaUrl from './raw/trilha_templates.json?url'

interface RawArea {
  key: string
  nome: string | null
  nome_limpo: string | null
  emoji: string | null
  familia: string | null
}
interface RawNivel {
  key: string
  nome: string
  ordem: number
  descricao: string | null
}
interface RawComp {
  slug: string
  nome: string
  tipo: 'hard' | 'soft'
  descricao: string | null
}
interface RawMatriz {
  area_key: string
  nivel_key: string
  competencia_slug: string
  nivel_esperado: number | null
  /** What is expected of this competency at this level (leveling-matrix cell). */
  descricao: string | null
}
interface RawCert {
  nome: string
  provedor: string | null
  url: string | null
  gratuita: boolean
  categoria: string | null
  areas: string[]
  keywords: string[]
  competencias: string[]
}
interface RawTrilha {
  tipo: string
  titulo: string
  descricao: string | null
  duracao: string | null
  recurso_url: string | null
  area_display: string | null
  keywords: string[]
  competencia_slug: string | null
}

const TRILHA_TIPOS: readonly TrilhaTipo[] = [
  'certificacao',
  'pratica',
  'portfolio',
  'leitura',
  'curso',
  'mentoria',
  'projeto',
]

function asTipo(v: string): TrilhaTipo {
  return (TRILHA_TIPOS as readonly string[]).includes(v) ? (v as TrilhaTipo) : 'curso'
}

/**
 * Split a leveling-matrix cell's descrição into individual habilidades (one per
 * bullet). Strips the leading bullet marker and drops an OCR/AI artifact that
 * leaked into one source cell.
 */
function splitHabilidades(descricao: string | null): string[] {
  if (!descricao) return []
  return descricao
    .split('\n')
    .map((l) => l.replace(/^[\s•*\-–]+/, '').trim())
    .filter((l) => l.length > 0)
    .filter((l) => !/texto extra[ií]do da imagem/i.test(l) && !/^Com certeza\b/i.test(l))
}

/** Title-case a snake/kebab key as a fallback label for unlabeled areas. */
function prettify(key: string): string {
  return key
    .split(/[_-]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

async function loadJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Falha ao carregar seed: ${url} (${res.status})`)
  return (await res.json()) as T
}

/** Build the catalog seed from the extracted original-app data. */
export async function buildCatalogSeed(): Promise<CatalogSeedData> {
  const [areasRaw, niveisRaw, compRaw, matrizRaw, certRaw, trilhaRaw] = await Promise.all([
    loadJson<RawArea[]>(areasUrl),
    loadJson<RawNivel[]>(niveisUrl),
    loadJson<RawComp[]>(competenciasUrl),
    loadJson<RawMatriz[]>(matrizUrl),
    loadJson<RawCert[]>(certificacoesUrl),
    loadJson<RawTrilha[]>(trilhaUrl),
  ])

  const areas: Area[] = areasRaw.map((a, i) => ({
    id: a.key,
    nome: a.nome_limpo ?? prettify(a.key),
    familia: a.familia,
    descricao: null,
    ordem: i + 1,
  }))

  const niveis: NivelCarreira[] = niveisRaw.map((n) => ({
    id: n.key,
    nome: n.nome,
    ordem: n.ordem,
    descricao: n.descricao,
  }))

  const competencias: Competencia[] = compRaw.map((c) => ({
    id: c.slug,
    nome: c.nome,
    tipo: c.tipo,
    descricao: c.descricao,
  }))

  // Reference sets to drop orphan FKs so the seed transaction never fails.
  const areaSet = new Set(areas.map((a) => a.id))
  const nivelSet = new Set(niveis.map((n) => n.id))
  const compSet = new Set(competencias.map((c) => c.id))

  const matriz: MatrizItem[] = matrizRaw
    .filter(
      (m) =>
        areaSet.has(m.area_key) &&
        nivelSet.has(m.nivel_key) &&
        compSet.has(m.competencia_slug),
    )
    .map((m) => ({
      id: `${m.area_key}:${m.nivel_key}:${m.competencia_slug}`,
      areaId: m.area_key,
      nivelId: m.nivel_key,
      competenciaId: m.competencia_slug,
      nivelEsperado: m.nivel_esperado,
      descricao: m.descricao,
    }))

  // Each bullet of a cell's descrição is one habilidade (carreira × nível × competência).
  const habilidades: Habilidade[] = []
  for (const m of matrizRaw) {
    if (
      !areaSet.has(m.area_key) ||
      !nivelSet.has(m.nivel_key) ||
      !compSet.has(m.competencia_slug)
    ) {
      continue
    }
    splitHabilidades(m.descricao).forEach((texto, i) => {
      habilidades.push({
        id: `${m.area_key}:${m.nivel_key}:${m.competencia_slug}:${i}`,
        areaId: m.area_key,
        nivelId: m.nivel_key,
        competenciaId: m.competencia_slug,
        texto,
        ordem: i,
      })
    })
  }

  // General per-level expectation (área × nível) comes from the level summary.
  const expectativas: MatrizExpectativa[] = []
  for (const a of areas) {
    for (const n of niveis) {
      if (n.descricao) {
        expectativas.push({ areaId: a.id, nivelId: n.id, expectativa: n.descricao })
      }
    }
  }

  const certSeen = new Set<string>()
  const certificacoes: Certificacao[] = certRaw.map((c) => {
    let id = slugify(c.nome)
    while (certSeen.has(id)) id = `${id}-x`
    certSeen.add(id)
    return {
      id,
      nome: c.nome,
      provedor: c.provedor,
      url: c.url,
      gratuita: c.gratuita,
      descricao: null,
      categoria: c.categoria,
      keywords: c.keywords ?? [],
      competenciaIds: (c.competencias ?? []).filter((s) => compSet.has(s)),
      areaIds: (c.areas ?? []).filter((a) => areaSet.has(a)),
    }
  })

  const trilhaTemplates: TrilhaTemplate[] = trilhaRaw.map((t, i) => ({
    id: `tpl-${i}`,
    competenciaId: t.competencia_slug && compSet.has(t.competencia_slug) ? t.competencia_slug : null,
    areaId: null,
    tipo: asTipo(t.tipo),
    titulo: t.titulo,
    descricao: t.descricao,
    duracao: t.duracao,
    recursoUrl: t.recurso_url,
    keywords: t.keywords ?? [],
    areaDisplay: t.area_display,
  }))

  return {
    areas,
    niveis,
    competencias,
    matriz,
    expectativas,
    habilidades,
    certificacoes,
    trilhaTemplates,
  }
}
