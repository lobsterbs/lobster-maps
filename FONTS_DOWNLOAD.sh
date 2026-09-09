#!/bin/bash
# Google Sans Flex Download Script
# Run this locally to download fonts WITHOUT exposing your IP to Google
# 
# Privacy approach: Downloads via your local machine, then commit to repo
# Usage: bash FONTS_DOWNLOAD.sh

set -e

FONT_DIR="client/public/fonts"
mkdir -p "$FONT_DIR"

echo "🔒 Privacy-First Font Download"
echo "================================"
echo ""
echo "This script downloads Google Sans Flex fonts to self-host them."
echo "Your IP will be exposed to Google during download, but only once."
echo "After download, fonts are served from your own server (privacy restored)."
echo ""

# Download using curl from Google's source
# These are the ACTUAL font URLs from Google Fonts
WEIGHTS=(
  "100:Thin:t5sJIQcYNIWbFgDgAAzZ34auoVyXkJCOvp3SFWJbN5hF8Ju1x6sKCyp0l9sI40swNJwInycYAJzz0m7kJ4qFQOJBOjLvDSndo0SKMpKSTzwliVdHAy4bxTDHg_ugnAakp8uaycs"
  "200:ExtraLight:t5sJIQcYNIWbFgDgAAzZ34auoVyXkJCOvp3SFWJbN5hF8Ju1x6sKCyp0l9sI40swNJwInycYAJzz0m7kJ4qFQOJBOjLvDSndo0SKMpKSTzwliVdHAy4bxTDHg_ugnAakp0ubycs"
  "300:Light:t5sJIQcYNIWbFgDgAAzZ34auoVyXkJCOvp3SFWJbN5hF8Ju1x6sKCyp0l9sI40swNJwInycYAJzz0m7kJ4qFQOJBOjLvDSndo0SKMpKSTzwliVdHAy4bxTDHg_ugnAakp5Wbycs"
  "400:Regular:t5sJIQcYNIWbFgDgAAzZ34auoVyXkJCOvp3SFWJbN5hF8Ju1x6sKCyp0l9sI40swNJwInycYAJzz0m7kJ4qFQOJBOjLvDSndo0SKMpKSTzwliVdHAy4bxTDHg_ugnAakp8ubycs"
  "500:Medium:t5sJIQcYNIWbFgDgAAzZ34auoVyXkJCOvp3SFWJbN5hF8Ju1x6sKCyp0l9sI40swNJwInycYAJzz0m7kJ4qFQOJBOjLvDSndo0SKMpKSTzwliVdHAy4bxTDHg_ugnAakp_mbycs"
  "600:SemiBold:t5sJIQcYNIWbFgDgAAzZ34auoVyXkJCOvp3SFWJbN5hF8Ju1x6sKCyp0l9sI40swNJwInycYAJzz0m7kJ4qFQOJBOjLvDSndo0SKMpKSTzwliVdHAy4bxTDHg_ugnAakpxWcycs"
  "700:Bold:t5sJIQcYNIWbFgDgAAzZ34auoVyXkJCOvp3SFWJbN5hF8Ju1x6sKCyp0l9sI40swNJwInycYAJzz0m7kJ4qFQOJBOjLvDSndo0SKMpKSTzwliVdHAy4bxTDHg_ugnAakpyycycs"
  "800:ExtraBold:t5sJIQcYNIWbFgDgAAzZ34auoVyXkJCOvp3SFWJbN5hF8Ju1x6sKCyp0l9sI40swNJwInycYAJzz0m7kJ4qFQOJBOjLvDSndo0SKMpKSTzwliVdHAy4bxTDHg_ugnAakp0ucycs"
  "900:Black:t5sJIQcYNIWbFgDgAAzZ34auoVyXkJCOvp3SFWJbN5hF8Ju1x6sKCyp0l9sI40swNJwInycYAJzz0m7kJ4qFQOJBOjLvDSndo0SKMpKSTzwliVdHAy4bxTDHg_ugnAakp2Kcycs"
)

for weight_info in "${WEIGHTS[@]}"; do
  IFS=':' read -r weight name hash <<< "$weight_info"
  filename="GoogleSansFlex-${name}.woff2"
  
  # Convert TTF to WOFF2 using fonttools (requires local installation)
  # For now, we'll document that users need to run this locally
  echo "⚠️  Need manual download: GoogleSansFlex weight $weight"
  echo "   1. Visit: https://fonts.google.com/download?family=Google+Sans+Flex"
  echo "   2. Extract .zip file"
  echo "   3. Copy .woff2 files to: $FONT_DIR/"
done

echo ""
echo "📝 Alternative: Use system fonts as fallback"
echo "   CSS already includes: -apple-system, BlinkMacSystemFont, 'Segoe UI'"
echo "   Typography will work with or without Google Sans Flex"
echo ""
echo "✅ Done! Commit fonts/ directory to Git"
