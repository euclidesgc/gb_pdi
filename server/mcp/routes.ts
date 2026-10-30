import { Hono } from 'hono'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import type { Database } from '../db/Database'
import { userFromApiToken } from '../auth/users'
import { createMcpServer } from './server'

/**
 * `/mcp` — MCP endpoint (Streamable HTTP, stateless) for AI agents. Auth is a
 * personal access token (`Authorization: Bearer gbpdi_…`, created in Perfil);
 * every tool acts on the token owner's PDI. Bearer auth isn't sent by browsers
 * on their own, so the API's JSON-only CSRF guard isn't needed here.
 */
export function createMcpRoutes(db: Database) {
  const mcp = new Hono()

  mcp.all('/', async (c) => {
    const header = c.req.header('authorization') ?? ''
    const token = header.match(/^Bearer\s+(\S+)$/i)?.[1]
    const user = token ? await userFromApiToken(db, token) : null
    if (!user) {
      c.header('WWW-Authenticate', 'Bearer realm="gb-pdi"')
      return c.json(
        { error: 'Token inválido. Gere um token pessoal em Perfil → Acesso por agentes de IA.' },
        401,
      )
    }

    // Stateless: a fresh server + transport per request, no session to keep.
    const server = createMcpServer(db, user)
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    })
    await server.connect(transport)
    try {
      return await transport.handleRequest(c.req.raw)
    } finally {
      void server.close()
    }
  })

  return mcp
}
