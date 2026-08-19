function switchSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(name).classList.add('active');
  const nav = document.querySelector(`.nav-item[data-section="${name}"]`);
  if (nav) nav.classList.add('active');
  if (name === 'assets') loadAssets();
  if (name === 'dashboard') { loadStats(); loadAttention(); loadNetwork(); loadAlerts(); loadFollowup(); }
  if (name === 'shipments') loadShipments();
  if (name === 'digest') loadDigest();
  if (name === 'consolidator') loadConsolidator();
  if (name === 'navis') loadNavis();
  if (name === 'charts') loadCharts();
  if (name === 'suppliers') loadSuppliers();
  if (name === 'documents') loadDocuments();
}

async function api(url, opts) {
  const r = await fetch(url, opts);
  return { status: r.status, body: await r.json() };
}

function renderAsset(a) {
  const border = a.border_reached ? '<div class="border-flag">⚠ BORDER REACHED</div>' : '';
  return `<div class="asset-card">
    <div class="top"><strong>${a.identifier}</strong><span class="badge">${a.kind}</span></div>
    <div style="font-size:12px;color:#9fb0c0">→ ${a.target_label || a.destination}</div>
    <div class="bar"><span style="width:${a.progress_pct || 0}%"></span></div>
    <div class="kv"><span>Progress</span><span>${a.progress_pct || 0}%</span></div>
    <div class="kv"><span>Distance</span><span>${a.distance_km != null ? a.distance_km + ' km' : '—'}</span></div>
    <div class="kv"><span>ETA</span><span>${a.eta_hours != null ? a.eta_hours + ' h' : '—'}</span></div>
    <div class="kv"><span>Status</span><span>${a.status}</span></div>
    <div class="kv"><span>Source</span><span>${a.position_source || '—'}</span></div>
    ${border}
    <div style="text-align:right;margin-top:8px"><span class="del" onclick="delAsset(${a.id})">✕ remove</span></div>
  </div>`;
}

async function loadAssets() {
  const { body } = await api('/api/assets');
  const list = document.getElementById('assets-list');
  if (!body.assets.length) { list.innerHTML = '<p class="muted">No assets yet. Add one above.</p>'; return; }
  list.innerHTML = body.assets.map(renderAsset).join('');
}

async function addAsset() {
  const kind = document.getElementById('asset-kind').value;
  const identifier = document.getElementById('asset-id').value.trim();
  const destination = document.getElementById('asset-dest').value;
  if (!identifier) return alert('Enter a ship name or flight number');
  const res = await api('/api/assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, identifier, destination })
  });
  if (res.status === 409) alert('Already tracking that asset.');
  else if (res.status >= 400) alert('Error: ' + (res.body.error || res.status));
  document.getElementById('asset-id').value = '';
  loadAssets();
}

async function refreshAssets() {
  const r = await api('/api/assets/refresh', { method: 'POST' });
  if (r.body.live_flights != null) console.log('live flights:', r.body.live_flights);
  loadAssets();
}

async function delAsset(id) {
  await api('/api/assets/' + id, { method: 'DELETE' });
  loadAssets();
}

async function loadStats() {
  try {
    const { body } = await api('/api/stats');
    const cards = [
      ['Total shipments', body.shipments_total, '#0d9488', "switchSection('shipments')"],
      ['Air', body.shipments_air, '#0d9488', "loadShipmentsByMode('air');switchSection('shipments')"],
      ['Sea', body.shipments_sea, '#0d9488', "loadShipmentsByMode('sea');switchSection('shipments')"],
      ['Suppliers', body.suppliers_total, '#f5a623', "switchSection('suppliers')"],
      ['Tracked assets', body.tracked_assets, '#0d9488', "switchSection('assets')"],
      ['Border reached', body.border_reached, '#ed1d24', "switchSection('assets')"],
      ['Fleet vessels', body.fleet_vessels, '#0d9488', "switchSection('map')"],
      ['Live flights', body.live_flights, '#f5a623', "switchSection('tracker')"],
    ];
    document.getElementById('stats').innerHTML = cards.map(c =>
      `<div class="stat-card clickable" style="border-top:3px solid ${c[2]}" onclick="${c[3]}">
        <div class="stat-num">${c[1]}</div><div class="stat-label">${c[0]}</div>
        <div class="stat-hint">view →</div></div>`).join('')
      + `<div class="stat-card" style="border-top:3px solid #6b7c8c">
          <div class="stat-num" style="font-size:14px">${body.live_ships}</div>
          <div class="stat-label">Ship source</div></div>`;
  } catch (e) {
    document.getElementById('stats').innerHTML = '<p class="muted">Stats unavailable.</p>';
  }
  const stamp = document.getElementById('updated-stamp');
  if (stamp) stamp.textContent = 'Last updated ' + new Date().toLocaleString();
}

