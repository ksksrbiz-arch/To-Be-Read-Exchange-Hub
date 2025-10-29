#!/bin/bash

#############################################################################
# Server Stop Script
# 
# Purpose: Gracefully stops the development server
# Usage: ./scripts/stop-server.sh or npm run stop
#############################################################################

echo "🛑 Stopping server..."

# Find all node processes running server.js
PIDS=$(pgrep -f "node src/server.js")

if [ -z "$PIDS" ]; then
    echo "ℹ️  No running server found"
    exit 0
fi

# Kill each process
for PID in $PIDS; do
    echo "   Stopping process $PID..."
    kill $PID 2>/dev/null && echo "   ✓ Process $PID stopped" || echo "   ⚠️  Failed to stop $PID"
done

# Wait a moment and verify
sleep 1
REMAINING=$(pgrep -f "node src/server.js" | wc -l)

if [ "$REMAINING" -eq 0 ]; then
    echo "✅ Server stopped successfully"
else
    echo "⚠️  Some processes may still be running. Try: pkill -9 -f 'node src/server.js'"
fi
