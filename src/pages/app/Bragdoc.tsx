import { useEffect, useMemo, useState } from 'react'
import { Check, Copy, Download, Medal, Printer, RefreshCw } from 'lucide-react'
import { Button, Card, TextInput } from '@/components/ui/controls'
import { Dica } from '@/components/ui/Dica'
import { MarkdownEditor } from '@/components/ui/MarkdownEditor'
import { useCatalogRepository, usePdiRepository } from '@/data/repositories'
import {
  gerarBragdoc,
  periodoDoPreset,
  PRESETS,
  SECOES_BRAG,
  type DadosBrag,
  type Periodo,
  type PresetPeriodo,
  type SecaoBrag,
} from '@/lib/bragdoc'
import { cn } from '@/lib/cn'
import { renderMarkdown } from '@/lib/markdown'

/** Rascunho editado fica no navegador para não se perder ao trocar de tela. */
const RASCUNHO_KEY = 'gbpdi:bragdoc-rascunho'

function lerRascunho(): string | null {
  try {
    return localStorage.getItem(RASCUNHO_KEY)
  } catch {
    return null
  }
}
function salvarRascunho(v: string | null) {
  try {
    if (v === null) localStorage.removeItem(RASCUNHO_KEY)
    else localStorage.setItem(RASCUNHO_KEY, v)
  } catch {
    // Sem armazenamento local: o rascunho vale só nesta visita.
  }
}

/** Destaca os marcadores {{…}} que a pessoa ainda precisa completar. */
function renderComMarcadores(md: string): string {
  return renderMarkdown(md).replace(
    /\{\{([^}]*)\}\}/g,
    '<mark class="rounded bg-amber-100 px-1 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">$1</mark>',
  )
}

