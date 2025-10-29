#!/bin/bash
# Restart the application server

echo "🔄 Restarting server..."

# Find and kill existing node processes for this app
pkill -f "node src/server.js" 2>/dev/null || true
pkill -f "npm start" 2>/dev/null || true

# Wait a moment
sleep 2

# Start the server in the background
cd /workspaces/To-Be-Read-Exchange-Hub
nohup npm start > /tmp/server.log 2>&1 &

# Wait for server to start
sleep 3

# Test if it's running
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Server restarted successfully!"
    echo "🚀 Running at http://localhost:3000"
else
    echo "❌ Server failed to start. Check /tmp/server.log for errors"
    tail -20 /tmp/server.log
fi
