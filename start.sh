#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if docker compose ps --services --filter status=running | grep -q .; then
  echo "Services running — restarting..."
  docker compose restart
else
  echo "Starting services..."
  docker compose up -d --build
fi

echo "Done."
docker compose ps
