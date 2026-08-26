import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// server/src/mcp.ts -> server/src -> server -> project root
const PROJECT_ROOT = path.resolve(__dirname, '../..');

function resolveSafe(relativePath: string): string {
  const full = path.resolve(PROJECT_ROOT, relativePath);
  if (!full.startsWith(PROJECT_ROOT)) {
    throw new Error(`Path escapes project root: ${relativePath}`);
  }
  return full;
}

// A fresh McpServer is created per HTTP request (see index.ts) rather
// than reused, this is the simplest correct pattern for stateless
// Streamable HTTP and avoids any session/connection-reuse bugs.
export function createMcpServer() {
  const server = new McpServer({ name: 'lobster-maps', version: '1.0.0' });

  server.tool(
    'read_file',
    'Read a text file from the LobsterMaps project. Path is relative to the project root, e.g. "client/src/App.tsx".',
    { path: z.string() },
    async ({ path: relPath }) => {
      try {
        const content = fs.readFileSync(resolveSafe(relPath), 'utf-8');
        return { content: [{ type: 'text', text: content }] };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error reading ${relPath}: ${(err as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'write_file',
    'Write (create or overwrite) a text file in the LobsterMaps project. Path is relative to the project root. Creates parent directories as needed.',
    { path: z.string(), content: z.string() },
    async ({ path: relPath, content }) => {
      try {
        const full = resolveSafe(relPath);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, content, 'utf-8');
        return { content: [{ type: 'text', text: `Wrote ${relPath} (${content.length} bytes)` }] };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error writing ${relPath}: ${(err as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'list_directory',
    'List files and folders under a directory in the project. Path is relative to the project root ("." for the root). Not recursive, skips node_modules and .git.',
    { path: z.string().default('.') },
    async ({ path: relPath }) => {
      try {
        const full = resolveSafe(relPath);
        const entries = fs
          .readdirSync(full, { withFileTypes: true })
          .filter((e) => e.name !== 'node_modules' && e.name !== '.git')
          .map((e) => (e.isDirectory() ? `${e.name}/` : e.name));
        return { content: [{ type: 'text', text: entries.join('\n') || '(empty)' }] };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error listing ${relPath}: ${(err as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'run_command',
    'Run a shell command in the LobsterMaps project root — npm install/build, tsc, git status/diff/commit, etc.',
    { command: z.string() },
    async ({ command }) => {
      try {
        const output = execSync(command, {
          cwd: PROJECT_ROOT,
          encoding: 'utf-8',
          timeout: 120_000,
          maxBuffer: 5 * 1024 * 1024,
        });
        return { content: [{ type: 'text', text: output || '(no output)' }] };
      } catch (err) {
        const e = err as { stdout?: string; stderr?: string; message: string };
        return {
          content: [
            {
              type: 'text',
              text: `Command failed: ${e.message}\n\nstdout:\n${e.stdout ?? ''}\n\nstderr:\n${e.stderr ?? ''}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  return server;
}
