#!/usr/bin/env python3
"""Export real shipment data from the AlphaTech portal DB to JSON for embedding
into a standalone HTML (Khosi's downloadable, zero-setup version)."""
import sqlite3, json, os
BASE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(BASE, 'data', 'tracker.db')
c = sqlite3.connect(DB); c.row_factory = sqlite3.Row
rows = [dict(r) for r in c.execute('SELECT * FROM shipments')]
vessels = c.execute('SELECT COUNT(*) AS n FROM vessels').fetchone()['n']
c.close()
out = {
    'shipments': rows,
    'vessel_count': vessels,
    'exported_at': __import__('datetime').datetime.now().isoformat(),
}
with open('portal_data.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print(f'shipments: {len(rows)} | vessels(fake fleet): {vessels}')
print('sample:', json.dumps(rows[0], ensure_ascii=False)[:200] if rows else 'none')
