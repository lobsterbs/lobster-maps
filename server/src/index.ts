import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Request, Response, NextFunction } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import businessesRouter from './routes/businesses.js';
import geocodeRouter from './routes/geocode.js';
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

// MCP endpoint — once this server is public and added as a custom
// connector in Claude, this lets Claude read/write project files and
// run commands (npm, tsc, git) directly. That's real file-write and
// command-execution access sitting on a public URL, so it's gated
// behind a bearer token rather than left open. Set MCP_AUTH_TOKEN
// before deploying; the endpoint refuses to serve without one.
function requireMcpAuth(req: Request, res: Response, next: NextFunction) {
  const token = process.env.MCP_AUTH_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'MCP_AUTH_TOKEN is not configured on this server' });
    return;
  }
  if (req.headers.authorization !== `Bearer ${token}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

app.post('/mcp', requireMcpAuth, async (req, res) => {
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
});

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
