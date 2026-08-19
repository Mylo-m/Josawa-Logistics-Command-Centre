/* --- Consolidator --- */
async function loadConsolidator() {
  const el = document.getElementById('cons-stats');
  const body = document.getElementById('consTableBody');
  if (!el) return;
  try {
    const res = await fetch('/api/consolidator');
    const d = await res.json();
    el.innerHTML =
      statCard('Forwarder Groups', d.total_groups) +
      statCard('Consolidatable', d.consolidatable_groups, true) +
      statCard('Total Shipments', d.groups.reduce((a, g) => a + g.count, 0));
    body.innerHTML = (d.groups || []).map(g => `<tr>
      <td><strong>${esc(g.forwarder)}</strong></td>
      <td>${g.count}</td>
      <td>${(g.modes || []).map(m => `<span class="chip">${esc(m)}</span>`).join(' ')}</td>
      <td>${g.consolidatable ? '<span class="badge ok">Yes</span>' : '<span class="badge">No</span>'}</td>
      <td style="font-size:12px">${(g.shipments || []).map(s => esc(s.reference)).join(', ')}</td>
    </tr>`).join('') || '<tr><td colspan="5" class="muted">No shipments.</td></tr>';
  } catch (e) { console.error(e); }
}

/* --- Port / NAVIS Migration --- */
async function loadNavis() {
  const el = document.getElementById('navis-stats');
  const list = document.getElementById('navisTerminals');
  if (!el) return;
  try {
    const res = await fetch('/api/navis/status');
    const d = await res.json();
    el.innerHTML =
      statCard('Go-Live Target', d.target_date || '—') +
      statCard('Days Remaining', d.days_remaining == null ? '—' : d.days_remaining, true) +
      statCard('Terminals', (d.terminals || []).length);
    if (!d.configured) {
      list.innerHTML = `<p class="muted">${esc(d.note || 'Not configured.')}</p>`;
      return;
    }
    list.innerHTML = (d.terminals || []).map(t => `<div class="kv" style="padding:6px 0;border-bottom:1px solid #1c2530">
      <span><strong>${esc(t.name || t.code || 'Terminal')}</strong> ${esc(t.code || '')}</span>
      <span>${esc(t.status || 'planned')}</span>
    </div>`).join('');
  } catch (e) { console.error(e); }
}

/* --- Progress Charts --- */
let chartInstances = {};
function renderPie(canvasId, labels, values, colors) {
  const c = document.getElementById(canvasId);
  if (!c) return;
  if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
  chartInstances[canvasId] = new Chart(c.getContext('2d'), {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 1, borderColor: '#0a0f1a' }] },
    options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: '#9fb0c0', font: { size: 11 } } } } }
  });
}
const CHART_COLORS = ['#0d9488', '#f5a623', '#e2231a', '#6b7c8c', '#3b82f6', '#a855f7', '#22c55e', '#ef4444', '#14b8a6'];
async function loadCharts() {
  if (typeof Chart === 'undefined') { console.warn('Chart.js not loaded'); return; }
  try {
    const res = await fetch('/api/stats/segments');
    const d = await res.json();
    const stages = d.stages || {};
    renderPie('stageChart', Object.keys(stages), Object.values(stages), CHART_COLORS);
    const modes = d.modes || {};
    renderPie('modeChart', Object.keys(modes), Object.values(modes), ['#3b82f6', '#22c55e', '#6b7c8c']);
    const att = d.attention || {};
    renderPie('attentionChart', Object.keys(att), Object.values(att), CHART_COLORS);
  } catch (e) { console.error(e); }
}

function statCard(label, value, highlight) {
  return `<div class="stat-card${highlight ? ' highlight' : ''}"><div class="stat-label">${esc(label)}</div><div class="stat-value">${esc(value)}</div></div>`;
}
function esc(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
