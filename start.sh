#!/usr/bin/env bash
# ============================================================
#  AlphaTech AI Logistics — macOS / Linux launcher
#  Run:  ./start.sh   (chmod +x start.sh first)
#  It will: find Python, install Flask if missing (first run),
#  start the app, and open it in your browser.
# ============================================================
set -e
APPDIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APPDIR"

# locate python3
if command -v python3 >/dev/null 2>&1; then
  PY=python3
elif command -v python >/dev/null 2>&1; then
  PY=python
else
  echo "[!] Python was not found. Install Python 3 from https://python.org and try again."
  exit 1
fi

echo "Checking dependencies..."
if ! "$PY" -c "import flask" >/dev/null 2>&1; then
  echo "Installing Flask (one-time, needs internet)..."
  "$PY" -m pip install -r "$APPDIR/requirements.txt" --quiet || {
    echo "[!] Could not install Flask. Check your internet connection and try again."
    exit 1
  }
fi

echo "Starting AlphaTech AI Logistics..."
"$PY" "$APPDIR/app.py" &
APP_PID=$!
sleep 4
# open browser (best-effort, per OS)
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open http://localhost:7501 >/dev/null 2>&1 || true
elif command -v open >/dev/null 2>&1; then
  open http://localhost:7501 >/dev/null 2>&1 || true
fi
echo
echo " App is running (PID $APP_PID). Close this terminal to stop it."
echo " Open http://localhost:7501  (or the LAN address shown in the app) on other computers."
echo
wait "$APP_PID"
