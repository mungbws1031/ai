#!/bin/bash
# GULZA CEP panel - install for the current user (macOS).
# Copies com.ruruoni1.gulza into the CEP extensions folder and allows unsigned panels (PlayerDebugMode).
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/Library/Application Support/Adobe/CEP/extensions"
mkdir -p "$DEST"
rm -rf "$DEST/com.ruruoni1.gulza"
cp -R "$HERE/com.ruruoni1.gulza" "$DEST/"
for v in 10 11 12 13 14; do defaults write "com.adobe.CSXS.$v" PlayerDebugMode 1; done
killall cfprefsd 2>/dev/null || true
echo "Installed: $DEST/com.ruruoni1.gulza"
echo "Restart After Effects, then open Window > Extensions > GULZA."
