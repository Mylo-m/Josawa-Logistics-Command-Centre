#!/usr/bin/env python3
"""Package the standalone Josawa Logistics Portal into a simple zip.
No server, no install — just unzip and open the HTML file in any browser."""
import zipfile, os
BASE = os.path.dirname(os.path.abspath(__file__))
html = 'Josawa_Logistics_Portal.html'
zipname = 'Josawa_Logistics_Portal.zip'
zp = os.path.join(BASE, zipname)
if os.path.exists(zp):
    os.remove(zp)
with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
    z.write(os.path.join(BASE, html), html)
print('wrote', zp, os.path.getsize(zp), 'bytes')
print('contains:', zipfile.ZipFile(zp).namelist())
