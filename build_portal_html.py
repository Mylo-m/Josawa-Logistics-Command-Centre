#!/usr/bin/env python3
"""Build a fully self-contained standalone HTML portal (downloadable version).
Embeds: real shipment data (portal_data.json), the Josawa Logistics logo (base64),
and the signature footer. No server, no fake data, no login. Double-click to open."""
import json, base64, os

BASE = os.path.dirname(os.path.abspath(__file__))
data = json.load(open(os.path.join(BASE, 'portal_data.json'), encoding='utf-8'))
logo_b64 = base64.b64encode(open(os.path.join(BASE, 'static/img/josawa_logo.png'), 'rb').read()).decode()
ship_json = json.dumps(data['shipments'], ensure_ascii=False)

STAGES = ['Booked', 'In Transit', 'Arrived', 'Customs Cleared', 'Delivered']
FLAG_COLORS = {
    'No Movement': '#ed1d24', 'Delayed': '#f5a623', 'On Time': '#ffff00',
    'Delivered/Request Documentation': '#3fb950', 'Not Shipped YET': '#00a6ff',
    'ALPHA EMPLOYEES COLLECTING / NOT RECEIVED INTO W/H': '#808080',
    "SOLELY FOR KHOSI'S INFO": '#bf00ff',
    'Customs Hold': '#ed1d24', 'Missing Docs': '#f5a623', 'Awaiting Slot': '#f5a623',
    'Pending Payment': '#f5a623', 'Overdue': '#ed1d24', 'Ready': '#3fb950',
    'Exception': '#ed1d24', 'Cleared': '#3fb950', 'Held by Forwarder': '#f5a623',
}

