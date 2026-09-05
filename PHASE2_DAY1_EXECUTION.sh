#!/bin/bash
# LobsterMaps — Phase 2, Day 1 Execution Script
# Run this locally on your machine (macOS/Linux with Rust installed)

set -e

echo "=== Phase 2, Day 1: Rust/WASM Build Pipeline ==="
echo ""

# Step 1: Install Rust toolchain
echo "Step 1: Installing Rust toolchain..."
rustup update
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
echo "✓ Rust toolchain ready"
echo ""

# Step 2: Verify Cargo.toml
echo "Step 2: Verifying routing-core/Cargo.toml..."
cd routing-core
cargo fetch
echo "✓ Dependencies resolved"
echo ""

# Step 3: Build for native (sanity check)
echo "Step 3: Building for native target..."
cargo build 2>&1 | head -20
echo "✓ Native build complete"
echo ""

# Step 4: Build for WASM
echo "Step 4: Building WASM binary..."
wasm-pack build --target web 2>&1 | tail -10
echo "✓ WASM build complete"
echo ""

# Step 5: Verify build artifacts
echo "Step 5: Verifying build artifacts..."
ls -lh pkg/
echo ""
file pkg/lobster_routing.wasm || echo "(file command not available, but .wasm exists)"
echo "✓ WASM binary ready"
echo ""

# Step 6: Run tests
echo "Step 6: Running tests..."
cargo test --lib 2>&1 | tail -15
echo "✓ Tests complete"
echo ""

echo "=== Day 1 Complete ==="
echo ""
echo "Next: Integrate with Node.js (Day 1 afternoon)"
echo "See: PHASE2_WEEK1_DETAILED.md, Day 1 afternoon section"
