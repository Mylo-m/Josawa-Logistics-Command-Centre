#!/usr/bin/env python3
"""Rebuild the AlphaTech portal DB to contain ONLY real data:
 - 56 shipments from the Excel supplier status report (no demo/seed shipments)
 - 0 seeded fleet vessels (no 'make believe')
Then export to portal_data.json for the standalone HTML build.
"""
import sqlite3, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from xlsx_to_csv import to_csv

BASE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(BASE, 'data', 'tracker.db')
XLSX = '/home/ordio/.hermes/cache/documents/doc_1671e6129275_Book1.xlsx'

c = sqlite3.connect(DB); c.row_factory = sqlite3.Row

# 1) remove ALL shipments + fake fleet vessels
c.execute('DELETE FROM shipments')
c.execute('DELETE FROM shipment_flags')
c.execute('DELETE FROM shipment_notes')
c.execute('DELETE FROM vessels')
c.commit()

# 2) import the 56 real Excel rows via the converter -> CSV -> insert
csv_text, n = to_csv(XLSX)
import csv, io
reader = csv.reader(io.StringIO(csv_text))
header = next(reader)
idx = {h: i for i, h in enumerate(header)}
ins = 0
for r in reader:
    ref = (r[idx['reference']] or '').strip()
    if not ref:
        continue
    supplier = (r[idx['supplier']] or '').strip()
    desc = (r[idx['description']] or '').strip()
    mode = (r[idx['mode']] or 'sea').strip().lower()
    if mode not in ('sea', 'air'):
        mode = 'sea'
    c.execute('''INSERT INTO shipments
        (reference, supplier, description, mode, carrier, awb_bl, container_no,
         destination, forwarder, forwarder_contact, stage, eta_arrival, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)''',
        (ref, supplier, desc, mode,
         '', (r[idx['awb_bl']] or '').strip(), (r[idx['container_no']] or '').strip(),
         'DURBAN', '', '',
         'Booked', (r[idx['eta_arrival']] or '').strip(),
         (r[idx['notes']] or '').strip()))
    ins += 1
c.commit()

ships = c.execute('SELECT COUNT(*) FROM shipments').fetchone()[0]
vessels = c.execute('SELECT COUNT(*) FROM vessels').fetchone()[0]
c.close()
print(f'inserted: {ins} | shipments total: {ships} | vessels(fake fleet): {vessels}')

# 3) export to JSON for the standalone HTML
import datetime
cc = sqlite3.connect(DB); cc.row_factory = sqlite3.Row
rows = [dict(r) for r in cc.execute('SELECT * FROM shipments')]
cc.close()
out = {'shipments': rows, 'vessel_count': vessels,
       'exported_at': datetime.datetime.now().isoformat()}
with open('portal_data.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print('exported portal_data.json with', len(rows), 'real shipments')