function flightCard(f) {
  const live = f.lat != null || f.live;
  const badge = f.live ? '<span class="badge" style="background:#0d948833;color:#0d9488">LIVE</span>'
                        : '<span class="badge" style="background:#f5a62333;color:#f5a623">DB/FR24</span>';
  return `<div class="result-card">
    <div class="top"><strong>${f.callsign || f.flight}</strong> ${badge}</div>
    <div class="kv"><span>Airline</span><span>${f.airline || f.origin_country || '—'}</span></div>
    <div class="kv"><span>Route</span><span>${f.route || '—'}</span></div>
    <div class="kv"><span>Status</span><span>${f.status}</span></div>
    <div class="kv"><span>Aircraft</span><span>${f.aircraft || '—'}</span></div>
    ${f.lat != null ? `<div class="kv"><span>Position</span><span>${f.lat.toFixed(2)}, ${f.lon.toFixed(2)}</span></div>` : ''}
    ${f.speed_kmh != null ? `<div class="kv"><span>Speed</span><span>${f.speed_kmh} km/h</span></div>` : ''}
  </div>`;
}

function shipCard(s) {
  return `<div class="result-card">
    <div class="top"><strong>${s.name}</strong> <span class="badge" style="background:#0d948833;color:#0d9488">${s.type}</span></div>
    <div class="kv"><span>Flag</span><span>${s.flag}</span></div>
    <div class="kv"><span>Status</span><span>${s.status}</span></div>
    <div class="kv"><span>Route</span><span>${s.origin} → ${s.destination || s.port}</span></div>
    <div class="kv"><span>Transporter</span><span>${s.transporter}</span></div>
    <div class="kv"><span>Group</span><span>${s.group_code}</span></div>
    <div class="kv"><span>Speed</span><span>${s.speed_kn} kn</span></div>
    <div class="kv"><span>ETA</span><span>${s.eta}</span></div>
    <div class="kv"><span>IMO</span><span>${s.imo}</span></div>
  </div>`;
}

async function trackFlight() {
  const f = document.getElementById('flight-no').value.trim();
  if (!f) return;
  const { body } = await api('/api/track/flight?flight=' + encodeURIComponent(f));
  document.getElementById('track-result').innerHTML =
    body.flights.map(flightCard).join('') ||
    '<p class="muted">No results.</p>';
}

async function trackShipping() {
  const q = document.getElementById('ship-q').value.trim();
  if (!q) return;
  const { body } = await api('/api/track/shipping?q=' + encodeURIComponent(q));
  document.getElementById('track-result').innerHTML =
    body.shipments.map(shipCard).join('') ||
    '<p class="muted">No results.</p>';
}

document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  if (location.hash === '#assets') switchSection('assets');
  if (location.hash === '#tracker') switchSection('tracker');
  if (location.hash === '#shipments') switchSection('shipments');
});

// --- Shipments (clearing & forwarding pipeline) ---
async function loadShipments(filter) {
  const url = '/api/shipments' + (filter ? '?attention=' + encodeURIComponent(filter) : '');
  const { body } = await api(url);
  renderShipFilters(body.buckets || {});
  const list = document.getElementById('shipments-list');
  if (!body.shipments.length) { list.innerHTML = '<p class="muted">No shipments yet. Add one above.</p>'; return; }
  list.innerHTML = body.shipments.map(renderShipmentRow).join('');
}

async function loadShipmentsByMode(mode) {
  const { body } = await api('/api/shipments');
  const filtered = body.shipments.filter(s => (s.mode || '').toLowerCase() === mode);
  document.getElementById('ship-filters').innerHTML =
    `<span class="chip">Mode: ${mode.toUpperCase()} (${filtered.length})</span>`;
  const list = document.getElementById('shipments-list');
  if (!filtered.length) { list.innerHTML = `<p class="muted">No ${mode} shipments.</p>`; return; }
  list.innerHTML = filtered.map(renderShipmentRow).join('');
}

async function importXlsx() {
  const inp = document.getElementById('xlsx-file');
  const f = inp.files[0];
  if (!f) return;
  const fd = new FormData();
  fd.append('file', f);
  const r = await fetch('/api/import/xlsx', { method: 'POST', body: fd });
  const res = await r.json();
  inp.value = '';
  alert(res.message || res.error || ('Status ' + r.status));
  loadShipments();
}

function renderShipFilters(buckets) {
  const order = ['Needs Clearing', 'Ready for Collection', 'Overdue', 'Arriving Soon', 'Later', 'Done'];
  const chips = ['All'].concat(order.filter(b => buckets[b])).map(b => {
    const n = b === 'All' ? '' : ` (${buckets[b]})`;
    return `<span class="chip" onclick="loadShipments(${b === 'All' ? 'null' : `'${b}'`})">${b}${n}</span>`;
  });
  document.getElementById('ship-filters').innerHTML = chips.join('');
}

function fmtCountdown(s) {
  if (s.eta_countdown_hours == null) return 'ETA TBC';
  const h = s.eta_countdown_hours;
  if (h < 0) return `overdue ${Math.abs(h).toFixed(0)}h`;
  if (h < 24) return `in ${h.toFixed(0)}h`;
  return `in ${(h / 24).toFixed(1)}d`;
}

const ATT_COLORS = {
  'Needs Clearing': '#ed1d24', 'Ready for Collection': '#f5a623', 'Overdue': '#ed1d24',
  'Arriving Soon': '#0d9488', 'Later': '#6b7c8c', 'Done': '#3fb950'
};

