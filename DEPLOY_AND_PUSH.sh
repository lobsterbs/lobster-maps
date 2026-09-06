#!/bin/bash
# LobsterMaps — Deploy + Push Script (runs on Render)
# This script can be triggered from anywhere with network access to Render

set -e

echo "╔════════════════════════════════════════════╗"
echo "║  LobsterMaps Push to GitHub (from Render)  ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Git config
GIT_USER="LobsterMaps-Deploy"
GIT_EMAIL="deploy@lobster-maps.dev"
REPO="https://github.com/lobsterbs/lobster-maps.git"
BRANCH="feature/custom-router"
PAT="[REDACTED_PAT]"

echo "Step 1: Configure git"
git config --global user.name "$GIT_USER"
git config --global user.email "$GIT_EMAIL"
git config --global credential.helper store
echo "https://$PAT@github.com" > ~/.git-credentials
echo "✓ Git configured"
echo ""

echo "Step 2: Clone repo"
if [ -d "/tmp/lobster-push" ]; then
  rm -rf /tmp/lobster-push
fi
git clone "$REPO" /tmp/lobster-push
cd /tmp/lobster-push
echo "✓ Repo cloned"
echo ""

echo "Step 3: Copy code from current deploy"
# Copy from /opt/render/project/src to current repo
cp -r /opt/render/project/src/* ./ 2>/dev/null || echo "⚠️  Could not copy from /opt/render (might not exist yet)"
echo "✓ Code copied"
echo ""

echo "Step 4: Check git status"
git status
echo ""

echo "Step 5: Add all changes"
git add -A
git commit -m "Deploy from Render: Phase 1 + Phase 2 infrastructure" || echo "⚠️  Nothing new to commit"
echo "✓ Changes staged"
echo ""

echo "Step 6: Push to GitHub"
git push "https://$PAT@github.com/lobsterbs/lobster-maps.git" "$BRANCH" -v
echo "✓ Pushed to GitHub"
echo ""

echo "Step 7: Create Pull Request (manual)"
echo "Next: Go to GitHub and merge feature/custom-router to main"
echo "URL: https://github.com/lobsterbs/lobster-maps/compare/main...feature/custom-router"
echo ""

echo "✓ Deploy + Push Complete"
