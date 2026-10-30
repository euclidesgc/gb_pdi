import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, Download, Upload } from 'lucide-react'
import { Button, Card, Field, Select, SelectItem, SELECT_NONE, TextArea, TextInput } from '@/components/ui/controls'
import { useCatalogRepository, usePdiRepository } from '@/data/repositories'
import type { Area, NivelCarreira } from '@/domain/catalog'
import type { PdiExport, Perfil as PerfilModel } from '@/domain/pdi'
import { PERFIL_PADRAO } from '@/domain/pdi'

export function Perfil() {
  const pdi = usePdiRepository()
  const catalog = useCatalogRepository()
  const [perfil, setPerfil] = useState<PerfilModel>(PERFIL_PADRAO)
  const [areas, setAreas] = useState<Area[]>([])
  const [niveis, setNiveis] = useState<NivelCarreira[]>([])
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [dataMsg, setDataMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void (async () => {
      const [p, a, n] = await Promise.all([
        pdi.getPerfil(),
        catalog.listAreas(),
        catalog.listNiveis(),
      ])
      setPerfil(p)
      setAreas(a)
      setNiveis(n)
      setLoading(false)
    })()
  }, [pdi, catalog])

  const update = (patch: Partial<PerfilModel>) => {
    setPerfil((cur) => ({ ...cur, ...patch }))
    setSaved(false)
  }

  const save = async () => {
    await pdi.savePerfil(perfil)
    setSaved(true)
  }

  const exportar = async () => {
    try {
      const data = await pdi.exportAll()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `meu-pdi-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setDataMsg({ tone: 'ok', text: 'Backup exportado.' })
    } catch {
      setDataMsg({ tone: 'err', text: 'Não foi possível exportar.' })
    }
  }

  const onImportFile = async (file: File) => {
    try {
      const text = await file.text()
      const data = JSON.parse(text) as PdiExport
      if (!data || typeof data !== 'object' || !('perfil' in data)) {
        throw new Error('formato inválido')
      }
      const ok = window.confirm(
        'Importar vai SUBSTITUIR todos os dados atuais do seu PDI por este arquivo. Continuar?',
      )
      if (!ok) return
      await pdi.importAll(data)
      const p = await pdi.getPerfil()
      setPerfil(p)
      setDataMsg({ tone: 'ok', text: 'Dados importados com sucesso.' })
    } catch {
      setDataMsg({ tone: 'err', text: 'Arquivo inválido — nada foi alterado.' })
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (loading) {
    return <p className="text-center text-sm text-slate-400">Carregando perfil…</p>
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
        Perfil / Configuração do PDI
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Seus dados ficam só neste dispositivo. Sem login.
      </p>

      <Card className="mt-6 space-y-4">
        <Field label="Nome">
          <TextInput value={perfil.nome} onChange={(e) => update({ nome: e.target.value })} />
        </Field>
        <Field label="E-mail">
          <TextInput
            type="email"
            value={perfil.email ?? ''}
            onChange={(e) => update({ email: e.target.value || null })}
            placeholder="voce@email.com"
          />
        </Field>
        <Field label="Propósito / Causa">
          <TextArea
            value={perfil.proposito ?? ''}
            onChange={(e) => update({ proposito: e.target.value || null })}
            placeholder="O que move o seu desenvolvimento?"
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Carreira">
            <Select
              value={perfil.areaId || SELECT_NONE}
              onValueChange={(v) => update({ areaId: v === SELECT_NONE ? null : v })}
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
              onValueChange={(v) => update({ nivelId: v === SELECT_NONE ? null : v })}
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
        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4" />
              Salvo
            </span>
          )}
          <Button variant="primary" onClick={save}>
            Salvar perfil
          </Button>
        </div>
      </Card>

      <Card className="mt-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Dados e privacidade
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Tudo fica neste dispositivo (SQLite local). Exporte um backup ou leve seus dados para
          outro navegador quando quiser.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={exportar}>
            <Download className="h-4 w-4" />
            Exportar JSON
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Importar JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onImportFile(f)
            }}
          />
          {dataMsg && (
            <span
              className={
                'flex items-center gap-1 text-sm ' +
                (dataMsg.tone === 'ok'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400')
              }
            >
              {dataMsg.tone === 'ok' ? (
                <Check className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              {dataMsg.text}
            </span>
          )}
        </div>
      </Card>
    </div>
  )
}