function renderShipmentRow(s) {
  const c = ATT_COLORS[s.attention] || '#6b7c8c';
  const stages = s.stages || ['Booked', 'In Transit', 'Arrived', 'Customs Cleared', 'Delivered'];
  const dots = stages.map((st, i) =>
    `<span class="stage-dot ${i <= s.stage_index ? 'on' : ''}" title="${st}"></span>`).join('');
  const next = s.stage_index < stages.length - 1 ? stages[s.stage_index + 1] : null;
  const flags = (s.flags || []).map(f =>
    `<span class="flag-tag" style="background:${FLAG_COLORS[f] || '#6b7c8c'}22;color:${FLAG_COLORS[f] || '#9fb0c0'};border:1px solid ${FLAG_COLORS[f] || '#6b7c8c'}">${f}</span>`).join(' ');
  const slot = s.slot_datetime
    ? `<span class="slot-tag slot-${s.slot_status}">${s.slot_type || 'Slot'}: ${s.slot_datetime}${s.slot_ref ? ' (' + s.slot_ref + ')' : ''} · ${s.slot_status}</span>`
    : '';
  const inv = s.commercial_invoice_no ? ` · <span class="ci-no">CI: ${s.commercial_invoice_no}</span>` : '';
  const stockRows = (s.incoming_stock || '').split('\n').map(l => l.trim()).filter(Boolean)
    .map(l => { const [item, qty] = l.split('|'); return `<tr><td>${item || l}</td><td>${qty || ''}</td></tr>`; }).join('')
    || (s.description ? `<tr><td>${s.description}</td><td></td></tr>` : '');
  return `<div class="ship-row" style="border-left:4px solid ${c}">
    <div class="ship-head">
      <strong>${s.reference}</strong>${inv}
      <span class="badge" style="background:#0d948833;color:#0d9488">${s.mode.toUpperCase()}</span>
      <span class="att-tag" style="color:${c}">${s.attention}</span>
      <span class="muted" style="font-size:12px">${s.supplier || ''}</span>
      <span class="link" style="margin-left:auto" onclick="toggleDetails(${s.id})">📂 details (${s.notes_count||0} notes)</span>
    </div>
    <div class="ship-sub">${s.carrier || 'carrier TBC'} · ${s.stage}${s.eta_arrival ? ` · ETA ${s.eta_arrival} (${fmtCountdown(s)})` : ''}</div>
    ${flags ? `<div class="flags-row">${flags}</div>` : ''}
    ${slot ? `<div class="flags-row">${slot}</div>` : ''}
    <div class="ship-tables">
      ${(s.incoming_stock || s.description) ? `<div class="ship-table">
        <div class="st-title">📦 Incoming stock</div>
        <table><thead><tr><th>Item</th><th>Qty</th></tr></thead><tbody>${stockRows}</tbody></table>
      </div>` : ''}
      ${(s.airport || s.eta_arrival) ? `<div class="ship-table">
        <div class="st-title">✈️ Flight / arrival</div>
        <table>
          ${s.airport ? `<tr><td>Airport</td><td>${s.airport}</td></tr>` : ''}
          ${s.eta_arrival ? `<tr><td>ETA</td><td>${s.eta_arrival}</td></tr>` : ''}
          ${s.awb_bl ? `<tr><td>HAWB/MAWB</td><td>${s.awb_bl}</td></tr>` : ''}
        </table>
      </div>` : ''}
      ${(s.port || s.ship || s.berth) ? `<div class="ship-table">
        <div class="st-title">🚢 Port / vessel</div>
        <table>
          ${s.port ? `<tr><td>Port</td><td>${s.port}</td></tr>` : ''}
          ${s.ship || s.carrier ? `<tr><td>Vessel</td><td>${s.ship || s.carrier}</td></tr>` : ''}
          ${s.berth ? `<tr><td>Berth</td><td>${s.berth}</td></tr>` : ''}
          ${s.container_no ? `<tr><td>Container</td><td>${s.container_no}</td></tr>` : ''}
        </table>
      </div>` : ''}
      ${(s.po_number || s.freight_file_no) ? `<div class="ship-table">
        <div class="st-title">📑 References</div>
        <table>
          ${s.po_number ? `<tr><td>PO number</td><td>${s.po_number}</td></tr>` : ''}
          ${s.freight_file_no ? `<tr><td>Freight file #</td><td>${s.freight_file_no}</td></tr>` : ''}
        </table>
      </div>` : ''}
    </div>
    <div class="stages">${dots}</div>
    <div class="ship-actions">
      ${next ? `<button onclick="advanceStage(${s.id})">▶ ${next}</button>` : '<span class="muted">complete</span>'}
      <span class="link" onclick="copyMessage(${s.id})">📋 status msg</span>
      <span class="link" onclick="emailMessage(${s.id})">✉️ email fwd</span>
      <span class="link" onclick="openShipDocs(${s.id})">📁 docs</span>
      <span class="del" onclick="delShipment(${s.id})">✕</span>
    </div>
    ${s.forwarder ? `<div class="muted" style="font-size:11px;margin-top:4px">Fwd: ${s.forwarder} ${s.forwarder_contact ? '(' + s.forwarder_contact + ')' : ''}</div>` : ''}
    <div id="details-${s.id}" class="ship-details" style="display:none"></div>
  </div>`;
}

