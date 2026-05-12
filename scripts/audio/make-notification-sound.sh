#!/usr/bin/env bash
#
# Regenerates the notification chime used by both web apps.
#
# The sound is synthesised from scratch with ffmpeg's `aevalsrc` filter
# — two sine bursts (B5 -> E6) with exponential decay envelopes. Because
# we generate it from a math expression there is *no* third-party audio
# involved, so there is no license to worry about. Treat the resulting
# mp3 as your own original work.
#
# Requires: ffmpeg (brew install ffmpeg)
#
# Usage:
#   bash scripts/audio/make-notification-sound.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
USER_DST="$ROOT/apps/user-web/public/sounds/notification.mp3"
ADMIN_DST="$ROOT/apps/admin-web/public/sounds/notification.mp3"

mkdir -p "$(dirname "$USER_DST")" "$(dirname "$ADMIN_DST")"

ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "aevalsrc='(0.55*exp(-4.5*t)*sin(2*PI*988.0*t)) + (if(gt(t,0.16), 0.55*exp(-4.5*(t-0.16))*sin(2*PI*1318.5*(t-0.16)), 0))':d=0.85:s=44100" \
  -ac 1 -ar 44100 -b:a 160k -codec:a libmp3lame \
  "$USER_DST"

cp "$USER_DST" "$ADMIN_DST"

echo "Wrote:"
echo "  $USER_DST"
echo "  $ADMIN_DST"
