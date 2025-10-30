#!/bin/bash
# Reusable health polling for local server
# Usage: poll_health <url> <max_attempts> <sleep_seconds>

poll_health() {
  local URL=$1
  local MAX=${2:-10}
  local SLEEP=${3:-2}
  local ATTEMPT=0
  while [ $ATTEMPT -lt $MAX ]; do
    if curl -fs "$URL" >/dev/null 2>&1; then
      echo "✅ Health success: $URL"
      return 0
    fi
    ATTEMPT=$((ATTEMPT + 1))
    sleep $SLEEP
  done
  echo "❌ Health check failed after $MAX attempts: $URL"
  return 1
}
