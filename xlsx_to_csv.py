#!/usr/bin/env python3
"""Convert the Alpha Tech supplier status XLSX (Book1.xlsx) into a CSV that the
AlphaTech AI Logistics portal's /api/import/csv endpoint understands.

Column mapping (portal aliases already supported):
  Invoice Number -> reference (required, unique key)
  Supplier Name  -> supplier
  Stock Details   -> description
  Air/Sea         -> mode (air|sea)
  Waybill Number  -> awb_bl
  Container Number-> container_no
  ETA Date        -> eta_arrival
  Status Update   -> notes (prefixed)
  Notes           -> notes (appended)
"""
import zipfile
import xml.etree.ElementTree as ET
import csv
import io
import sys
import os

NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'


def _read_xlsx(path):
    z = zipfile.ZipFile(path)
    strings = []
    if 'xl/sharedStrings.xml' in z.namelist():
        for c in ET.fromstring(z.read('xl/sharedStrings.xml')):
            strings.append(''.join(t.text or '' for t in c.iter(NS + 't')))
    rows = []
    for r in ET.fromstring(z.read('xl/worksheets/sheet1.xml')).iter(NS + 'row'):
        cells = {}
        for c in r.iter(NS + 'c'):
            ref = c.get('r'); t = c.get('t'); v = c.find(NS + 'v')
            val = v.text if v is not None else ''
            if t == 's' and val != '':
                val = strings[int(val)]
            cells[''.join(ch for ch in ref if ch.isalpha())] = val
        rows.append(cells)
    return rows


def _norm(v):
    return (v or '').strip()


JUNK = {
    'TOTAL: 55 RECORD(S)', 'NO MOVEMENT', 'DELAYED', 'ON TIME',
    'DELIVERED/REQUEST DOCUMENTATION', 'NOT SHIPPED YET',
    'ALPHA EMPLOYEES COLLECTING / NOT RECEIVED INTO W/H', "SOLELY FOR KHOSI'S INFO",
}


def to_csv(path):
    raw = _read_xlsx(path)
    header_idx = next((i for i, r in enumerate(raw)
                       if _norm(r.get('B')).lower() == 'supplier name'), None)
    if header_idx is None:
        raise SystemExit('header row not found')
    cols = {'supplier': 'B', 'invoice': 'C', 'status': 'D', 'shipper': 'E',
            'waybill': 'F', 'container': 'G', 'air_sea': 'H', 'eta': 'I',
            'stock_type': 'J', 'stock_details': 'K', 'file_ref': 'L', 'notes': 'M'}
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(['reference', 'supplier', 'description', 'mode', 'awb_bl',
                'container_no', 'eta_arrival', 'notes'])
    count = 0
    for row in raw[header_idx + 1:]:
        supplier = _norm(row.get(cols['supplier']))
        if not supplier or supplier.upper() in JUNK:
            continue
        ref = _norm(row.get(cols['invoice'])) or f'{supplier}-{count}'
        mode = 'air' if _norm(row.get(cols['air_sea'])).lower().startswith('air') else 'sea'
        notes = _norm(row.get(cols['status']))
        extra = _norm(row.get(cols['notes']))
        if extra:
            notes = (notes + ' | ' + extra).strip(' |')
        w.writerow([
            ref,
            supplier,
            _norm(row.get(cols['stock_details'])),
            mode,
            _norm(row.get(cols['waybill'])),
            _norm(row.get(cols['container'])),
            _norm(row.get(cols['eta'])),
            notes,
        ])
        count += 1
    return out.getvalue(), count


if __name__ == '__main__':
    p = sys.argv[1] if len(sys.argv) > 1 else None
    csv_text, n = to_csv(p)
    out_path = sys.argv[2] if len(sys.argv) > 2 else 'shipments_import.csv'
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(csv_text)
    print(f'wrote {out_path} ({n} rows)')
