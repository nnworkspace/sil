#!/usr/bin/env bash
#
# Local backup of the wardrobe dev data, both halves of it:
#   1. the Postgres database (schema + every row) via pg_dump
#   2. the photo files under public/uploads
#
# Writes a timestamped folder under backups/ (gitignored, so your data stays
# local and out of git). Run any time:
#
#   pnpm db:backup
#
# The dump is role-agnostic (--no-owner --no-privileges) so the same file also
# restores cleanly into any other Postgres database.

set -euo pipefail

DB_CONTAINER="sil-db"
DB_USER="sil"
DB_NAME="sil"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="$ROOT/backups/$STAMP"

if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  echo "✗ Database container '${DB_CONTAINER}' is not running. Start it with: docker compose up -d" >&2
  exit 1
fi

mkdir -p "$DEST"

echo "→ Dumping database '${DB_NAME}' …"
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -Fc --no-owner --no-privileges "$DB_NAME" > "$DEST/db.dump"

echo "→ Copying photos …"
if [ -d "$ROOT/public/uploads" ] && [ -n "$(ls -A "$ROOT/public/uploads" 2>/dev/null)" ]; then
  cp -R "$ROOT/public/uploads" "$DEST/uploads"
else
  echo "  (no photos in public/uploads yet, skipping)"
fi

ITEMS="$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc 'select count(*) from items' 2>/dev/null || echo '?')"
{
  echo "Wardrobe local backup"
  echo "created : $STAMP"
  echo "items   : $ITEMS"
  echo "db.dump : pg_dump custom format (restore with 'pnpm db:restore backups/$STAMP')"
  echo "uploads : copy of public/uploads at backup time"
} > "$DEST/README.txt"

echo "✓ Backup written to backups/$STAMP  (items: $ITEMS)"
