#!/usr/bin/env bash
set -euo pipefail

DEST="${1:-$PWD/gutenberg-mirror}"
MAIN_DEST="$DEST/gutenberg"
GENERATED_DEST="$DEST/gutenberg-generated"

mkdir -p "$MAIN_DEST" "$GENERATED_DEST"

echo "Mirroring Project Gutenberg main collection to: $MAIN_DEST"
rsync -avHS --timeout 600 --delete gutenberg.pglaf.org::gutenberg "$MAIN_DEST"

echo "Mirroring Project Gutenberg generated collection to: $GENERATED_DEST"
rsync -avHS --timeout 600 --delete gutenberg.pglaf.org::gutenberg-epub "$GENERATED_DEST"

echo "Done."
