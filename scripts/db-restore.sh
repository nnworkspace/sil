#!/usr/bin/env bash
#
# Restore the wardrobe dev data from a backup folder made by db-backup.
# REPLACES the current database contents and photo files.
#
#   pnpm db:restore backups/<timestamp>   # a specific backup
#   pnpm db:restore                        # the most recent backup
#
# Prompts for confirmation first (it is destructive).

set -euo pipefail

DB_CONTAINER="sil-db"
DB_USER="sil"
DB_NAME="sil"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  echo "✗ Database container '${DB_CONTAINER}' is not running. Start it with: docker compose up -d" >&2
  exit 1
fi

SRC="${1:-}"
if [ -z "$SRC" ]; then
  SRC="$(ls -d "$ROOT"/backups/*/ 2>/dev/null | sort | tail -1 || true)"
  SRC="${SRC%/}"
  [ -n "$SRC" ] && echo "→ No path given; using most recent: ${SRC#"$ROOT"/}"
fi

[ -z "$SRC" ] && { echo "✗ No backup found. Usage: pnpm db:restore backups/<timestamp>" >&2; exit 1; }
[ -f "$SRC/db.dump" ] || { echo "✗ Not a backup folder (no db.dump): $SRC" >&2; exit 1; }

echo "!! This REPLACES the current database and photos with: ${SRC#"$ROOT"/}"
printf "   Continue? [y/N] "
read -r reply
case "$reply" in
  y | Y) ;;
  *) echo "Aborted."; exit 1 ;;
esac

echo "→ Restoring database …"
docker exec -i "$DB_CONTAINER" pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner \
  < "$SRC/db.dump" || echo "  (pg_restore reported warnings, which is normal for --clean; continuing)"

echo "→ Restoring photos …"
rm -rf "$ROOT/public/uploads"
if [ -d "$SRC/uploads" ]; then
  cp -R "$SRC/uploads" "$ROOT/public/uploads"
else
  mkdir -p "$ROOT/public/uploads"
fi

echo "✓ Restored from ${SRC#"$ROOT"/}"
