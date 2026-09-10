#!/bin/bash
# Build Rust WASM modules for browser integration
# Output: routing-core/pkg/ (JavaScript + WASM binaries)

set -e

echo "🦀 Building Rust WASM modules..."

# Check for wasm-pack
if ! command -v wasm-pack &> /dev/null; then
    echo "⚠️  wasm-pack not found. Installing..."
    curl https://rustwasm.org/wasm-pack/installer/init.sh -sSf | sh
fi

# Build for bundler target (Node/Webpack compatible)
echo "📦 Compiling to WASM (bundler target)..."
wasm-pack build routing-core \
    --target bundler \
    --release \
    --out-dir pkg

echo "✅ WASM build complete!"
echo ""
echo "📍 Generated files:"
ls -lh routing-core/pkg/*.wasm 2>/dev/null | awk '{print "  - " $9 " (" $5 ")"}'
ls -lh routing-core/pkg/*.js 2>/dev/null | awk '{print "  - " $9 " (" $5 ")"}'

echo ""
echo "📝 To integrate into Express:"
echo "  import * as wasm from '../routing-core/pkg/index.js';"
echo "  await wasm.default();"
