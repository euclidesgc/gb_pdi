# GB PDI

Plano de Desenvolvimento Individual: cada pessoa escolhe a carreira e o nível, faz a
auto-avaliação das habilidades esperadas e monta o plano de desenvolvimento (objetivos,
ações, campo de forças, trilha de aprendizado e diário de evolução). O dashboard destaca os
prazos por urgência e sugere o próximo passo, e o brag document resume o que a pessoa entregou
e aprendeu num período. A área `/admin`
mantém o catálogo compartilhado (áreas, níveis, competências, matriz de habilidades,
certificações e modelos de trilha) e os usuários.

Agentes de IA também podem preencher o PDI pelo [servidor MCP](#servidor-mcp-agentes-de-ia).

## Stack

- **Front-end:** React 19 + Vite + Tailwind CSS, PWA (`src/`).
- **API:** Hono em Node 24 (`server/`), um único processo serve o SPA, a API (`/api`) e
  o MCP (`/mcp`).
- **Banco:** PostgreSQL. As migrações rodam ao subir a API (`server/db/migrations.ts`) e o
  catálogo é semeado na primeira vez (`server/seed/`).

## Rodar localmente

Pré-requisitos: Node 24, Postgres 16 (`brew install postgresql@16`; não precisa deixar
como serviço) e as dependências instaladas com `npm ci`.

### Pelo VS Code (um comando só)

Em **Run and Debug**, escolha **GB PDI (banco + API + front)** e aperte F5. Isso:

1. sobe o Postgres local (na primeira vez cria o banco em `.local-db/`);
2. sobe a API em `:3000` (aplica as migrations e semeia o catálogo) e o front em `:5173`,
   os dois com debugger;
3. abre o Chrome em http://localhost:5173 quando o front responder.

Parar a sessão (Shift+F5), parar qualquer uma das partes ou fechar o Chrome encerra
**tudo**, inclusive o Postgres. Nada fica rodando em segundo plano.

### Pelo terminal

```bash
npm run db:start   # sobe o Postgres local
npm run dev:api    # API em :3000
npm run dev        # front em :5173
npm run db:stop    # ao terminar
```

`npm run db:reset` apaga os dados locais (o próximo start cria um banco novo).

### Configuração

- `.env.development` (versionado, sem segredos) aponta a API para o banco local.
- Para sobrescrever algo na sua máquina, crie um `.env.local` (não versionado), por
  exemplo com `SMTP_*` para testar e-mails de verdade. Sem SMTP, os e-mails são impressos
  no console da API.
- O primeiro usuário cadastrado vira admin quando `ADMIN_EMAILS` não está definido.
- O Vite faz proxy de `/api` e `/mcp` para a API.

### Variáveis de ambiente

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | Conexão com o PostgreSQL (obrigatória). |
| `PORT` | Porta da API (padrão 3000; 8080 no container). |
| `APP_URL` | URL pública do app, usada nos links dos e-mails. |
| `ADMIN_EMAILS` | E-mails (separados por vírgula) sempre administradores. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Envio de e-mails (recuperação de senha, confirmação). Sem `SMTP_HOST`, em dev os e-mails saem no console. |

Veja também o [`.env.example`](.env.example).

### Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Front-end com Vite. |
| `npm run dev:api` | API com recarga automática (lê `.env.development` e `.env.local`). |
| `npm run db:start` / `db:stop` / `db:reset` | Sobe, derruba ou apaga o Postgres local (`scripts/dev-db.sh`). |
| `npm run lint` | Oxlint. |
| `npm run build` | Typecheck + build do SPA (`dist/`) e da API (`dist-server/`). |
| `npm start` | Roda o build de produção. |

## Deploy

O [`Dockerfile`](Dockerfile) gera uma imagem que serve tudo na porta 8080. O ambiente de
homologação roda no Coolify (`https://hml.gbpdi.duckdns.org`) e é publicado a cada push
na `develop`. O CI (`.github/workflows/ci.yml`) roda lint e build em PRs para `develop` e
`main`.

## Servidor MCP (agentes de IA)

O app expõe um servidor [MCP](https://modelcontextprotocol.io) em `/mcp` (Streamable
HTTP). Com ele, um agente de IA (Claude Code, Cursor, Claude Desktop…) lê o catálogo e
preenche o PDI da pessoa: perfil, auto-avaliação, objetivos, ações, campo de forças,
trilha e diário.

### 1. Gerar um token

No app, abra **Perfil → Acesso por agentes de IA (MCP)**, dê um nome ao token e clique em
**Gerar token**. O token (`gbpdi_…`) aparece **uma única vez**: copie e guarde como uma
senha. Ele dá acesso apenas ao seu PDI; o catálogo é só leitura. Na mesma tela você vê o
último uso de cada token e pode revogá-lo (até 10 por conta). Redefinir a senha pelo
e-mail revoga todos os tokens.

### 2. Conectar o agente

Use a URL do ambiente (`https://hml.gbpdi.duckdns.org/mcp` em homologação,
`http://localhost:3000/mcp` em dev) e envie o token no cabeçalho `Authorization`.

**Claude Code:**

```bash
claude mcp add --transport http gb-pdi https://hml.gbpdi.duckdns.org/mcp --header "Authorization: Bearer gbpdi_SEU_TOKEN"
```

**Cursor e outros clientes com configuração em JSON** (ex.: `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "gb-pdi": {
      "url": "https://hml.gbpdi.duckdns.org/mcp",
      "headers": { "Authorization": "Bearer gbpdi_SEU_TOKEN" }
    }
  }
}
```

**Claude Desktop** (via [`mcp-remote`](https://www.npmjs.com/package/mcp-remote), em
`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "gb-pdi": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://hml.gbpdi.duckdns.org/mcp",
        "--header",
        "Authorization: Bearer gbpdi_SEU_TOKEN"
      ]
    }
  }
}
```

> Os conectores personalizados do claude.ai (web) exigem OAuth, que este servidor ainda
> não implementa. Por enquanto, use clientes que aceitam o cabeçalho `Authorization`.

### 3. Usar

Peça ao agente algo como *"Preencha meu PDI: sou dev pleno de engenharia de software e
quero crescer em arquitetura"*. O servidor orienta o agente a consultar o PDI antes de
gravar, seguir o fluxo perfil → auto-avaliação → objetivos → ações/trilha e confirmar com
você antes de inventar dados ou excluir algo.

| Ferramenta | O que faz |
| --- | --- |
| `ver_pdi` | Mostra o PDI completo. |
| `listar_carreiras` | Lista áreas e níveis do catálogo. |
| `listar_habilidades` | Habilidades esperadas da área × nível, com a nota atual. |
| `buscar_recursos` | Certificações e modelos de trilha do catálogo. |
| `atualizar_perfil` | Nome, propósito, área e nível. |
| `avaliar_habilidades` | Auto-avaliação em lote (1–4; 0 limpa). |
| `salvar_objetivo`, `salvar_acao`, `salvar_forca`, `salvar_item_trilha` | Criam (sem `id`) ou atualizam (com `id`, só os campos enviados). |
| `registrar_diario` | Nova entrada no diário (com `destaque` para as vitórias principais). |
| `ver_prazos` | Prazos em aberto por urgência e pontos de atenção do plano. |
| `gerar_brag_doc` | Brag document (Markdown) de um período. |
| `excluir_registro` | Exclui objetivo, ação, força, item de trilha ou entrada do diário. |

Detalhes técnicos em [`docs/mcp.md`](docs/mcp.md).

## Documentação

- [`docs/mcp.md`](docs/mcp.md) — servidor MCP.
- [`docs/pesquisa-mercado-e-bragdoc.md`](docs/pesquisa-mercado-e-bragdoc.md) — comparação com o mercado, features sugeridas e o modelo de brag document.
- [`docs/plano-matriz-habilidades.md`](docs/plano-matriz-habilidades.md) — modelo de
  habilidades, auto-avaliação e plano de desenvolvimento.
- [`docs/leveling.md`](docs/leveling.md) — matriz de leveling de referência.
