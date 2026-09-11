#!/bin/bash
set -e

echo "🦀 LobsterMaps WASM Build Script"
echo "=================================="
echo ""

# Check for Rust
if ! command -v rustc &> /dev/null; then
    echo "❌ Rust not found. Install from https://rustup.rs/"
    exit 1
fi

echo "✅ Rust found: $(rustc --version)"

# Check for wasm-pack
if ! command -v wasm-pack &> /dev/null; then
    echo ""
    echo "📦 Installing wasm-pack..."
    curl https://rustwasm.org/wasm-pack/installer/init.sh -sSf | sh
fi

echo "✅ wasm-pack ready: $(wasm-pack --version)"

# Add WASM target
echo ""
echo "📋 Installing wasm32-unknown-unknown target..."
rustup target add wasm32-unknown-unknown

# Clean previous build
echo ""
echo "🧹 Cleaning previous WASM build..."
rm -rf routing-core/pkg/

# Build WASM
echo ""
echo "🏗️  Building WASM modules (release)..."
cd routing-core
wasm-pack build \
    --target bundler \
    --release \
    --out-dir pkg

cd ..

# Verify build
echo ""
echo "✅ WASM Build Complete!"
echo ""
echo "📊 Generated files:"
ls -lh routing-core/pkg/ | grep -E '\.(wasm|js|d\.ts)$' | awk '{print "  " $9 " (" $5 ")"}'

echo ""
echo "📦 Package size:"
du -sh routing-core/pkg/

echo ""
echo "🎉 Ready to run server!"
echo "   npm run dev:server"
