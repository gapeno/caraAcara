#!/usr/bin/env bash
set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[info]${NC}  $*"; }
success() { echo -e "${GREEN}[ok]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[warn]${NC}  $*"; }
die()     { echo -e "${RED}[error]${NC} $*" >&2; exit 1; }

ROOT="$(cd "$(dirname "$0")" && pwd)"

# ── Prerequisites ─────────────────────────────────────────────────────────────
info "Checking prerequisites..."

need() { command -v "$1" &>/dev/null || die "'$1' not found — please install it first"; }
need aws
need node
need npm
need python3
need jq

python3 -m pip --version &>/dev/null 2>&1 \
  || die "pip not found for python3 — needed to bundle the backend Lambda package"

aws sts get-caller-identity &>/dev/null 2>&1 \
  || die "AWS credentials not configured — run 'aws configure' or set AWS_PROFILE"

success "All prerequisites met"

# ── Frontend build ────────────────────────────────────────────────────────────
# The frontend reads API URLs from /config.json at runtime (written by CDK
# below, after the API Gateway resources exist), so no URL is needed at build time.
info "Building frontend..."
cd "$ROOT/frontend"
npm install --silent
npm run build
success "Frontend built"

# ── Backend Lambda package ────────────────────────────────────────────────────
# Installs Lambda deps as manylinux wheels (targeting the Lambda runtime's
# platform directly, no Docker needed) and bundles the app source alongside
# them; CDK zips backend/build as-is for all four backend Lambdas.
info "Building backend Lambda package..."
cd "$ROOT/backend"
rm -rf build
mkdir -p build
python3 -m pip install --quiet \
  --platform manylinux2014_x86_64 \
  --python-version 3.12 \
  --implementation cp \
  --only-binary=:all: \
  --target build \
  -r requirements-lambda.txt
cp ./*.py build/
cp -r routes games build/
find build -name '__pycache__' -type d -exec rm -rf {} +
success "Backend Lambda package ready"

# ── CDK install ───────────────────────────────────────────────────────────────
info "Installing CDK dependencies..."
cd "$ROOT/infra"
npm install --silent
success "CDK dependencies ready"

# ── Bootstrap CDK (idempotent) ────────────────────────────────────────────────
info "Bootstrapping CDK (safe to re-run)..."
npx cdk bootstrap

# ── Deploy ────────────────────────────────────────────────────────────────────
info "Deploying stack..."
OUTPUTS_FILE="$(mktemp /tmp/cdk-outputs.XXXXXX.json)"
trap 'rm -f "$OUTPUTS_FILE"' EXIT

npx cdk deploy \
  --outputs-file "$OUTPUTS_FILE" \
  --require-approval never

APP_URL=$(jq -r '.CaraAcaraStack.AppUrl' "$OUTPUTS_FILE")
HTTP_API_URL=$(jq -r '.CaraAcaraStack.HttpApiUrl' "$OUTPUTS_FILE")
WS_URL=$(jq -r '.CaraAcaraStack.WebSocketUrl' "$OUTPUTS_FILE")

success "Deployment complete"
echo ""
echo -e "  App        → ${GREEN}$APP_URL${NC}"
echo -e "  REST API   → ${GREEN}$HTTP_API_URL${NC}"
echo -e "  WebSocket  → ${GREEN}$WS_URL${NC}"
