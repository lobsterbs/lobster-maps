# Phase 2 — Day 1: Rust/WASM Build Pipeline (LOCAL EXECUTION)

**Goal:** Rust toolchain installed, first WASM binary compiled, verified in Node.js.

**Prerequisites:** macOS/Linux with ~2GB free space. Install Rust if not present.

---

## Morning (2-3 hours)

### 1. Install Rust & WASM toolchain

```bash
# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Update + add WASM target
rustup update
rustup target add wasm32-unknown-unknown

# Install wasm-pack
cargo install wasm-pack

# Verify
wasm-pack --version
rustup target list | grep wasm32
```

**Expected:** `wasm-pack 1.x.x`, `wasm32-unknown-unknown (installed)`

---

### 2. Build Rust WASM module

```bash
cd routing-core

# Fetch dependencies
cargo fetch
# Expected: downloads serde, wasm-bindgen, proptest, criterion

# Build for native (sanity check)
cargo build

# Build for WASM
wasm-pack build --target web
```

**Expected output:**
```
   Compiling lobster-routing v0.1.0
    Finished `dev` profile [unoptimized + debuginfo] target(s) in X.XXs
    Finished release [optimized] target(s) in X.XXs
```

**Check artifact:**
```bash
ls -lh pkg/
# lobster_routing.wasm (~500KB)
# lobster_routing.js (bindings)
# package.json
```

---

### 3. Run tests

```bash
cargo test --lib -- --nocapture
```

**Expected:** All tests pass (even if empty for now)

---

## Afternoon (2-3 hours)

### 4. Set up Node.js WASM loader

Create `server/src/routing/wasm-loader.ts`:

```typescript
import init, { Router } from '../../../routing-core/pkg/lobster_routing.js';

let router: Router | null = null;

export async function initializeRouter(): Promise<Router> {
  if (router) return router;
  
  // Load WASM module
  await init();
  router = new Router();
  
  console.log('✓ Router initialized');
  return router;
}

export function getRouter(): Router {
  if (!router) throw new Error('Router not initialized. Call initializeRouter() first.');
  return router;
}
```

---

### 5. Write integration test

Create `server/src/routing/wasm-loader.test.ts`:

```typescript
import { initializeRouter, getRouter } from './wasm-loader';

describe('WASM Router Integration', () => {
  it('initializes Router', async () => {
    const router = await initializeRouter();
    expect(router).toBeDefined();
  });
  
  it('retrieves initialized Router', async () => {
    await initializeRouter();
    const router = getRouter();
    expect(router).toBeDefined();
  });
  
  it('throws if Router not initialized', () => {
    // Reset router (mock)
    expect(() => getRouter()).toThrow('not initialized');
  });
});
```

---

### 6. Update server build

Edit `server/package.json`:

```json
{
  "scripts": {
    "build": "tsc",
    "postbuild": "npm --prefix ../routing-core run build:wasm",
    "dev": "ts-node src/index.ts",
    "test": "jest"
  }
}
```

Edit `server/tsconfig.json` to include:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "resolveJsonModule": true
  }
}
```

---

### 7. Commit locally

```bash
git add routing-core/pkg/ server/src/routing/wasm-loader.ts server/src/routing/wasm-loader.test.ts
git commit -m "feat: Rust/WASM build pipeline working, first compile + integration

- Rust toolchain installed (wasm32-unknown-unknown target)
- wasm-pack build produces lobster_routing.wasm
- Node.js loader wraps WASM exports
- Integration test passes
- Ready for Day 2 (GitHub Actions CI/CD)"
```

---

## Success Criteria ✓

- [ ] `cargo build --target wasm32-unknown-unknown` succeeds
- [ ] `wasm-pack build --target web` produces `pkg/lobster_routing.wasm`
- [ ] `pkg/lobster_routing.wasm` exists and is >100KB
- [ ] `pkg/lobster_routing.js` contains valid bindings
- [ ] Node.js can import and instantiate Router: `new Router()`
- [ ] Integration test passes
- [ ] No TypeScript errors: `npx tsc --noEmit`

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `rustup: command not found` | Run installer: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| `wasm-pack not found` | Run: `cargo install wasm-pack` |
| WASM build fails with linking error | Ensure `wasm32-unknown-unknown` target: `rustup target add wasm32-unknown-unknown` |
| Node import fails | Verify `pkg/` directory exists. Check `lobster_routing.js` is valid. |
| Test import errors | Update TypeScript paths: `"paths": { "@routing/*": ["./routing/*"] }` in tsconfig.json |

---

## Next Step

**Day 2:** GitHub Actions CI/CD (automate build + test)

See: PHASE2_WEEK1_DETAILED.md, Day 2 section

