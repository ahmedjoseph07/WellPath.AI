#!/bin/bash
# WellPath.AI — Backend startup script
cd "$(dirname "$0")/backend"
echo "Starting WellPath.AI backend on http://localhost:8000 ..."
echo "API docs at http://localhost:8000/docs"
python3 -m uvicorn main:app --reload --port 8000