html = '''<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Josawa Logistics — Global Command Centre</title>
<style>
:root{--bg:#0a0f1a;--panel:#0d1117;--panel2:#131c26;--line:#1c2530;--txt:#e6edf3;--muted:#9fb0c0;--teal:#0d9488;--red:#ed1d24;--amber:#f5a623;--green:#3fb950}
*{box-sizing:border-box}body{margin:0;font-family:'Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--txt)}
header{display:flex;align-items:center;gap:16px;padding:18px 24px;background:var(--panel);border-bottom:1px solid var(--line)}
.logo{height:46px;border-radius:6px}
.brand{font-size:20px;font-weight:800;color:var(--teal);letter-spacing:1px}
.sub{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:1px}
nav{display:flex;gap:8px;padding:10px 24px;background:var(--panel2);border-bottom:1px solid var(--line);flex-wrap:wrap}
nav button{background:var(--panel);color:var(--txt);border:1px solid var(--line);padding:8px 14px;border-radius:6px;cursor:pointer;font-size:14px}
nav button.active{background:var(--teal);color:#fff;border-color:var(--teal)}
main{padding:24px;max-width:1100px;margin:0 auto}
section{display:none}section.active{display:block}
h1{font-size:20px;margin:0 0 4px}h2{color:var(--teal);margin-top:24px}
.stat-grid{display:flex;gap:12px;flex-wrap:wrap;margin:14px 0}
.stat-card{background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:14px 18px;min-width:120px}
.stat-num{font-size:26px;font-weight:800}.stat-label{font-size:12px;color:var(--muted)}
table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}
th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--muted);font-weight:600;font-size:11px;text-transform:uppercase}
.ship-row{background:var(--panel2);border:1px solid var(--line);border-left:6px solid var(--muted);border-radius:8px;padding:12px 14px;margin-bottom:10px}
.ship-head{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.ship-head strong{font-size:15px}
.badge{background:#0d948833;color:var(--teal);padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700}
.att-tag{font-size:12px;font-weight:700}
.ship-sub{color:var(--muted);font-size:12px;margin:6px 0}
.flag-tag{display:inline-block;padding:3px 8px;border-radius:4px;font-size:11px;margin:2px 4px 2px 0;font-weight:700}
input{background:#0a0f1a;color:var(--txt);border:1px solid var(--line);border-radius:6px;padding:10px;font-size:14px}
button.go{background:var(--teal);color:#fff;border:none;padding:10px 16px;border-radius:6px;cursor:pointer;font-size:14px}
.track-card{background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:20px;margin-top:16px}
.pipe{display:flex;gap:8px;margin:18px 0}
.step{flex:1;text-align:center;background:#0d948822;color:var(--teal);padding:8px;border-radius:6px;font-size:12px;font-weight:700}
.step.off{background:var(--panel);color:var(--muted)}
footer{text-align:center;padding:16px;margin-top:24px;color:var(--muted);font-size:12px;border-top:1px solid var(--line)}
.khosi{font-size:13px;color:var(--muted);margin-bottom:8px}
</style></head>
<body>
<header>
  <img class="logo" src="data:image/png;base64,''' + logo_b64 + '''">
  <div><div class="brand">JOSAWA LOGISTICS</div><div class="sub">Global Command Centre</div></div>
</header>
<nav>
  <button class="active" onclick="show('dash')">📊 Dashboard</button>
  <button onclick="show('ship')">📦 Shipments</button>
  <button onclick="show('track')">🔎 Track an Order</button>
</nav>
<main>
  <section id="dash" class="active">
    <h1>📊 Dashboard</h1>
    <p class="khosi">Welcome. This shows every shipment in one place — what needs attention, what is in transit, and what has arrived.</p>
    <div class="stat-grid" id="stats"></div>
    <h2>🚨 Needs attention</h2>
    <div class="stat-grid" id="attention"></div>
  </section>

  <section id="ship">
    <h1>📦 Shipments</h1>
    <div id="shipList"></div>
  </section>

  <section id="track">
    <h1>🔎 Track an Order</h1>
    <p class="khosi">Type a shipment reference (e.g. PO#US0143100SA) to see its progress.</p>
    <input id="ref" placeholder="Reference number" style="width:300px" onkeyup="if(event.key==='Enter')track()">
    <button class="go" onclick="track()">Track</button>
    <div id="trackResult"></div>
  </section>
</main>
<footer>Built and Designed by Kamil Meer Motala</footer>

<script>
const SHIPS = '''+ship_json+''';
const STAGES = '''+json.dumps(STAGES)+''';
const FLAG_COLORS = '''+json.dumps(FLAG_COLORS)+''';

function show(id){document.querySelectorAll('section').forEach(s=>s.classList.remove('active'));document.getElementById(id).classList.add('active');document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'));event.target.classList.add('active');}

function esc(s){return (s==null?'':String(s)).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

function attentionBucket(s){
  const stage=(s.stage||'Booked');const eta=s.eta_arrival;
  if(stage==='Arrived')return 'Needs Clearing';
  if(stage==='Customs Cleared')return 'Ready for Collection';
  if(stage==='Delivered')return 'Done';
  return 'Later';
}

function renderStats(){
  const total=SHIPS.length;
  const air=SHIPS.filter(s=>s.mode==='air').length;
  const sea=SHIPS.filter(s=>s.mode==='sea').length;
  const stock=SHIPS.filter(s=>(s.description||'').length>0).length;
  document.getElementById('stats').innerHTML=[
    ['Total Shipments',total],['Air',air],['Sea',sea],['Suppliers',new Set(SHIPS.map(s=>s.supplier)).size]
  ].map(c=>`<div class="stat-card"><div class="stat-num">${c[1]}</div><div class="stat-label">${c[0]}</div></div>`).join('');
  const buckets={};SHIPS.forEach(s=>{const b=attentionBucket(s);buckets[b]=(buckets[b]||0)+1;});
  const order=['Needs Clearing','Ready for Collection','Overdue','Arriving Soon','Later','Done'];
  document.getElementById('attention').innerHTML=order.filter(b=>buckets[b]).map(b=>{
    const col=b==='Needs Clearing'||b==='Overdue'?'var(--red)':b==='Ready for Collection'?'var(--amber)':'var(--muted)';
    return `<div class="stat-card" style="border-top:3px solid ${col}"><div class="stat-num">${buckets[b]}</div><div class="stat-label">${b}</div></div>`;}).join('')||'<p class="khosi">Nothing needs action right now.</p>';
}

function renderShipments(){
  document.getElementById('shipList').innerHTML=SHIPS.slice().sort((a,b)=>(a.eta_arrival||'').localeCompare(b.eta_arrival||'')).map(s=>{
    const col=s.mode==='air'?'var(--teal)':'var(--muted)';
    const att=attentionBucket(s);
    const flags=SHIPS; // no separate flags in flat data; show notes as context
    return `<div class="ship-row" style="border-left-color:${col}">
      <div class="ship-head"><strong>${esc(s.reference)}</strong><span class="badge">${(s.mode||'').toUpperCase()}</span><span class="att-tag" style="color:${col}">${att}</span><span class="muted" style="font-size:12px">${esc(s.supplier)}</span></div>
      <div class="ship-sub">${esc(s.description)} • ${esc(s.carrier)} • ${esc(s.stage)} ${s.eta_arrival?(' • ETA '+esc(s.eta_arrival)):''}</div>
      <div class="ship-sub">AWB/B-L: ${esc(s.awb_bl)||'—'} • Container: ${esc(s.container_no)||'—'} • Dest: ${esc(s.destination)||'—'}</div>
      ${s.notes?`<div class="ship-sub" style="color:#cfe">📝 ${esc(s.notes)}</div>`:''}
    </div>`;}).join('');
}

function track(){
  const q=document.getElementById('ref').value.trim().toUpperCase();
  if(!q){document.getElementById('trackResult').innerHTML='<p class="khosi">Enter a reference.</p>';return;}
  const s=SHIPS.find(x=>(x.reference||'').toUpperCase()===q);
  if(!s){document.getElementById('trackResult').innerHTML='<p style="color:var(--red)">No shipment found for that reference.</p>';return;}
  const stageIdx=Math.max(0,STAGES.indexOf(s.stage));
  const pipe=STAGES.map((st,i)=>`<div class="step ${i<=stageIdx?'':'off'}">${st}</div>`).join('');
  document.getElementById('trackResult').innerHTML=`<div class="track-card">
    <h2 style="margin-top:0">${esc(s.reference)}</h2>
    <p class="khosi">${esc(s.description)} • ${esc(s.supplier)}</p>
    <div class="pipe">${pipe}</div>
    <div class="khosi">Carrier: <b style="color:var(--txt)">${esc(s.carrier)||'TBC'}</b> • AWB/B-L: <b style="color:var(--txt)">${esc(s.awb_bl)||'—'}</b></div>
    <div class="khosi">Container: <b style="color:var(--txt)">${esc(s.container_no)||'—'}</b> • Destination: <b style="color:var(--txt)">${esc(s.destination)||'—'}</b></div>
    <div class="khosi">ETA: <b style="color:var(--txt)">${esc(s.eta_arrival)||'To be confirmed'}</b></div>
    ${s.notes?`<div class="khosi">Notes: <b style="color:var(--txt)">${esc(s.notes)}</b></div>`:''}
  </div>`;
}

renderStats();renderShipments();
</script>
</body></html>'''

out = os.path.join(BASE, 'Josawa_Logistics_Portal.html')
open(out, 'w', encoding='utf-8').write(html)
print('wrote', out, len(html), 'bytes')
print('ships embedded:', len(data['shipments']), '| logo embedded:', len(logo_b64), 'b64 chars')
