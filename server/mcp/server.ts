import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { ESCALA_AUTOAVALIACAO } from '@/domain/catalog'
import type { AuthUser } from '@/domain/auth'
import type { Acao, DiarioEntry, Forca, Objetivo, TrilhaItem } from '@/domain/pdi'
import { newId } from '@/lib/id'
import type { Database } from '../db/Database'
import { PgCatalogRepository } from '../repositories/PgCatalogRepository'
import { PgPdiRepository } from '../repositories/PgPdiRepository'

const ok = (data: unknown): CallToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
})

const fail = (message: string): CallToolResult => ({
  content: [{ type: 'text', text: message }],
  isError: true,
})

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const dataIso = z.string().regex(ISO_DATE, 'Use o formato AAAA-MM-DD')
const textoOpcional = z.string().trim().max(4000).nullable().optional()
const categoria = z
  .enum(['educacional', 'funcional'])
  .describe('educacional = estudar/aprender (curso, leitura); funcional = praticar no trabalho')

/** Today as yyyy-mm-dd in the server's local time. */
const hoje = () => {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

/** Patch semantics: a field left out (undefined) keeps the stored value. */
function merge<T extends object>(base: T, patch: Partial<T>): T {
  const out = { ...base }
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v
  }
  return out
}

const INSTRUCOES = `Servidor MCP do GB PDI (Plano de Desenvolvimento Individual). Todas as
ferramentas agem sobre o PDI da conta dona do token.

Fluxo sugerido para preencher um PDI:
1. ver_pdi — veja o que já está preenchido (nunca duplique objetivos/ações existentes).
2. listar_carreiras + atualizar_perfil — defina nome, propósito, área e nível.
3. listar_habilidades + avaliar_habilidades — auto-avaliação (1 Precisa agir, 2 Pode mais,
   3 Faz bonito, 4 Muda o jogo). Notas 1–2 viram gaps do plano de desenvolvimento.
4. salvar_objetivo — objetivos para os gaps; salvar_forca — forças impulsoras/restritivas.
5. salvar_acao — ações concretas com prazo; buscar_recursos + salvar_item_trilha — trilha.
6. registrar_diario — registros de evolução.

Só avalie habilidades ou invente dados pessoais com base no que a pessoa disse: na dúvida,
pergunte a ela antes de gravar.`

