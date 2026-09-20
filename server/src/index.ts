import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Request, Response, NextFunction } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import businessesRouter from './routes/businesses.js';
import geocodeRouter from './routes/geocode.js';
import routingRouter from './routes/routing.js';
import searchRouter from './routes/search.js';
import scrapeRouter from './routes/scrape.js';
import { createMcpServer } from './mcp.js';
import { initializeWasmModules, isWasmAvailable, getWasmStatus } from './wasm/index.js';
import { rateLimiterWasm, tileRateLimiter } from './middleware/rateLimiterWasm.js';
import { refreshWeatherCache } from './lib/weatherCacheWasm.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolve client dist path - handle both local dev and Render deployments  
// __dirname from compiled server/dist/index.js points to server/dist/
// So ../../client/dist resolves to client/dist (correct)
// For Render, we fall back to searching from process.cwd()
let CLIENT_DIST = path.join(__dirname, '../../client/dist');
if (process.env.CLIENT_DIST) {
  CLIENT_DIST = process.env.CLIENT_DIST;
} else {
  // Try alternate paths if the computed one doesn't exist
  const altPath = path.join(process.cwd(), 'client/dist');
  if (fs.existsSync(altPath)) {
    CLIENT_DIST = altPath;
  }
}
console.log('📂 Serving client from:', CLIENT_DIST);

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// Reports what is actually running, not what we hope is running. The
// WASM status in particular was previously only visible by reading
// startup logs.
app.get('/health', (_req, res) =>
  res.json({ ok: true, wasm: getWasmStatus(), uptimeSeconds: Math.round(process.uptime()) })
);

// Initialize WASM modules and start server
async function startServer() {
  try {
    await initializeWasmModules();

    // Tile traffic is bursty (dozens of requests per viewport) and must
    // not share a bucket with the JSON API, or one map pan 429s the next
    // real API call.
    //
    // Note `/api/tiles/...` matches BOTH mounts, so the strict limiter
    // explicitly skips it rather than running second and undoing the
    // split. Inside an `app.use('/api', ...)` mount `req.path` is the
    // remainder after the mount point, i.e. `/tiles/16/33736/18888.png`.
    app.use('/api/tiles', tileRateLimiter);
    app.use('/api', (req, res, next) => {
      if (req.path.startsWith('/tiles/')) return next();
      return rateLimiterWasm(req, res, next);
    });

    // Keyless OSM raster fallback. Only used when the client was built
    // without VITE_MAPTILER_KEY — with a key the browser goes straight
    // to MapTiler's CDN and never touches this.
    //
    // (The comment that used to sit here blamed "Render can't reach
    // external tile servers". That diagnosis was wrong: Render does not
    // block outbound traffic, and the browser fetches tiles itself
    // anyway. The real cause was a missing build-time API key.)
    app.get('/api/tiles/:z/:x/:y.png', async (req, res) => {
      const { z, x, y } = req.params;
      try {
        // Validate tile coordinates to prevent DoS via huge z values
        const zoom = parseInt(z, 10);
        if (isNaN(zoom) || zoom < 0 || zoom > 28) {
          res.status(400).json({ error: 'Invalid zoom level' });
          return;
        }

        // Fetch from OpenStreetMap (round-robin subdomains a, b, c)
        const subdomain = String.fromCharCode(97 + (parseInt(x, 10) % 3)); // 'a', 'b', or 'c'
        const osmUrl = `https://${subdomain}.tile.openstreetmap.org/${z}/${x}/${y}.png`;

        const response = await fetch(osmUrl, {
          headers: {
            'User-Agent': 'LobsterMaps/2.0 (+https://lobster-maps.onrender.com)',
          },
        });

        if (!response.ok) {
          console.warn(`Tile fetch failed: ${osmUrl} returned ${response.status}`);
          res.status(response.status).json({ error: 'Tile not found' });
          return;
        }

        // Cache indefinitely — tiles never change
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
        res.set('Content-Type', 'image/png');
        res.send(Buffer.from(await response.arrayBuffer()));
      } catch (err) {
        console.error(`Tile proxy error for ${z}/${x}/${y}:`, err);
        res.status(500).json({ error: 'Tile fetch failed' });
      }
    });

    // The MapTiler style + glyph proxies that used to live here are
    // gone. They pointed at `/tiles/v4/tiles.json`, and MapTiler's
    // current endpoint is `/maps/{mapId}/style.json` (the whole v2
    // generation is deprecated in favour of v4). More importantly the
    // proxy never actually hid the key: a MapTiler style.json embeds
    // key-bearing absolute URLs for its own sources, sprites and
    // glyphs, so the browser ended up holding the key anyway — while
    // every tile made a detour through a US Render box on its way to a
    // user in Bergen.
    //
    // The client now talks to MapTiler's CDN directly. Protect the key
    // with an origin restriction in the MapTiler dashboard
    // (Account -> API Keys -> Edit -> allowed origins), which is the
    // control MapTiler actually provides for browser keys.

    // Wire routes
    app.use('/api/businesses', businessesRouter);
    app.use('/api/geocode', geocodeRouter);
    app.use('/api/route', routingRouter);
    app.use('/api', searchRouter); // Search endpoint
    app.use('/api/scrape', scrapeRouter); // Scraping endpoint

    // Start weather cache refresh (every 10 minutes)
    console.log('🌤️  Starting weather cache refresh...');
    refreshWeatherCache().catch(err => console.error('Initial weather refresh failed:', err));
    setInterval(refreshWeatherCache, 10 * 60 * 1000);

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

    async function handleMcpRequest(req: Request, res: Response) {
      try {
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


    // Serve the built frontend from the same process/port as the API and
    // MCP endpoint, so a single Replit run command is enough — no separate
    // reverse proxy needed. Requires `npm run build` in client/ first.
    // The negative-lookahead pattern keeps this from swallowing unmatched
    // /api or /mcp requests into an HTML response instead of a proper
    // 404/error from those routers.
    app.use(express.static(CLIENT_DIST));
    // Only serve index.html for SPA routing (routes without file extensions)
    // Skip: paths with dots (are files), /api routes, /mcp routes
    app.get(/^(?!.*[.])(?!\/api)(?!\/mcp)/, (_req, res) => {
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
      const usingWasm = isWasmAvailable();
      console.log(`LobsterMaps server listening on :${PORT}`);
      // Speed claims removed: they were printed unconditionally from a
      // flag, never measured, and were being printed next to a WASM
      // build that did not exist.
      console.log(`Compute backend: ${usingWasm ? 'Rust/WASM' : 'Node fallback'}`);
      if (!usingWasm) console.log(`  reason: ${getWasmStatus().reason ?? 'unknown'}`);
      console.log('Geocoding: Nominatim + local cache');
    });
  } catch (err) {
    console.error('❌ Server startup failed:', err);
    process.exit(1);
  }
}

startServer();
