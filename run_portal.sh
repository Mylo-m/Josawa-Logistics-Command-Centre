#!/usr/bin/env bash
set -e
cd /home/ordio/logistics-tracker-2
# create/use a local venv and ensure flask is installed
if [ ! -x .venv/bin/python ]; then
  uv venv -p 3.11 .venv
fi
uv pip install --python .venv/bin/python3 flask
echo "flask check:"
.venv/bin/python -c "import flask; print(flask.__version__)"
exec .venv/bin/python app.py
