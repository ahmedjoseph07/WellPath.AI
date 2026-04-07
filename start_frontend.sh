#!/bin/bash
# WellPath.AI — Frontend startup script
cd "$(dirname "$0")/frontend"
echo "Starting WellPath.AI frontend on http://localhost:5173 ..."
npm run dev
