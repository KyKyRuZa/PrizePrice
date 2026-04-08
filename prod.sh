#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/infra/docker"
docker compose -f docker-compose.prod.yml "$@"
