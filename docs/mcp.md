# Servidor MCP — preencher o PDI com um agente de IA

O GB PDI expõe um servidor [MCP](https://modelcontextprotocol.io) em `/mcp`
(Streamable HTTP, sem sessão). Com ele, um agente de IA (Claude Code, Claude Desktop,
Cursor…) lê o catálogo e preenche o PDI da pessoa: perfil, auto-avaliação, objetivos,
ações, campo de forças, trilha e diário.

- Código: `server/mcp/server.ts` (ferramentas) e `server/mcp/routes.ts` (rota + auth).
- Tokens: tabela `api_tokens` (migração 6), rotas `/api/auth/api-tokens`, cartão
  **Acesso por agentes de IA** em Perfil (`src/components/app/AgentesIaCard.tsx`).

## Autenticação

Cada pessoa gera um **token pessoal** em **Perfil → Acesso por agentes de IA**. O token
(`gbpdi_…`) aparece uma única vez; o banco guarda só o SHA-256. Ele vai no cabeçalho
`Authorization: Bearer <token>` e toda ferramenta age apenas sobre o PDI do dono do token
(o catálogo é só leitura). Limite de 10 tokens por conta; revogar na mesma tela.
Redefinir a senha pelo e-mail revoga todos os tokens.

## Conectar

Claude Code:

```bash
claude mcp add --transport http gb-pdi https://hml.gbpdi.duckdns.org/mcp --header "Authorization: Bearer gbpdi_..."
```

Clientes que leem um JSON de configuração (Cursor, Claude Desktop com `mcp-remote` etc.):

```json
{
  "mcpServers": {
    "gb-pdi": {
      "url": "https://hml.gbpdi.duckdns.org/mcp",
      "headers": { "Authorization": "Bearer gbpdi_..." }
    }
  }
}
```

Em dev, a API responde em `http://localhost:3000/mcp` (o Vite também faz proxy de `/mcp`).

> Conectores personalizados do claude.ai exigem OAuth, que este servidor ainda não
> implementa; por enquanto use clientes que aceitam cabeçalho `Authorization`.

## Ferramentas

| Ferramenta | O que faz |
| --- | --- |
| `ver_pdi` | PDI completo (perfil com nome da área/nível, avaliações, objetivos, ações, forças, trilha, diário, conquistas). |
| `listar_carreiras` | Áreas e níveis do catálogo, com ids. |
| `listar_habilidades` | Habilidades esperadas da área × nível (padrão: as do perfil), por competência, com a nota atual. |
| `buscar_recursos` | Certificações e modelos de trilha, filtráveis por texto, competência e área. |
| `atualizar_perfil` | Nome, propósito, área, nível, assistente concluído (campos omitidos ficam como estão). |
| `avaliar_habilidades` | Notas 1–4 (0 limpa) em lote; valida os ids antes de gravar. |
| `salvar_objetivo` / `salvar_acao` / `salvar_forca` / `salvar_item_trilha` | Sem `id` cria; com `id` atualiza só os campos enviados. |
| `registrar_diario` | Nova entrada (Markdown), com vínculos opcionais a objetivos, ações, itens da trilha e habilidades. |
| `excluir_registro` | Exclui objetivo, ação, força, item de trilha ou entrada do diário (marcada como destrutiva). |

O servidor envia instruções ao agente com o fluxo sugerido (ver o PDI antes de gravar,
perfil → auto-avaliação → objetivos → ações/trilha) e pede que ele confirme com a pessoa
antes de inventar dados pessoais ou excluir algo.