/** One MCP server per request (stateless transport), bound to the token's user. */
export function createMcpServer(db: Database, user: AuthUser): McpServer {
  const pdi = new PgPdiRepository(db, user.id)
  const catalog = new PgCatalogRepository(db)
  const server = new McpServer(
    { name: 'gb-pdi', version: '1.0.0' },
    { instructions: INSTRUCOES },
  )

  const leitura = { readOnlyHint: true, openWorldHint: false } as const
  const escrita = { readOnlyHint: false, destructiveHint: false, openWorldHint: false } as const

  // ---------------------------------------------------------------- leitura

  server.registerTool(
    'ver_pdi',
    {
      title: 'Ver PDI',
      description:
        'Retorna o PDI completo do usuário: perfil, auto-avaliações, objetivos, ações, ' +
        'forças, trilha, diário e conquistas. Chame antes de preencher para não duplicar.',
      annotations: leitura,
    },
    async () => {
      const [dados, areas, niveis] = await Promise.all([
        pdi.exportAll(),
        catalog.listAreas(),
        catalog.listNiveis(),
      ])
      const { ciclos, hardSkills: _h, softSkills: _s, ...resto } = dados
      return ok({
        usuario: { nome: user.nome, email: user.email },
        ...resto,
        perfil: {
          ...dados.perfil,
          area: areas.find((a) => a.id === dados.perfil.areaId)?.nome ?? null,
          nivel: niveis.find((n) => n.id === dados.perfil.nivelId)?.nome ?? null,
        },
        ciclos: ciclos.map(({ snapshotJson: _snap, ...c }) => c),
      })
    },
  )

  server.registerTool(
    'listar_carreiras',
    {
      title: 'Listar carreiras',
      description: 'Lista as áreas (carreiras) e os níveis de senioridade do catálogo, com ids.',
      annotations: leitura,
    },
    async () => {
      const [areas, niveis] = await Promise.all([catalog.listAreas(), catalog.listNiveis()])
      return ok({
        areas: areas.map(({ id, nome, familia, descricao }) => ({ id, nome, familia, descricao })),
        niveis: niveis.map(({ id, nome, ordem, descricao }) => ({ id, nome, ordem, descricao })),
      })
    },
  )

  server.registerTool(
    'listar_habilidades',
    {
      title: 'Listar habilidades esperadas',
      description:
        'Habilidades esperadas para uma área × nível, agrupadas por competência (hard/soft), ' +
        'com a nota atual da auto-avaliação do usuário. Sem argumentos, usa a área e o nível ' +
        'do perfil.',
      inputSchema: {
        areaId: z.string().optional().describe('Id da área (padrão: a do perfil)'),
        nivelId: z.string().optional().describe('Id do nível (padrão: o do perfil)'),
      },
      annotations: leitura,
    },
    async ({ areaId, nivelId }) => {
      const perfil = await pdi.getPerfil()
      const area = areaId ?? perfil.areaId
      const nivel = nivelId ?? perfil.nivelId
      if (!area || !nivel) {
        return fail(
          'Perfil sem área/nível. Use listar_carreiras e atualizar_perfil, ou informe areaId e nivelId.',
        )
      }
      const [habs, comps, avs, expectativas] = await Promise.all([
        catalog.listHabilidades({ areaId: area, nivelId: nivel }),
        catalog.listCompetencias(),
        pdi.listAvaliacoes(),
        catalog.listExpectativas({ areaId: area, nivelId: nivel }),
      ])
      const notas = new Map(avs.map((a) => [a.habilidadeId, a.nota]))
      const competencias = comps
        .map((c) => ({
          competenciaId: c.id,
          competencia: c.nome,
          tipo: c.tipo,
          habilidades: habs
            .filter((h) => h.competenciaId === c.id)
            .map((h) => ({ habilidadeId: h.id, texto: h.texto, nota: notas.get(h.id) ?? null })),
        }))
        .filter((c) => c.habilidades.length)
      return ok({
        areaId: area,
        nivelId: nivel,
        expectativa: expectativas[0]?.expectativa ?? null,
        escala: ESCALA_AUTOAVALIACAO,
        competencias,
      })
    },
  )

  server.registerTool(
    'buscar_recursos',
    {
      title: 'Buscar recursos de desenvolvimento',
      description:
        'Busca certificações e modelos de trilha (cursos, leituras, práticas, projetos) do ' +
        'catálogo, para sugerir itens de trilha e ações.',
      inputSchema: {
        texto: z.string().optional().describe('Termo de busca (nome, provedor, palavras-chave)'),
        competenciaId: z.string().optional(),
        areaId: z.string().optional(),
        limite: z.number().int().min(1).max(100).default(30),
      },
      annotations: leitura,
    },
    async ({ texto, competenciaId, areaId, limite }) => {
      const termo = texto?.trim().toLowerCase()
      const casa = (...campos: Array<string | null | undefined>) =>
        !termo || campos.some((c) => c?.toLowerCase().includes(termo))
      const [certs, templates] = await Promise.all([
        catalog.listCertificacoes(),
        catalog.listTrilhaTemplates(),
      ])
      return ok({
        certificacoes: certs
          .filter((c) => !competenciaId || c.competenciaIds.includes(competenciaId))
          .filter((c) => !areaId || !c.areaIds.length || c.areaIds.includes(areaId))
          .filter((c) => casa(c.nome, c.provedor, c.descricao, c.categoria, ...c.keywords))
          .slice(0, limite)
          .map(({ keywords: _k, ...c }) => c),
        modelosTrilha: templates
          .filter((t) => !competenciaId || t.competenciaId === competenciaId)
          .filter((t) => !areaId || !t.areaId || t.areaId === areaId)
          .filter((t) => casa(t.titulo, t.descricao, ...t.keywords))
          .slice(0, limite)
          .map(({ keywords: _k, ...t }) => t),
      })
    },
  )

  // ---------------------------------------------------------------- escrita

  server.registerTool(
    'atualizar_perfil',
    {
      title: 'Atualizar perfil',
      description:
        'Atualiza o perfil do PDI. Campos omitidos ficam como estão. areaId/nivelId vêm de ' +
        'listar_carreiras e definem quais habilidades entram na auto-avaliação.',
      inputSchema: {
        nome: z.string().trim().min(1).max(200).optional(),
        proposito: textoOpcional.describe('Propósito profissional da pessoa'),
        areaId: z.string().nullable().optional(),
        nivelId: z.string().nullable().optional(),
        wizardConcluido: z
          .boolean()
          .optional()
          .describe('true marca o assistente inicial como concluído'),
      },
      annotations: escrita,
    },
    async (patch) => {
      if (patch.areaId && !(await catalog.getArea(patch.areaId))) {
        return fail(`Área "${patch.areaId}" não existe. Veja listar_carreiras.`)
      }
      if (patch.nivelId && !(await catalog.listNiveis()).some((n) => n.id === patch.nivelId)) {
        return fail(`Nível "${patch.nivelId}" não existe. Veja listar_carreiras.`)
      }
      const perfil = merge(await pdi.getPerfil(), patch)
      await pdi.savePerfil(perfil)
      return ok({ perfil })
    },
  )

  server.registerTool(
    'avaliar_habilidades',
    {
      title: 'Avaliar habilidades',
      description:
        'Grava a auto-avaliação de uma ou mais habilidades (ids de listar_habilidades). ' +
        'Nota: 1 Precisa agir, 2 Pode mais, 3 Faz bonito, 4 Muda o jogo; 0 limpa a nota.',
      inputSchema: {
        avaliacoes: z
          .array(
            z.object({
              habilidadeId: z.string(),
              nota: z.number().int().min(0).max(4),
            }),
          )
          .min(1)
          .max(500),
      },
      annotations: { ...escrita, idempotentHint: true },
    },
    async ({ avaliacoes }) => {
      const existentes = new Set((await catalog.listHabilidades()).map((h) => h.id))
      const invalidas = avaliacoes.filter((a) => !existentes.has(a.habilidadeId))
      if (invalidas.length) {
        return fail(
          `Habilidades inexistentes: ${invalidas.map((a) => a.habilidadeId).join(', ')}. ` +
            'Nada foi gravado.',
        )
      }
      for (const a of avaliacoes) await pdi.setAvaliacao(a.habilidadeId, a.nota)
      return ok({
        gravadas: avaliacoes.length,
        gaps: avaliacoes.filter((a) => a.nota === 1 || a.nota === 2).length,
      })
    },
  )

  server.registerTool(
    'salvar_objetivo',
    {
      title: 'Salvar objetivo',
      description:
        'Cria um objetivo (sem id) ou atualiza um existente (com id; campos omitidos ficam ' +
        'como estão). Retorna o objetivo salvo com seu id.',
      inputSchema: {
        id: z.string().optional(),
        titulo: z.string().trim().min(1).max(300).optional(),
        categoria: categoria.optional(),
        prazo: dataIso.nullable().optional(),
        justificativa: textoOpcional.describe('Por que esse objetivo importa'),
        ordem: z.number().int().min(0).optional(),
      },
      annotations: escrita,
    },
    async ({ id, ...patch }) => {
      const lista = await pdi.listObjetivos()
      let objetivo: Objetivo
      if (id) {
        const atual = lista.find((o) => o.id === id)
        if (!atual) return fail(`Objetivo "${id}" não encontrado.`)
        objetivo = merge(atual, patch)
      } else {
        if (!patch.titulo) return fail('Informe o título do novo objetivo.')
        objetivo = merge<Objetivo>(
          {
            id: newId(),
            titulo: patch.titulo,
            categoria: 'funcional',
            prazo: null,
            justificativa: null,
            ordem: lista.length,
          },
          patch,
        )
      }
      await pdi.upsertObjetivo(objetivo)
      return ok({ objetivo })
    },
  )

  server.registerTool(
    'salvar_acao',
    {
      title: 'Salvar ação do plano',
      description:
        'Cria uma ação do plano (sem id) ou atualiza uma existente (com id; campos omitidos ' +
        'ficam como estão). Vincule a um objetivo com objetivoId.',
      inputSchema: {
        id: z.string().optional(),
        objetivoId: z.string().nullable().optional(),
        titulo: z.string().trim().min(1).max(300).optional(),
        categoria: categoria.optional(),
        dueDate: dataIso.nullable().optional().describe('Prazo da ação (AAAA-MM-DD)'),
        status: z.enum(['pendente', 'em_andamento', 'concluido']).optional(),
        detalhes: textoOpcional,
        ordem: z.number().int().min(0).optional(),
      },
      annotations: escrita,
    },
    async ({ id, ...patch }) => {
      if (patch.objetivoId && !(await pdi.listObjetivos()).some((o) => o.id === patch.objetivoId)) {
        return fail(`Objetivo "${patch.objetivoId}" não encontrado.`)
      }
      const lista = await pdi.listAcoes()
      let acao: Acao
      if (id) {
        const atual = lista.find((a) => a.id === id)
        if (!atual) return fail(`Ação "${id}" não encontrada.`)
        acao = merge(atual, patch)
      } else {
        if (!patch.titulo) return fail('Informe o título da nova ação.')
        acao = merge<Acao>(
          {
            id: newId(),
            objetivoId: null,
            titulo: patch.titulo,
            categoria: 'funcional',
            prazo: null,
            dueDate: null,
            status: 'pendente',
            detalhes: null,
            ordem: lista.length,
          },
          patch,
        )
      }
      await pdi.upsertAcao(acao)
      return ok({ acao })
    },
  )

  server.registerTool(
    'salvar_forca',
    {
      title: 'Salvar força (campo de forças)',
      description:
        'Cria (sem id) ou atualiza (com id) uma força do campo de forças de um objetivo: ' +
        'impulsora (ajuda a chegar lá) ou restritiva (atrapalha), com intensidade 1–5.',
      inputSchema: {
        id: z.string().optional(),
        objetivoId: z.string().nullable().optional(),
        tipo: z.enum(['impulsora', 'restritiva']).optional(),
        descricao: z.string().trim().min(1).max(500).optional(),
        intensidade: z.number().int().min(1).max(5).optional(),
      },
      annotations: escrita,
    },
    async ({ id, ...patch }) => {
      if (patch.objetivoId && !(await pdi.listObjetivos()).some((o) => o.id === patch.objetivoId)) {
        return fail(`Objetivo "${patch.objetivoId}" não encontrado.`)
      }
      let forca: Forca
      if (id) {
        const atual = (await pdi.listForcas()).find((f) => f.id === id)
        if (!atual) return fail(`Força "${id}" não encontrada.`)
        forca = merge(atual, patch)
      } else {
        if (!patch.tipo || !patch.descricao) return fail('Informe tipo e descrição da nova força.')
        forca = merge<Forca>(
          { id: newId(), objetivoId: null, tipo: patch.tipo, descricao: patch.descricao, intensidade: 3 },
          patch,
        )
      }
      await pdi.upsertForca(forca)
      return ok({ forca })
    },
  )

  server.registerTool(
    'salvar_item_trilha',
    {
      title: 'Salvar item da trilha',
      description:
        'Cria (sem id) ou atualiza (com id) um item da trilha de aprendizado. Para usar um ' +
        'modelo do catálogo, passe templateId (de buscar_recursos) e os textos dele.',
      inputSchema: {
        id: z.string().optional(),
        templateId: z.string().nullable().optional(),
        competenciaId: z.string().nullable().optional(),
        tipo: z
          .enum(['certificacao', 'pratica', 'portfolio', 'leitura', 'curso', 'mentoria', 'projeto'])
          .optional(),
        titulo: z.string().trim().min(1).max(300).optional(),
        descricao: textoOpcional,
        duracao: z.string().trim().max(100).nullable().optional().describe('Ex.: "4 semanas"'),
        recursoUrl: z.url().nullable().optional(),
        concluido: z.boolean().optional(),
      },
      annotations: escrita,
    },
    async ({ id, ...patch }) => {
      let item: TrilhaItem
      if (id) {
        const atual = (await pdi.listTrilhaItens()).find((t) => t.id === id)
        if (!atual) return fail(`Item de trilha "${id}" não encontrado.`)
        item = merge(atual, patch)
      } else {
        if (!patch.titulo || !patch.tipo) return fail('Informe tipo e título do novo item.')
        item = merge<TrilhaItem>(
          {
            id: newId(),
            templateId: null,
            competenciaId: null,
            tipo: patch.tipo,
            titulo: patch.titulo,
            descricao: null,
            duracao: null,
            recursoUrl: null,
            concluido: false,
          },
          patch,
        )
      }
      await pdi.upsertTrilhaItem(item)
      return ok({ item })
    },
  )

  server.registerTool(
    'registrar_diario',
    {
      title: 'Registrar no diário',
      description:
        'Adiciona uma entrada ao diário de evolução (texto em Markdown), opcionalmente ' +
        'vinculada a um objetivo e a habilidades do plano.',
      inputSchema: {
        texto: z.string().trim().min(1).max(20000),
        data: dataIso.optional().describe('Padrão: hoje'),
        objetivoId: z.string().nullable().optional(),
        habilidadeIds: z.array(z.string()).max(50).optional(),
      },
      annotations: escrita,
    },
    async ({ texto, data, objetivoId, habilidadeIds }) => {
      if (objetivoId && !(await pdi.listObjetivos()).some((o) => o.id === objetivoId)) {
        return fail(`Objetivo "${objetivoId}" não encontrado.`)
      }
      const entry: DiarioEntry = {
        id: newId(),
        data: data ?? hoje(),
        texto,
        objetivoId: objetivoId ?? null,
        habilidadeIds: habilidadeIds ?? [],
      }
      await pdi.addDiario(entry)
      return ok({ entrada: entry })
    },
  )

  server.registerTool(
    'excluir_registro',
    {
      title: 'Excluir registro',
      description:
        'Exclui um objetivo, ação, força, item de trilha ou entrada do diário. Irreversível: ' +
        'confirme com a pessoa antes.',
      inputSchema: {
        tipo: z.enum(['objetivo', 'acao', 'forca', 'item_trilha', 'diario']),
        id: z.string(),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    },
    async ({ tipo, id }) => {
      const excluir = {
        objetivo: () => pdi.deleteObjetivo(id),
        acao: () => pdi.deleteAcao(id),
        forca: () => pdi.deleteForca(id),
        item_trilha: () => pdi.deleteTrilhaItem(id),
        diario: () => pdi.deleteDiario(id),
      } as const
      await excluir[tipo]()
      return ok({ excluido: { tipo, id } })
    },
  )

  return server
}
