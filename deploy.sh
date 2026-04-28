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

# ── CDK install ───────────────────────────────────────────────────────────────
info "Installing CDK dependencies..."
cd "$ROOT/infra"
npm install --silent
success "CDK dependencies ready"

# ── Bootstrap CDK (idempotent) ────────────────────────────────────────────────
info "Bootstrapping CDK (safe to re-run)..."
npx cdk bootstrap

# ── Phase 1: deploy with a placeholder frontend ───────────────────────────────
# BucketDeployment requires frontend/build to exist at synth time.
# We deploy once to get the real API URL, then rebuild the frontend with it.
if [ ! -d "$ROOT/frontend/build" ]; then
  warn "No frontend/build found — creating a placeholder for the first deploy"
  mkdir -p "$ROOT/frontend/build"
  echo '<html><body><p>Deploying...</p></body></html>' > "$ROOT/frontend/build/index.html"
fi

info "Phase 1: deploying stack to get API URL..."
OUTPUTS_FILE="$(mktemp /tmp/cdk-outputs.XXXXXX.json)"
trap 'rm -f "$OUTPUTS_FILE"' EXIT

npx cdk deploy \
  --outputs-file "$OUTPUTS_FILE" \
  --require-approval never

API_URL=$(jq -r '.CaraAcaraStack.ApiUrl' "$OUTPUTS_FILE")
FRONTEND_URL=$(jq -r '.CaraAcaraStack.FrontendUrl' "$OUTPUTS_FILE")

success "API URL: $API_URL"
success "Frontend URL: $FRONTEND_URL"

# ── Phase 2: build the real frontend ─────────────────────────────────────────
info "Phase 2: building frontend with real API URL..."
cd "$ROOT/frontend"
REACT_APP_API_URL="$API_URL" npm run build
success "Frontend built"

# ── Phase 3: re-deploy to upload the real frontend ───────────────────────────
info "Phase 3: uploading frontend to S3 and invalidating CloudFront..."
cd "$ROOT/infra"
npx cdk deploy \
  --outputs-file "$OUTPUTS_FILE" \
  --require-approval never

success "Deployment complete"
echo ""
echo -e "  Frontend → ${GREEN}$FRONTEND_URL${NC}"
echo -e "  API      → ${GREEN}$API_URL${NC}"