export function Bragdoc() {
  const pdi = usePdiRepository()
  const catalog = useCatalogRepository()
  const [dados, setDados] = useState<DadosBrag | null>(null)
  const [preset, setPreset] = useState<PresetPeriodo | 'custom'>('semestre')
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoDoPreset('semestre'))
  const [secoes, setSecoes] = useState<Set<SecaoBrag>>(
    () => new Set(SECOES_BRAG.filter((s) => s.padrao).map((s) => s.id)),
  )
  const [texto, setTexto] = useState<string>(() => lerRascunho() ?? '')
  const [editado, setEditado] = useState<boolean>(() => lerRascunho() !== null)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    void (async () => {
      const perfil = await pdi.getPerfil()
      const [objetivos, acoes, trilha, diario, conquistas, forcas, avaliacoes, areas, niveis, competencias] =
        await Promise.all([
          pdi.listObjetivos(),
          pdi.listAcoes(),
          pdi.listTrilhaItens(),
          pdi.listDiario(),
          pdi.listConquistas(),
          pdi.listForcas(),
          pdi.listAvaliacoes(),
          catalog.listAreas(),
          catalog.listNiveis(),
          catalog.listCompetencias(),
        ])
      const habilidades =
        perfil.areaId && perfil.nivelId
          ? await catalog.listHabilidades({ areaId: perfil.areaId, nivelId: perfil.nivelId })
          : []
      setDados({
        perfil,
        areaNome: areas.find((a) => a.id === perfil.areaId)?.nome ?? null,
        nivelNome: niveis.find((n) => n.id === perfil.nivelId)?.nome ?? null,
        objetivos,
        acoes,
        trilha,
        diario,
        conquistas,
        forcas,
        avaliacoes,
        habilidades,
        competencias,
      })
    })()
  }, [pdi, catalog])

  const gerado = useMemo(
    () => (dados ? gerarBragdoc(dados, periodo, secoes) : ''),
    [dados, periodo, secoes],
  )

  // Enquanto a pessoa não editar, o texto acompanha o período e as seções.
  const atual = editado ? texto : gerado

  const regerar = () => {
    if (editado && !window.confirm('Gerar de novo descarta as suas edições. Continuar?')) return
    setEditado(false)
    setTexto('')
    salvarRascunho(null)
  }
  const editar = (v: string) => {
    setTexto(v)
    setEditado(true)
    salvarRascunho(v)
  }
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(atual)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      window.alert('Não foi possível copiar. Selecione o texto e copie manualmente.')
    }
  }
  const baixar = () => {
    const blob = new Blob([atual], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `brag-document-${periodo.inicio}_a_${periodo.fim}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const escolherPreset = (p: PresetPeriodo) => {
    setPreset(p)
    setPeriodo(periodoDoPreset(p))
  }
  const toggleSecao = (id: SecaoBrag) =>
    setSecoes((cur) => {
      const n = new Set(cur)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  if (!dados) {
    return <p className="text-center text-sm text-slate-400">Carregando brag document…</p>
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="print:hidden">
        <div className="flex items-center gap-2">
          <Medal className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Brag document</h1>
        </div>
        <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
          O registro do que você entregou e aprendeu, com foco no impacto. Use antes da avaliação,
          do 1:1 com o gestor ou de um pedido de promoção. O documento sai das ações concluídas, da
          trilha, do diário, da auto-avaliação e das conquistas do período.
        </p>

        <Card className="mt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Período</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => escolherPreset(p.id)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                      preset === p.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <TextInput
                  type="date"
                  value={periodo.inicio}
                  max={periodo.fim}
                  onChange={(e) => {
                    setPreset('custom')
                    setPeriodo((p) => ({ ...p, inicio: e.target.value || p.inicio }))
                  }}
                  aria-label="Início do período"
                  className="w-auto py-1 text-xs"
                />
                até
                <TextInput
                  type="date"
                  value={periodo.fim}
                  min={periodo.inicio}
                  onChange={(e) => {
                    setPreset('custom')
                    setPeriodo((p) => ({ ...p, fim: e.target.value || p.fim }))
                  }}
                  aria-label="Fim do período"
                  className="w-auto py-1 text-xs"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={copiar}>
                {copiado ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                {copiado ? 'Copiado' : 'Copiar Markdown'}
              </Button>
              <Button onClick={baixar}>
                <Download className="h-4 w-4" />
                Baixar .md
              </Button>
              <Button variant="primary" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                Imprimir / PDF
              </Button>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            <p className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Seções</p>
            <div className="flex flex-wrap gap-1.5">
              {SECOES_BRAG.map((s) => {
                const on = secoes.has(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggleSecao(s.id)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors',
                      on
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                        : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400',
                    )}
                  >
                    {on && <Check className="h-3 w-3" />}
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>
        </Card>

        {editado && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            <span>
              Você editou o texto: mudar o período ou as seções não altera mais o documento.
            </span>
            <button type="button" onClick={regerar} className="inline-flex items-center gap-1 font-semibold underline">
              <RefreshCw className="h-3.5 w-3.5" />
              Gerar de novo
            </button>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Editar</h2>
            <MarkdownEditor value={atual} onChange={editar} minRows={24} ariaLabel="Texto do brag document" />
            <div className="mt-3">
              <Dica>
                Complete os trechos destacados em amarelo. Comece cada item pelo resultado, use
                números com linha de base (&quot;de 800 ms para 200 ms&quot;) e deixe claro o seu papel
                quando o trabalho foi em equipe. Não invente métricas: se não tiver o número, descreva
                o efeito.
              </Dica>
            </div>
          </div>
          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Prévia</h2>
            <Card className="max-h-[75vh] overflow-y-auto">
              <article
                className="markdown text-sm text-slate-700 dark:text-slate-200"
                dangerouslySetInnerHTML={{ __html: renderComMarcadores(atual) }}
              />
            </Card>
          </div>
        </div>
      </div>

      {/* Versão de impressão: só o documento. */}
      <article
        className="markdown print-area hidden text-sm text-black print:block"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(atual) }}
      />
    </div>
  )
}
