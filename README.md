# GB PDI

App de Plano de Desenvolvimento Individual: SPA em React + Vite (`src/`) e API em Hono + Postgres (`server/`), servidos por um único container Node. Homologação: https://hml.gbpdi.duckdns.org (deploy automático a cada push na `develop`).

## Rodando localmente

Pré-requisitos: Node 24, Postgres 16 (`brew install postgresql@16`; não precisa deixar como serviço) e as dependências instaladas com `npm ci`.

### Pelo VS Code (um comando só)

Em **Run and Debug**, escolha **GB PDI (banco + API + front)** e aperte F5. Isso:

1. sobe o Postgres local (na primeira vez cria o banco em `.local-db/`);
2. sobe a API em `:3000` (aplica as migrations e semeia o catálogo) e o front em `:5173`, os dois com debugger;
3. abre o Chrome em http://localhost:5173 quando o front responder.

Parar a sessão (Shift+F5), parar qualquer uma das partes ou fechar o Chrome encerra **tudo**, inclusive o Postgres. Nada fica rodando em segundo plano.

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
- Para sobrescrever algo na sua máquina, crie um `.env.local` (não versionado), por exemplo com `SMTP_*` para testar e-mails de verdade. Sem SMTP, os e-mails são impressos no console da API.
- O primeiro usuário cadastrado vira admin quando `ADMIN_EMAILS` não está definido.
