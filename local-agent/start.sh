#!/bin/bash
# Jarvis Local Agent — quick-start script
# Run this once to install deps, then it starts the server.

set -e

cd "$(dirname "$0")"

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo ""
echo "Starting Jarvis Local Agent..."
echo ""
node server.js
