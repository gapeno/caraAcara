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
need docker
need jq

docker info &>/dev/null 2>&1 || die "Docker is not running — CDK needs it for Lambda bundling"

aws sts get-caller-identity &>/dev/null 2>&1 \
  || die "AWS credentials not configured — run 'aws configure' or set AWS_PROFILE"

success "All prerequisites met"

# ── Frontend build ────────────────────────────────────────────────────────────
# The frontend uses relative API paths (/games/…) so no URL is needed at build time.
info "Building frontend..."
cd "$ROOT/frontend"
npm install --silent
npm run build
success "Frontend built"

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

success "Deployment complete"
echo ""
echo -e "  App → ${GREEN}$APP_URL${NC}"