async function toggleDetails(id) {
  const el = document.getElementById('details-' + id);
  if (el.style.display !== 'none') { el.style.display = 'none'; return; }
  el.style.display = 'block';
  await loadDetails(id);
}

async function loadDetails(id) {
  const el = document.getElementById('details-' + id);
  const flagsCat = await api('/api/flags');
  const flags = await api('/api/shipments/' + id + '/flags');
  const notes = await api('/api/shipments/' + id + '/notes');
  const flagBtns = flagsCat.body.flags.map(f => {
    const on = flags.body.flags.includes(f);
    const col = flagsCat.body.colors[f] || '#6b7c8c';
    return `<span class="flag-toggle ${on ? 'on' : ''}" style="${on ? 'background:' + col + ';color:#04110f;border-color:' + col : ''}" onclick="toggleFlag(${id},'${f}')">${f}</span>`;
  }).join(' ');
  const noteList = notes.body.notes.map(n =>
    `<div class="note"><span class="muted" style="font-size:11px">${n.created_at} · ${n.author}</span><div>${escapeHtml(n.note)}</div></div>`).join('') || '<p class="muted">No notes yet.</p>';
  el.innerHTML = `
    <div class="detail-block">
      <div class="detail-title">🚩 Flags</div>
      <div class="flag-toggles">${flagBtns}</div>
    </div>
    <div class="detail-block">
      <div class="detail-title">🗓️ Booking slot (harbour / flight cutoff)</div>
      <div class="add-form" style="margin-top:6px">
        <select id="slot-type-${id}"><option value="">—</option><option value="Harbour">Harbour</option><option value="Flight">Flight</option><option value="Other">Other</option></select>
        <input id="slot-dt-${id}" type="datetime-local" title="Slot date/time">
        <input id="slot-ref-${id}" placeholder="Booking ref / slot #" style="max-width:160px">
        <button onclick="saveSlot(${id})">Save slot</button>
      </div>
    </div>
    <div class="detail-block">
      <div class="detail-title">📝 Notes (${notes.body.notes.length})</div>
      <div class="notes-list">${noteList}</div>
      <textarea id="note-${id}" placeholder="Add a note…" rows="2" style="width:100%;margin-top:6px;background:#0a0f1a;color:#e6edf3;border:1px solid #1c2530;border-radius:6px;padding:8px"></textarea>
      <button style="margin-top:6px" onclick="addNote(${id})">Add note</button>
    </div>
    <div class="detail-block">
      <div class="detail-title">📁 Documents</div>
      <div id="docs-${id}"><i class="muted">loading…</i></div>
    </div>`;
  loadShipDocsInline(id);
}

async function loadShipDocsInline(id) {
  const el = document.getElementById('docs-' + id);
  if (!el) return;
  const { body } = await api('/api/shipments/' + id + '/documents');
  const docs = body.documents || [];
  const types = body.doc_types || [];
  const rows = docs.map(d => `<div class="doc-row">
      <span class="doc-type-badge">${d.doc_type}</span>
      <a href="/api/documents/${d.id}/download" target="_blank">${d.filename}</a>
      <span class="muted" style="font-size:11px">${d.size ? (d.size/1024).toFixed(0)+' KB' : ''}</span>
      <span class="del" onclick="delDoc(${d.id})">✕</span>
    </div>`).join('') || '<p class="muted">No documents yet.</p>';
  el.innerHTML = `<div class="docs-upload">
      <select id="doc-type-inline-${id}">${types.map(t => `<option>${t}</option>`).join('')}</select>
      <input id="doc-file-inline-${id}" type="file">
      <button onclick="uploadDocInline(${id})">⬆ Upload</button>
    </div>${rows}`;
}
async function uploadDocInline(id) {
  const inp = document.getElementById('doc-file-inline-' + id);
  const f = inp.files[0];
  if (!f) return alert('Choose a file');
  const dt = document.getElementById('doc-type-inline-' + id).value;
  const fd = new FormData();
  fd.append('file', f);
  fd.append('doc_type', dt);
  await fetch('/api/shipments/' + id + '/documents', { method: 'POST', body: fd });
  inp.value = '';
  loadShipDocsInline(id);
}
async function delDoc(did) {
  if (!confirm('Delete this document?')) return;
  await api('/api/documents/' + did, { method: 'DELETE' });
  // refresh whichever doc list is visible
  const open = document.querySelector('.ship-details[style*="block"]');
  if (open && open.id && open.id.startsWith('docs-')) loadShipDocsInline(open.id.split('-')[1]);
  if (document.getElementById('documents-list')) loadDocuments();
}

async function toggleFlag(id, flag) {
  const { body } = await api('/api/shipments/' + id + '/flags');
  const on = body.flags.includes(flag);
  await api('/api/shipments/' + id + '/flags', {
    method: on ? 'DELETE' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flag })
  });
  await loadDetails(id);
  loadShipments();
}

