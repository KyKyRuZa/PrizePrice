#!/usr/bin/env bash
# Deploy script for PrizePrice production server
# Usage: ./deploy.sh [server_user@]server_host
#
# Prerequisites:
#   - SSH access to server
#   - Docker installed on server
#   - DNS records: delron.ru, www.delron.ru → server IP
#   - infra/env/.env.prod configured locally

set -euo pipefail

DEPLOY_DIR="/opt/prizeprice"
REPO_URL=$(git remote get-url origin 2>/dev/null || echo "")
BRANCH=$(git branch --show-current)

if [ -z "$1" ]; then
  echo "Usage: $0 [user@]host"
  echo ""
  echo "Deploy PrizePrice to production server."
  echo ""
  echo "Example: $0 root@delron.ru"
  exit 1
fi

SERVER="$1"

echo "=== Deploying PrizePrice to $SERVER ==="
echo "Branch: $BRANCH"
echo "Deploy dir: $DEPLOY_DIR"
echo ""

# Step 1: Check SSH
echo "[1/6] Checking SSH connection..."
ssh "$SERVER" "echo 'SSH OK'" || { echo "SSH failed"; exit 1; }

# Step 2: Check Docker
echo "[2/6] Checking Docker..."
ssh "$SERVER" "docker --version" || {
  echo "Docker not found. Install with: curl -fsSL https://get.docker.com | sh"
  exit 1
}

# Step 3: Create deploy directory
echo "[3/6] Creating deploy directory..."
ssh "$SERVER" "mkdir -p $DEPLOY_DIR"

# Step 4: Push repo
echo "[4/6] Pushing repository to server..."
rsync -avz --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='client/node_modules' \
  --exclude='server/node_modules' \
  --exclude='client/dist' \
  --exclude='.env.dev' \
  --exclude='.env.prod' \
  --exclude='*.local' \
  --exclude='test-results' \
  --exclude='coverage' \
  "$(dirname "$0")/" "$SERVER:$DEPLOY_DIR/"

# Step 5: Upload .env.prod
echo "[5/6] Uploading .env.prod..."
scp "$(dirname "$0")/infra/env/.env.prod" "$SERVER:$DEPLOY_DIR/infra/env/.env.prod"

# Step 6: Deploy
echo "[6/6] Starting services..."
ssh "$SERVER" "cd $DEPLOY_DIR && ./prod.sh down 2>/dev/null || true && ./prod.sh up -d --build"

echo ""
echo "=== Deploy complete ==="
echo ""
echo "Check status:"
echo "  ssh $SERVER 'cd $DEPLOY_DIR && docker ps'"
echo ""
echo "Check logs:"
echo "  ssh $SERVER 'cd $DEPLOY_DIR && docker logs prizeprice-caddy --tail 20'"
echo ""
echo "Verify HTTPS (after DNS propagates):"
echo "  curl -sk https://delron.ru/health"
