# GB PDI

App de Plano de Desenvolvimento Individual: SPA em React + Vite (`src/`) e API em Hono + Postgres (`server/`), servidos por um único container Node.

## Fluxo de desenvolvimento (Gitflow)

| Branch | Para quê | Sai de | Volta para |
| --- | --- | --- | --- |
| `main` | Código liberado (releases). Ainda não tem ambiente próprio. | — | — |
| `develop` | Integração. **Todo push publica em hml** (https://hml.gbpdi.duckdns.org) pelo Coolify. | — | — |
| `feature/<nome-curto>` | Uma feature ou melhoria | `develop` | `develop` (PR) |
| `release/<versão>` | Fechar uma versão: só ajustes finais | `develop` | `main` + `develop` |
| `hotfix/<nome-curto>` | Correção urgente do que está na `main` | `main` | `main` + `develop` |

Regras:

- Nunca commitar direto em `develop` ou `main`: sempre por PR.
- Toda feature nasce de uma `develop` atualizada (`git fetch && git switch -c feature/x origin/develop`).
- PR de feature vai para `develop`. Antes de abrir, rode `npm run lint` e `npm run build`; o CI do GitHub roda os mesmos passos no PR.
- O merge na `develop` publica em hml sozinho. Confira o deploy (health em `/api/health`) depois do merge.
- Release: `release/x.y.z` a partir da `develop`, PR para `main`, tag `vx.y.z` na `main` e merge de volta na `develop`.
- Hotfix: `hotfix/x` a partir da `main`, PR para `main` e merge de volta na `develop`.
- Branches são apagadas depois do merge.
- Mensagens de commit em português, no imperativo e descrevendo o efeito ("Adiciona…", "Corrige…").

## Rodando localmente

- `npm run dev:api` sobe a API em `:3000` (lê `DATABASE_URL` de `.env.local`); `npm run dev` sobe o Vite em `:5173` com proxy de `/api`.
- Sem SMTP configurado, os e-mails são impressos no console da API.
- `.env` e `.env.local` têm segredos e não são versionados; `.env.example` lista as chaves.

## Banco de dados

- Migrations ficam em `server/db/migrations.ts` e rodam sozinhas quando a API sobe.
- Nunca altere uma migration já publicada: crie uma nova versão.
- Toda query do PDI é filtrada por `user_id` (`PgPdiRepository`); vínculos entre registros devem checar que o item pertence ao mesmo usuário.