async function saveSlot(id) {
  const type = document.getElementById('slot-type-' + id).value;
  const dt = document.getElementById('slot-dt-' + id).value;
  const ref = document.getElementById('slot-ref-' + id).value.trim();
  await api('/api/shipments/' + id + '/slot', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slot_type: type || null, slot_datetime: dt ? dt.replace('T', ' ') + ':00' : null, slot_ref: ref || null })
  });
  await loadDetails(id);
  loadShipments();
}

async function addNote(id) {
  const note = document.getElementById('note-' + id).value.trim();
  if (!note) return;
  await api('/api/shipments/' + id + '/notes', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note })
  });
  document.getElementById('note-' + id).value = '';
  await loadDetails(id);
}

function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function addShipment() {
  const g = id => document.getElementById(id).value.trim();
  const ref = g('shp-ref');
  if (!ref) return alert('Enter a reference');
  const eta = g('shp-eta');
  const payload = {
    reference: ref, supplier: g('shp-supplier'), description: g('shp-desc'),
    mode: document.getElementById('shp-mode').value, carrier: g('shp-carrier'),
    awb_bl: g('shp-bl'), container_no: g('shp-container'),
    destination: document.getElementById('shp-dest').value, forwarder: g('shp-fwd'),
    forwarder_contact: g('shp-contact'),
    eta_arrival: eta ? eta.replace('T', ' ') + ':00' : null,
    commercial_invoice_no: g('shp-ci'), po_number: g('shp-po'),
    freight_file_no: g('shp-freight'), airport: g('shp-airport'),
    port: g('shp-port'), berth: g('shp-berth'), ship: g('shp-ship'),
    incoming_stock: g('shp-stock'),
  };
  const res = await api('/api/shipments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (res.status >= 400) alert('Error: ' + (res.body.error || res.status));
  ['shp-ref','shp-supplier','shp-desc','shp-carrier','shp-bl','shp-container','shp-fwd','shp-contact','shp-eta',
   'shp-ci','shp-po','shp-freight','shp-airport','shp-port','shp-berth','shp-ship','shp-stock']
    .forEach(id => document.getElementById(id).value = '');
  loadShipments();
}

async function advanceStage(id) {
  const { body } = await api('/api/shipments');
  const s = body.shipments.find(x => x.id === id);
  if (!s) return;
  const stages = s.stages;
  const next = stages[s.stage_index + 1];
  if (!next) return;
  await api('/api/shipments/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: next }) });
  loadShipments();
}

async function delShipment(id) {
  if (!confirm('Delete this shipment?')) return;
  await api('/api/shipments/' + id, { method: 'DELETE' });
  loadShipments();
}

async function copyMessage(id) {
  const { body } = await api('/api/shipments/' + id + '/message');
  navigator.clipboard.writeText(body.message).then(
    () => alert('Status message copied to clipboard for ' + (body.forwarder || 'forwarder')),
    () => prompt('Copy this message:', body.message)
  );
}

async function emailMessage(id) {
  const { body } = await api('/api/shipments/' + id + '/message');
  const subj = encodeURIComponent('Status check — AlphaTech AI Logistics shipment ' + body.shipment);
  const mailto = 'mailto:' + (body.contact || '') + '?subject=' + subj + '&body=' + encodeURIComponent(body.message);
  window.open(mailto, '_blank');
}

// --- LAN URL hint (share on local network) ---
async function loadNetwork() {
  try {
    const { body } = await api('/api/network');
    const el = document.getElementById('lan-hint');
    if (el) el.innerHTML = `Share on your network: <code>${body.lan_url}</code> (other computers on the same WiFi/office)`;
  } catch (e) { /* ignore */ }
}
// --- Attention panel on dashboard ---
async function loadAttention() {
  const { body } = await api('/api/shipments');
  const el = document.getElementById('attention');
  const buckets = body.buckets || {};
  const actBuckets = ['Needs Clearing', 'Ready for Collection', 'Overdue', 'Arriving Soon'];
  const active = actBuckets.filter(b => buckets[b]);
  // also surface flagged + slot-due items
  const flagged = body.shipments.filter(s => (s.flags || []).length && !['Cleared','Ready'].includes(s.flags[0]) || (s.flags||[]).some(f=>['Customs Hold','Missing Docs','Awaiting Slot','Pending Payment','Overdue','Exception','Held by Forwarder'].includes(f)));
  const slotDue = body.shipments.filter(s => s.slot_status === 'due-soon' || s.slot_status === 'missed');
  const extra = [];
  if (flagged.length) extra.push(['Flagged', flagged.length, '#ed1d24']);
  if (slotDue.length) extra.push(['Slot due/missed', slotDue.length, '#f5a623']);
  if (!active.length && !extra.length) { el.innerHTML = '<p class="muted">Nothing needs action right now. ✅</p>'; return; }
  let html = active.map(b => {
    const c = ATT_COLORS[b] || '#6b7c8c';
    return `<div class="att-card" style="border-top:3px solid ${c}">
      <div class="att-num">${buckets[b]}</div><div class="att-label">${b}</div>
      <div class="link" onclick="switchSection('shipments')">view →</div></div>`;
  }).join('');
  html += extra.map(([b, n, c]) =>
    `<div class="att-card" style="border-top:3px solid ${c}">
      <div class="att-num">${n}</div><div class="att-label">${b}</div>
      <div class="link" onclick="switchSection('shipments')">view →</div></div>`).join('');
  el.innerHTML = html;
}

// --- Alerts & Updates feed (clickable orange alerts) ---
const ALERT_KIND_COLORS = {
  'SAPS': '#ed1d24', 'Clearance': '#f5a623', 'Flight Delay': '#0d9488',
  'Shipment Delay': '#0d9488', 'Other': '#6b7c8c'
};
async function loadAlerts() {
  const el = document.getElementById('alerts-panel');
  if (!el) return;
  try {
    const { body } = await api('/api/alerts');
    if (!body.alerts.length) { el.innerHTML = '<p class="muted">No alerts right now. ✅</p>'; return; }
    el.innerHTML = body.alerts.map(a => {
      const c = ALERT_KIND_COLORS[a.kind] || '#6b7c8c';
      const resolved = a.resolved ? 'resolved' : '';
      return `<div class="alert-card ${resolved}" style="border-left:4px solid ${c}">
        <div class="alert-head" onclick="toggleAlert(${a.id})">
          <span class="alert-kind" style="background:${c}22;color:${c}">${a.kind}</span>
          <strong>${a.title}</strong>
          <span class="muted" style="font-size:11px">${a.created_at || ''}</span>
          ${a.resolved ? '<span class="badge" style="background:#3fb95033;color:#3fb950">resolved</span>' : ''}
          <span class="link" style="margin-left:auto">details ▾</span>
        </div>
        <div id="alert-${a.id}" class="alert-body" style="display:none"></div>
      </div>`;
    }).join('');
  } catch (e) { el.innerHTML = '<p class="muted">Alerts unavailable.</p>'; }
}
async function toggleAlert(id) {
  const el = document.getElementById('alert-' + id);
  if (el.style.display !== 'none') { el.style.display = 'none'; return; }
  el.style.display = 'block';
  const { body } = await api('/api/alerts');
  const a = body.alerts.find(x => x.id === id);
  if (!a) return;
  // Pull linked shipment (forwarder details, waybill, supplier) if a shipment_ref exists
  let linkHtml = '<p class="muted">No linked shipment.</p>';
  if (a.shipment_ref) {
    const shp = await api('/api/shipments');
    const s = (shp.body.shipments || []).find(x => x.reference === a.shipment_ref);
    if (s) {
      linkHtml = `<div class="alert-detail">
        <div class="kv"><span>Reference</span><span>${s.reference}</span></div>
        <div class="kv"><span>Supplier</span><span>${s.supplier || '—'}</span></div>
        <div class="kv"><span>Carrier / forwarder</span><span>${s.carrier || '—'} · ${s.forwarder || '—'}</span></div>
        <div class="kv"><span>Forwarder contact</span><span>${s.forwarder_contact || '—'}</span></div>
        <div class="kv"><span>Waybill (AWB/B-L)</span><span>${s.awb_bl || s.container_no || 'TBC'}</span></div>
        <div class="kv"><span>Stage</span><span>${s.stage}</span></div>
        <div class="kv"><span>ETA</span><span>${s.eta_arrival || 'TBC'}</span></div>
      </div>`;
    }
  }
  el.innerHTML = `<p>${a.message || ''}</p><h4 style="margin:8px 0 4px;color:#0d9488">Linked shipment</h4>${linkHtml}
    <div style="margin-top:8px"><button onclick="resolveAlert(${a.id})">${a.resolved ? 'Mark unresolved' : 'Mark resolved'}</button></div>`;
}
async function resolveAlert(id) {
  await api('/api/alerts/' + id, { method: 'POST' });
  loadAlerts();
}

// --- Follow-up needed (shipments not ready + follow-up date) ---
async function loadFollowup() {
  const el = document.getElementById('followup');
  if (!el) return;
  try {
    const { body } = await api('/api/shipments');
    const ships = body.shipments || [];
    const now = Date.now();
    // "not ready" = anything before 'Delivered'
    const pending = ships.filter(s => (s.stage || '') !== 'Delivered');
    if (!pending.length) { el.innerHTML = '<p class="muted">Everything is delivered. ✅</p>'; return; }
    el.innerHTML = pending.map(s => {
      const eta = s.eta_arrival ? new Date(s.eta_arrival.replace(' ', 'T')) : null;
      const etaStr = eta ? eta.toLocaleDateString() : 'TBC';
      const overdue = eta && eta.getTime() < now;
      const col = overdue ? '#ed1d24' : '#f5a623';
      return `<div class="followup-card" style="border-left:4px solid ${col}">
        <div class="top"><strong>${s.reference}</strong> <span class="muted" style="font-size:12px">${s.supplier || ''}</span></div>
        <div class="kv"><span>Stage</span><span>${s.stage}</span></div>
        <div class="kv"><span>Follow-up by</span><span style="color:${col}">${etaStr}${overdue ? ' (overdue)' : ''}</span></div>
        <div class="kv"><span>Forwarder</span><span>${s.forwarder || '—'}</span></div>
        <div class="link" onclick="switchSection('shipments')">open in shipments →</div>
      </div>`;
    }).join('');
  } catch (e) { el.innerHTML = '<p class="muted">Follow-up list unavailable.</p>'; }
}

// --- Suppliers master list ---
async function loadSuppliers() {
  const el = document.getElementById('suppliers-list');
  if (!el) return;
  try {
    const { body } = await api('/api/suppliers');
    if (!body.suppliers.length) { el.innerHTML = '<p class="muted">No suppliers yet. Add one above.</p>'; return; }
    el.innerHTML = body.suppliers.map(s => `
      <div class="supplier-card">
        <div class="ship-head"><strong>${s.name}</strong>
          <span class="del" onclick="delSupplier(${s.id})">✕</span></div>
        <div class="muted" style="font-size:12px">${s.city || ''}${s.country ? ', ' + s.country : ''}</div>
        <div class="link" onclick="toggleSupplier(${s.id})">📂 details</div>
        <div id="sup-${s.id}" class="ship-details" style="display:none"></div>
      </div>`).join('');
  } catch (e) { el.innerHTML = '<p class="muted">Suppliers unavailable.</p>'; }
}
async function toggleSupplier(id) {
  const el = document.getElementById('sup-' + id);
  if (el.style.display !== 'none') { el.style.display = 'none'; return; }
  el.style.display = 'block';
  const { body } = await api('/api/suppliers');
  const s = body.suppliers.find(x => x.id === id);
  if (!s) return;
  // count linked shipments
  const shp = await api('/api/shipments');
  const linked = (shp.body.shipments || []).filter(x => (x.supplier || '') === s.name).length;
  el.innerHTML = `<div class="alert-detail">
    <div class="kv"><span>Contact</span><span>${s.contact_name || '—'}</span></div>
    <div class="kv"><span>Email</span><span>${s.email || '—'}</span></div>
    <div class="kv"><span>Phone</span><span>${s.phone || '—'}</span></div>
    <div class="kv"><span>City / Country</span><span>${s.city || '—'}${s.country ? ', ' + s.country : ''}</span></div>
    <div class="kv"><span>Products</span><span>${s.products || '—'}</span></div>
    <div class="kv"><span>Linked shipments</span><span>${linked}</span></div>
  </div>`;
}
async function addSupplier() {
  const g = id => document.getElementById(id).value.trim();
  const name = g('sup-name');
  if (!name) return alert('Enter a supplier name');
  await api('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, contact_name: g('sup-contact'), email: g('sup-email'),
      phone: g('sup-phone'), city: g('sup-city'), country: g('sup-country'),
      products: g('sup-products') }) });
  ['sup-name','sup-contact','sup-email','sup-phone','sup-city','sup-country','sup-products']
    .forEach(id => document.getElementById(id).value = '');
  loadSuppliers();
}
async function delSupplier(id) {
  if (!confirm('Delete this supplier?')) return;
  await api('/api/suppliers/' + id, { method: 'DELETE' });
  loadSuppliers();
}

