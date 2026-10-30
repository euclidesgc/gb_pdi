import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react'
import {
  Button,
  Card,
  Field,
  Select,
  SelectItem,
  SELECT_NONE,
  TextArea,
  TextInput,
} from '@/components/ui/controls'
import { HabilidadesRating, type AutoProgress } from '@/components/app/HabilidadesRating'
import { useCatalogRepository, usePdiRepository } from '@/data/repositories'
import type { Area, NivelCarreira } from '@/domain/catalog'
import type { Perfil } from '@/domain/pdi'
import { PERFIL_PADRAO } from '@/domain/pdi'

const STEPS = ['Perfil', 'Auto-avaliação', 'Conclusão']

export function Wizard() {
  const pdi = usePdiRepository()
  const catalog = useCatalogRepository()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(0)
  const [perfil, setPerfil] = useState<Perfil>(PERFIL_PADRAO)
  const [areas, setAreas] = useState<Area[]>([])
  const [niveis, setNiveis] = useState<NivelCarreira[]>([])
  const [progress, setProgress] = useState<AutoProgress>({ total: 0, avaliadas: 0, gaps: 0 })

  useEffect(() => {
    void (async () => {
      const [p, a, n] = await Promise.all([
        pdi.getPerfil(),
        catalog.listAreas(),
        catalog.listNiveis(),
      ])
      setPerfil(p)
      setStep(Math.min(p.stepAtual ?? 0, STEPS.length - 1))
      setAreas(a)
      setNiveis(n)
      setLoading(false)
    })()
  }, [pdi, catalog])

  const goTo = async (next: number) => {
    const clamped = Math.max(0, Math.min(next, STEPS.length - 1))
    const updated = { ...perfil, stepAtual: clamped }
    setPerfil(updated)
    setStep(clamped)
    await pdi.savePerfil(updated)
  }

  const finish = async () => {
    await pdi.savePerfil({ ...perfil, wizardConcluido: true, stepAtual: STEPS.length - 1 })
    navigate('/app')
  }

  if (loading) {
    return <p className="text-center text-sm text-slate-400">Carregando…</p>
  }

  const perfilOk = perfil.nome.trim().length > 0 && !!perfil.areaId && !!perfil.nivelId

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
        <Sparkles className="h-5 w-5" />
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Monte seu PDI</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Alguns passos rápidos. Tudo fica salvo na sua conta.
      </p>

      {/* progress */}
      <div className="mt-6 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 flex-col gap-1.5">
            <div
              className={
                'h-1.5 rounded-full ' +
                (i <= step ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700')
              }
            />
            <span
              className={
                'text-[11px] font-medium ' +
                (i === step
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 dark:text-slate-500')
              }
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <Card className="mt-5 space-y-4">
          <Field label="Nome">
            <TextInput
              value={perfil.nome}
              onChange={(e) => setPerfil((p) => ({ ...p, nome: e.target.value }))}
              placeholder="Como quer ser chamado(a)?"
            />
          </Field>
          <Field label="E-mail (opcional)">
            <TextInput
              type="email"
              value={perfil.email ?? ''}
              onChange={(e) => setPerfil((p) => ({ ...p, email: e.target.value || null }))}
              placeholder="voce@email.com"
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Carreira">
              <Select
                value={perfil.areaId || SELECT_NONE}
                onValueChange={(v) =>
                  setPerfil((p) => ({ ...p, areaId: v === SELECT_NONE ? null : v }))
                }
              >
                <SelectItem value={SELECT_NONE}>—</SelectItem>
                {areas.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nome}
                  </SelectItem>
                ))}
              </Select>
            </Field>
            <Field label="Nível de carreira">
              <Select
                value={perfil.nivelId || SELECT_NONE}
                onValueChange={(v) =>
                  setPerfil((p) => ({ ...p, nivelId: v === SELECT_NONE ? null : v }))
                }
              >
                <SelectItem value={SELECT_NONE}>—</SelectItem>
                {niveis.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.nome}
                  </SelectItem>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Propósito / causa (opcional)">
            <TextArea
              value={perfil.proposito ?? ''}
              onChange={(e) => setPerfil((p) => ({ ...p, proposito: e.target.value || null }))}
              placeholder="O que move o seu desenvolvimento?"
            />
          </Field>
          {perfil.nome.trim().length > 0 && !perfilOk && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Escolha carreira e nível para montar sua auto-avaliação.
            </p>
          )}
        </Card>
      )}

      {step === 1 && (
        <div className="mt-5 space-y-4">
          <Card>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Auto-avaliação
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Para cada habilidade esperada no seu nível, diga como você se enxerga. As que
              ficarem em <strong>Precisa agir</strong> ou <strong>Pode mais</strong> entram no seu
              plano de desenvolvimento. Você pode revisar depois.
            </p>
          </Card>
          {perfil.areaId && perfil.nivelId ? (
            <HabilidadesRating
              areaId={perfil.areaId}
              nivelId={perfil.nivelId}
              onProgress={setProgress}
            />
          ) : (
            <Card className="text-center text-sm text-slate-500 dark:text-slate-400">
              Volte ao passo anterior e escolha carreira e nível.
            </Card>
          )}
        </div>
      )}

      {step === 2 && (
        <Card className="mt-5 space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
            <Check className="h-7 w-7" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Tudo pronto, {perfil.nome || 'por aqui'}!
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {progress.avaliadas} de {progress.total} habilidades avaliadas
              {progress.gaps > 0 ? ` · ${progress.gaps} no seu plano de desenvolvimento` : ''}.
              Agora é definir objetivos e montar seu plano de ação.
            </p>
          </div>
        </Card>
      )}

      {/* nav */}
      <div className="mt-4 flex items-center justify-between">
        <Button variant="ghost" onClick={() => goTo(step - 1)} disabled={step === 0}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            variant="primary"
            onClick={() => goTo(step + 1)}
            disabled={step === 0 && !perfilOk}
          >
            Continuar
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="primary" onClick={finish}>
            Concluir e salvar
            <Check className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
