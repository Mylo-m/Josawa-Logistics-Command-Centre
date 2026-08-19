// AlphaTech AI Logistics — Global Command Centre — Live Map (Leaflet)
'use strict';

const MAP = L.map('map', { worldCopyJump: true }).setView([-29.5, 26.0], 5);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap &copy; CARTO',
  subdomains: 'abcd',
  maxZoom: 19,
}).addTo(MAP);

// --- Map icons: real shapes, not dots ---
const ICONS = {
  flight: L.divIcon({
    className: '',
    html: `<svg width="26" height="26" viewBox="0 0 24 24" style="filter:drop-shadow(0 0 3px #000)">
      <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"
      fill="#ffd400" stroke="#0a0f1a" stroke-width="0.6"/></svg>`,
    iconSize: [26, 26], iconAnchor: [13, 13],
  }),
  // Demo fleet (offline placeholder, no AIS key) — grey, distinct from live flights.
  ship: L.divIcon({
    className: '',
    html: `<svg width="26" height="26" viewBox="0 0 24 24" style="filter:drop-shadow(0 0 3px #000);opacity:.55">
      <path d="M3 14l1.5 4h15L21 14c-2 1-4 1.5-9 1.5S5 15 3 14z" fill="#6b7c8c" stroke="#04110f" stroke-width="0.6"/>
      <path d="M11 3v8M11 4h4l1 2h-5z" fill="#6b7c8c" stroke="#04110f" stroke-width="0.5"/>
      <rect x="10.4" y="11.4" width="1.2" height="2.6" fill="#04110f"/></svg>`,
    iconSize: [26, 26], iconAnchor: [13, 14],
  }),
  port: L.divIcon({
    className: '',
    html: `<span style="display:inline-block;width:13px;height:13px;border-radius:50%;background:#6b7c8c;box-shadow:0 0 6px #6b7c8c;border:2px solid #0a0f1a"></span>`,
    iconSize: [13, 13], iconAnchor: [6, 6],
  }),
  asset: L.divIcon({
    className: '',
    html: `<svg width="24" height="24" viewBox="0 0 24 24" style="filter:drop-shadow(0 0 3px #000)">
      <circle cx="12" cy="12" r="9" fill="#f5a623" stroke="#0a0f1a" stroke-width="1.2"/></svg>`,
    iconSize: [24, 24], iconAnchor: [12, 12],
  }),
};

const vesselLayer = L.layerGroup().addTo(MAP);
const flightLayer = L.layerGroup().addTo(MAP);
const assetLayer = L.layerGroup().addTo(MAP);
const targetLayer = L.layerGroup().addTo(MAP);

function vesselPopup(v) {
  const live = v.live_lat != null;
  return `<div class="ship-pop"><b>${v.name}</b><br>
    Type: ${v.vtype} &middot; ${v.flag}<br>
    Status: ${v.status}${live ? '' : ' <span style="color:#6b7c8c">(offline demo — no live AIS)</span>'}<br>
    Route: ${v.origin} → ${v.destination || v.port}<br>
    Speed: ${v.speed_kn} kn &middot; HDG ${v.heading}<br>
    Transporter: ${v.transporter}<br>
    ETA: ${v.eta_arrival}</div>`;
}

function flightPopup(f) {
  return `<b>${f.callsign}</b><br>${f.origin_country}<br>
    Speed: ${f.speed_kmh} km/h &middot; HDG ${Math.round(f.heading)}<br>
    <span style="color:#0d9488">LIVE (OpenSky)</span>`;
}

function assetPopup(a) {
  return `<b>${a.identifier}</b> (${a.kind})<br>
    → ${a.target_label}<br>
    Progress: ${a.progress_pct}%<br>
    Dist: ${a.distance_km != null ? a.distance_km + ' km' : '—'}<br>
    ETA: ${a.eta_hours != null ? a.eta_hours + ' h' : '—'}<br>
    ${a.border_reached ? '<span style="color:#ed1d24">BORDER REACHED</span>' : a.status}`;
}

async function loadMap() {
  const res = await fetch('/api/map');
  const data = await res.json();
  vesselLayer.clearLayers();
  flightLayer.clearLayers();
  assetLayer.clearLayers();
  targetLayer.clearLayers();

  // SA destination markers (grey)
  for (const [key, t] of Object.entries(data.targets)) {
    L.marker([t.lat, t.lon], { icon: ICONS.port })
      .bindPopup(`<b>${t.label}</b><br>Destination port`).addTo(targetLayer);
  }

  // Fleet vessels (green ship)
  (data.vessels || []).forEach(v => {
    if (v.lat == null || v.lon == null) return;
    L.marker([v.lat, v.lon], { icon: ICONS.ship })
      .bindPopup(vesselPopup(v)).addTo(vesselLayer);
  });

  // Shipments (green ship at linked vessel position)
  (data.shipments || []).forEach(s => {
    const lat = s.live_lat, lon = s.live_lon;
    if (lat == null || lon == null) return;
    L.marker([lat, lon], { icon: ICONS.ship })
      .bindPopup(`<b>${s.reference}</b> (${s.stage})<br>${s.description || ''}<br>` +
                 `Carrier: ${s.carrier || 'TBC'} → ${s.destination}<br>` +
                 `Attention: ${s.attention}${s.eta_arrival ? '<br>ETA: ' + s.eta_arrival : ''}`)
      .addTo(vesselLayer);
  });

  // Live flights (yellow airplane)
  (data.flights || []).forEach(f => {
    if (f.lat == null || f.lon == null) return;
    L.marker([f.lat, f.lon], { icon: ICONS.flight })
      .bindPopup(flightPopup(f)).addTo(flightLayer);
  });

  // Tracked assets (orange circle)
  (data.assets || []).forEach(a => {
    if (a.lat == null || a.lon == null) return;
    L.marker([a.lat, a.lon], { icon: ICONS.asset })
      .bindPopup(assetPopup(a)).addTo(assetLayer);
  });

  const live = data.live_ships ? 'AISStream (live)' : 'offline demo fleet';
  document.getElementById('map-overlay').innerHTML =
    `Live: <b style="color:#ffd400">${(data.flights || []).length}</b> flights (OpenSky) &middot; ` +
    `<b>${(data.vessels || []).length}</b> vessels (<span style="color:#6b7c8c">${live}</span>) &middot; ` +
    `<b>${(data.assets || []).length}</b> tracked assets &middot; ` +
    `<span style="color:#6b7c8c">${new Date(data.updated_at).toLocaleTimeString()}</span>` +
    `<br><span style="color:#6b7c8c;font-size:11px">Legend: ✈ yellow = live flights · 🚢 grey = offline demo fleet (set AISSTREAM_KEY for live AIS)</span>`;
}

loadMap();
setInterval(loadMap, 20000);