// --- Documents tab (upload per shipment) ---
async function loadDocuments() {
  const el = document.getElementById('documents-list');
  if (!el) return;
  const { body } = await api('/api/shipments');
  const ships = (body.shipments || []);
  const sel = document.getElementById('doc-ship');
  sel.innerHTML = ships.map(s => `<option value="${s.id}">${s.reference} — ${s.supplier || ''}</option>`).join('');
  const types = ['Proforma Invoice', 'Supplier PO', 'Commercial Invoice', 'Packing List',
    'HAWB', 'MAWB', 'SAD500', 'SAD501', 'SAD507', 'Customs Worksheet',
    'EDI / Release Doc', 'Clearing Instruction', 'POA', 'Other'];
  document.getElementById('doc-type').innerHTML = types.map(t => `<option>${t}</option>`).join('');
  // list all docs grouped by shipment
  let html = '';
  for (const s of ships) {
    const d = await api('/api/shipments/' + s.id + '/documents');
    const docs = d.body.documents || [];
    if (!docs.length) continue;
    html += `<div class="doc-group"><h3>${s.reference} <span class="muted" style="font-size:12px">${s.supplier || ''}</span></h3>`;
    html += docs.map(x => `<div class="doc-row">
        <span class="doc-type-badge">${x.doc_type}</span>
        <a href="/api/documents/${x.id}/download" target="_blank">${x.filename}</a>
        <span class="muted" style="font-size:11px">${x.size ? (x.size/1024).toFixed(0)+' KB' : ''}</span>
        <span class="del" onclick="delDoc(${x.id})">✕</span>
      </div>`).join('');
    html += '</div>';
  }
  el.innerHTML = html || '<p class="muted">No documents uploaded yet.</p>';
}
async function uploadDoc() {
  const sid = document.getElementById('doc-ship').value;
  const dt = document.getElementById('doc-type').value;
  const f = document.getElementById('doc-file').files[0];
  if (!sid) return alert('Select a shipment');
  if (!f) return alert('Choose a file');
  const fd = new FormData();
  fd.append('file', f);
  fd.append('doc_type', dt);
  const r = await fetch('/api/shipments/' + sid + '/documents', { method: 'POST', body: fd });
  const res = await r.json();
  document.getElementById('doc-result').textContent = r.ok ? 'Uploaded ' + (res.document?.filename || '') : ('Error: ' + (res.error || r.status));
  document.getElementById('doc-file').value = '';
  loadDocuments();
}

