import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Request, Response, NextFunction } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import businessesRouter from './routes/businesses.js';
import geocodeRouter from './routes/geocode.js';
import routingRouter from './routes/routing.js';
import { createMcpServer } from './mcp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.join(__dirname, '../../client/dist');

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/businesses', businessesRouter);
app.use('/api/geocode', geocodeRouter);
app.use('/api/route', routingRouter);

// MCP endpoint — once this server is public and added as a custom
// connector in Claude, this lets Claude read/write project files and
// run commands (npm, tsc, git) directly. That's real file-write and
// command-execution access sitting on a public URL, so it's gated
// behind a token rather than left open. Set MCP_AUTH_TOKEN before
// deploying; the endpoint refuses to serve without one.
//
// Two ways to authenticate the same endpoint:
//  - POST /mcp with an `Authorization: Bearer <token>` header. This is
//    what a proper header-auth connector setup (e.g. Claude's
//    static_headers beta) sends.
//  - POST /mcp/<token>, with the token as a path segment instead. For
//    a bare "add custom connector by URL" flow with no header field
//    at all — same pattern already used for the LobsterCaptcha
//    connector. Worth knowing: a path segment ends up in access logs
//    same as a query string would, it's not meaningfully more secure,
//    just a pragmatic concession for a single-user hobby server, not
//    something to reach for if this ever has real stakes.
function checkMcpToken(provided: string | undefined, res: Response): boolean {
  const token = process.env.MCP_AUTH_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'MCP_AUTH_TOKEN is not configured on this server' });
    return false;
  }
  if (provided !== token) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

function requireMcpAuthHeader(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const provided = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (checkMcpToken(provided, res)) next();
}

function requireMcpAuthPath(req: Request, res: Response, next: NextFunction) {
  if (checkMcpToken(req.params.token, res)) next();
}

async function handleMcpRequest(req: Request, res: Response) {
  try {
    // Fresh transport + server per request: the simplest correct
    // pattern for stateless Streamable HTTP, no session state to manage.
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    const mcpServer = createMcpServer();
    res.on('close', () => {
      transport.close();
      mcpServer.close();
    });
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('MCP request failed:', err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
}

app.post('/mcp', requireMcpAuthHeader, handleMcpRequest);
app.post('/mcp/:token', requireMcpAuthPath, handleMcpRequest);

// Serve the built frontend from the same process/port as the API and
// MCP endpoint, so a single Replit run command is enough — no separate
// reverse proxy needed. Requires `npm run build` in client/ first.
// The negative-lookahead pattern keeps this from swallowing unmatched
// /api or /mcp requests into an HTML response instead of a proper
// 404/error from those routers.
app.use(express.static(CLIENT_DIST));
app.get(/^(?!\/api|\/mcp).*/, (_req, res) => {
  res.sendFile(path.join(CLIENT_DIST, 'index.html'));
});

// Safety net: catches anything an async route handler forwards via
// next(err) (see asyncHandler in routes/businesses.ts) so a DB or
// other runtime failure returns a normal 500 instead of taking the
// whole process down.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled request error:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`LobsterMaps server listening on :${PORT}`);
});
