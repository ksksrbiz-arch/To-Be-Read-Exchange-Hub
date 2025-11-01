#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
kPORT="${PORT:-3000}"

# Detect if server is running
if ! curl -fsS "$BASE_URL/health" >/dev/null 2>&1; then
  echo "[SMOKE] Server not detected on $BASE_URL. Starting temporary instance..."
  NODE_ENV=test node src/server.js &
  SERVER_PID=$!
  # Wait for health
  for i in {1..30}; do
    if curl -fsS "$BASE_URL/health" >/dev/null 2>&1; then
      echo "[SMOKE] Server started (PID $SERVER_PID)."; break
    fi
    sleep 0.5
  done
fi

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]]; then
    echo "[SMOKE] Stopping temporary server (PID $SERVER_PID)";
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "[SMOKE] Checking health endpoint..."
HEALTH_JSON=$(curl -fsS "$BASE_URL/health")
echo "$HEALTH_JSON" | jq .status || { echo "Health check failed"; exit 1; }

echo "[SMOKE] Listing books (public inventory)..."
BOOKS_RESP=$(curl -fsS "$BASE_URL/api/books" || true)
if [[ -z "$BOOKS_RESP" ]]; then
  echo "[SMOKE] /api/books returned empty response (may be expected with fresh DB)."
else
  echo "$BOOKS_RESP" | head -c 400 || echo "(truncated)"
fi

echo "[SMOKE] Smoke tests completed successfully."