// --- CRM autofill (TASCAM SA CRM) ---
let crmTimer = null;
async function crmSuggest(fieldId, kind) {
  const val = document.getElementById(fieldId).value.trim();
  const listEl = document.getElementById('crm-' + kind + '-list');
  if (val.length < 2) { listEl.innerHTML = ''; return; }
  clearTimeout(crmTimer);
  crmTimer = setTimeout(async () => {
    const { body } = await api('/api/crm/lookup?q=' + encodeURIComponent(val));
    const items = body.results.slice(0, 6);
    if (!items.length) { listEl.innerHTML = ''; return; }
    listEl.innerHTML = items.map(r => {
      const label = kind === 'supplier' ? r.company : (r.company + (r.contact_name ? ' — ' + r.contact_name : ''));
      return `<div class="crm-item" onclick="applyCrm('${fieldId}','${kind}',${JSON.stringify(r).replace(/"/g, '&quot;')})">${label}</div>`;
    }).join('');
  }, 250);
}

function applyCrm(fieldId, kind, r) {
  document.getElementById(fieldId).value = r.company;
  if (kind === 'supplier') {
    if (r.contact_name) {
      // put contact name into description hint? keep simple: fill contact email on forwarder side
    }
  } else {
    // forwarder picked -> fill contact email too
    if (r.email) document.getElementById('shp-contact').value = r.email;
  }
  document.getElementById('crm-' + kind + '-list').innerHTML = '';
}

