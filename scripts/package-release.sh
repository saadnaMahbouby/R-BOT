#!/bin/bash
# Construit les images de livraison (sans code source) et les exporte en un seul
# fichier .tar à envoyer au client. À lancer sur TA machine de build (avec le code).
#
# Usage:  bash scripts/package-release.sh
# Sortie: rbot-release.tar  (+ docker-compose.delivery.yml + .env.docker.example à joindre)
set -e
cd "$(dirname "$0")/.."

# Valeurs de build (placeholders : les vraies valeurs viennent du .env.docker du client au runtime)
NEXTAUTH_URL="${NEXTAUTH_URL:-https://bot.example.com}"
NEXT_PUBLIC_VIEWER_URL="${NEXT_PUBLIC_VIEWER_URL:-https://botview.example.com}"
ENCRYPTION_SECRET="${ENCRYPTION_SECRET:-abcdefghijklmnopqrstuvwxyz123456}"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:typebot@typebot-db-docker:5432/typebot?schema=public}"

COMMON_ARGS=(
  --build-arg "DATABASE_URL=$DATABASE_URL"
  --build-arg "ENCRYPTION_SECRET=$ENCRYPTION_SECRET"
  --build-arg "NEXTAUTH_URL=$NEXTAUTH_URL"
  --build-arg "NEXT_PUBLIC_VIEWER_URL=$NEXT_PUBLIC_VIEWER_URL"
)

echo "==> Build de l'image builder (release, sans source)..."
docker build --target release --build-arg SCOPE=builder "${COMMON_ARGS[@]}" -t rbot-builder:latest .

echo "==> Build de l'image viewer (release, sans source)..."
docker build --target release --build-arg SCOPE=viewer "${COMMON_ARGS[@]}" -t rbot-viewer:latest .

echo "==> Build de l'image migrator (schéma + migrations seulement)..."
docker build --target migrator -t rbot-migrator:latest .

echo "==> Export des images dans rbot-release.tar..."
docker save rbot-builder:latest rbot-viewer:latest rbot-migrator:latest -o rbot-release.tar

echo ""
echo "✅ Terminé : rbot-release.tar"
ls -lh rbot-release.tar
echo ""
echo "À envoyer au client : rbot-release.tar + docker-compose.delivery.yml + .env.docker (rempli avec SA licence)"
