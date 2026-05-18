#!/bin/bash
set -e

# ── Config — fill these in ────────────────────────────────────────────────────
VPS_HOST="37.97.184.18"
VPS_USER="jiri132"
VPS_DIR="/home/jiri132/foundiq"
SSH_KEY="$HOME/.ssh/id_ed25519"
# ─────────────────────────────────────────────────────────────────────────────

GREEN='\033[0;32m'; NC='\033[0m'
log() { echo -e "${GREEN}[deploy]${NC} $1"; }

log "Syncing project to VPS..."
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.svelte-kit' \
  --exclude 'build' \
  --exclude '.env' \
  -e "ssh -i ${SSH_KEY}" \
  ./ "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/"

log "Starting containers on VPS..."
ssh -i "${SSH_KEY}" "${VPS_USER}@${VPS_HOST}" bash <<EOF
  set -e
  cd ${VPS_DIR}
  docker compose -f docker-compose.prod.yml up --build -d
  echo "Container status:"
  docker compose -f docker-compose.prod.yml ps
EOF

log "Reloading Nginx..."
ssh -i "${SSH_KEY}" "${VPS_USER}@${VPS_HOST}" bash <<EOF
  cd /home/jiri132/server
  docker compose exec nginx nginx -s reload
EOF

log "Done! App running at https://app.foundiq.nl"
