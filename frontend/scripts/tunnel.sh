#!/usr/bin/env bash
# Túnel de desarrollo Cloudflare → Vite (puerto 5173)
set -euo pipefail

PORT="${TUNNEL_PORT:-5173}"
CLOUDFLARED="${CLOUDFLARED:-}"

if [[ -z "$CLOUDFLARED" ]]; then
  if command -v cloudflared >/dev/null 2>&1; then
    CLOUDFLARED="cloudflared"
  elif [[ -x "$HOME/.local/bin/cloudflared" ]]; then
    CLOUDFLARED="$HOME/.local/bin/cloudflared"
  else
    echo "cloudflared no encontrado. Instalando en ~/.local/bin …"
    mkdir -p "$HOME/.local/bin"
    curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64" \
      -o "$HOME/.local/bin/cloudflared"
    chmod +x "$HOME/.local/bin/cloudflared"
    CLOUDFLARED="$HOME/.local/bin/cloudflared"
    echo "Instalado. Agrega a tu PATH: export PATH=\"\$HOME/.local/bin:\$PATH\""
  fi
fi

echo "→ Túnel hacia http://localhost:${PORT}"
echo "  (mantén API en :8000 y frontend con pnpm dev)"
exec "$CLOUDFLARED" tunnel --url "http://localhost:${PORT}"
