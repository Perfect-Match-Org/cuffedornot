#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== CuffedOrNot Matching Script Setup ==="

if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

echo "Installing dependencies..."
source .venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q

echo ""
echo "Setup complete."
echo "To run the matching script:"
echo "  source scripts/.venv/bin/activate"
echo "  python scripts/run_matching.py --env .env.local --dry-run"
echo "  python scripts/run_matching.py --env .env.local"