// --- CSV import ---
function showImport() {
  const b = document.getElementById('import-box');
  b.style.display = b.style.display === 'none' ? 'block' : 'none';
}
async function importCsv() {
  const text = document.getElementById('csv-text').value;
  const { body } = await api('/api/import/csv', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csv: text }) });
  document.getElementById('import-result').textContent = body.message || body.error || '';
  loadShipments();
}

// --- Alerts bell + SSE live toasts ---
let sse = null;
function connectAlerts() {
  if (sse) return;
  sse = new EventSource('/sse');
  sse.addEventListener('alert', (e) => {
    const n = JSON.parse(e.data);
    toast(n.message, n.kind);
    bumpBell();
  });
}
function bumpBell() {
  const c = document.getElementById('bell-count');
  c.textContent = (parseInt(c.textContent || '0', 10) + 1);
  c.style.display = 'inline-block';
}
function toast(msg, kind) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = (kind ? '🔔 ' : '') + msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 50);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 6000);
}
function toggleNotif() {
  const d = document.getElementById('notif-dropdown');
  if (d.style.display === 'none') {
    loadNotifications();
    d.style.display = 'block';
  } else {
    d.style.display = 'none';
  }
}
async function loadNotifications() {
  const { body } = await api('/api/notifications');
  const d = document.getElementById('notif-dropdown');
  if (!body.notifications.length) { d.innerHTML = '<div class="notif-item muted">No alerts yet.</div>'; return; }
  d.innerHTML = body.notifications.slice(0, 15).map(n =>
    `<div class="notif-item"><span class="notif-kind">${n.kind}</span> ${n.message}<br><span class="muted" style="font-size:11px">${n.created_at}</span></div>`).join('');
  document.getElementById('bell-count').textContent = '0';
  document.getElementById('bell-count').style.display = 'none';
}

// --- Digest & Alerts tab ---
async function loadDigest() {
  const { body } = await api('/api/digest');
  document.getElementById('digest-preview').textContent = body.digest;
}
async function sendDigest() {
  const { body } = await api('/api/digest/send', { method: 'POST' });
  document.getElementById('digest-preview').textContent = body.digest;
  alert(body.sent ? 'Digest emailed to ' + body.email : 'Digest saved in-app (no SMTP configured).');
}
async function loadSettings() {
  const b = document.getElementById('settings-box');
  b.style.display = b.style.display === 'none' ? 'block' : 'none';
  if (b.style.display === 'block') {
    const { body } = await api('/api/settings');
    document.getElementById('set-digest_enabled').checked = body.digest_enabled === '1';
    document.getElementById('set-digest_email').value = body.digest_email || '';
    document.getElementById('set-digest_hour').value = body.digest_hour || '7';
    document.getElementById('set-smtp_host').value = body.smtp_host || '';
    document.getElementById('set-smtp_user').value = body.smtp_user || '';
    document.getElementById('set-alerts_enabled').checked = body.alerts_enabled === '1';
  }
}
async function saveSettings() {
  const payload = {
    digest_enabled: document.getElementById('set-digest_enabled').checked ? '1' : '0',
    digest_email: document.getElementById('set-digest_email').value.trim(),
    digest_hour: document.getElementById('set-digest_hour').value,
    smtp_host: document.getElementById('set-smtp_host').value.trim(),
    smtp_user: document.getElementById('set-smtp_user').value.trim(),
    alerts_enabled: document.getElementById('set-alerts_enabled').checked ? '1' : '0',
  };
  await api('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  document.getElementById('settings-result').textContent = 'Saved.';
}

// start live alerts on load
connectAlerts();
