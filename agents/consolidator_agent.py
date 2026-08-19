#!/usr/bin/env python3
"""Consolidator Agent — periodically groups real shipments by forwarder to surface
group-clearing opportunities. Runs as a daemon thread alongside the web app.
No seeded/demo data: it only reads the live shipments table."""
import os
import time
import threading
import sqlite3

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'data', 'tracker.db')
INTERVAL = 120  # seconds


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def compute_grouping():
    conn = get_db()
    rows = conn.execute(
        "SELECT forwarder FROM shipments").fetchall()
    conn.close()
    groups = {}
    for r in rows:
        fwd = (r['forwarder'] or '').strip() or '(unassigned)'
        groups[fwd] = groups.get(fwd, 0) + 1
    consolidatable = {f: n for f, n in groups.items() if n > 1}
    return groups, consolidatable


def consolidator_loop():
    while True:
        try:
            groups, consolidatable = compute_grouping()
            if consolidatable:
                summary = ', '.join(f'{f}={n}' for f, n in consolidatable.items())
                print(f'[CONSOLIDATOR] {len(consolidatable)} forwarder(s) with multiple shipments: {summary}')
        except Exception as e:
            print(f'[CONSOLIDATOR] error: {e}')
        time.sleep(INTERVAL)


def start_agent():
    t = threading.Thread(target=consolidator_loop, daemon=True)
    t.start()
    print('[AGENT] Consolidator Agent started')
    return t


if __name__ == '__main__':
    start_agent()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass
