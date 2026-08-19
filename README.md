# AlphaTech Logistics Management

A self-contained shipment-tracking & clearing-and-forwarding control tower for
**Alpha Technologies** (TASCAM SA distributor). Built so the person who tracks
incoming shipments and coordinates with clearing & forwarding agents can see
everything that needs action on ONE dashboard — and get alerted instead of
having to check.

## What it does

- 📦 **Shipments register** — every import in one place: reference, supplier,
  description, sea/air, carrier, AWB/B/L, container, destination, forwarder +
  contact, ETA. Advances through the clearing pipeline
  `Booked → In Transit → Arrived → Customs Cleared → Delivered`.
- 🚨 **Needs-attention dashboard** — counts what needs action right now
  (Needs Clearing / Ready for Collection / Overdue / Arriving Soon).
- 🔔 **Proactive alerts** — live in-app toasts + bell when a shipment arrives,
  clears, goes overdue, or enters the arrival window. Pushed over SSE.
- 🤖 **Auto-stage from live position** — a linked vessel reaching its SA port
  flips the shipment `In Transit → Arrived` automatically.
- 📧 **Morning digest** — a one-screen "my day" summary (arriving today / this
  week / needs clearing / ready / overdue). Sent by email if SMTP is configured,
  otherwise saved in-app.
- 🗺️ **Live map** — Leaflet + CARTO dark tiles (no key). Real-time flights from
  OpenSky (no key); SA coastal fleet vessels; your tracked assets; shipment
  positions via their linked vessel.
- 📋 **One-click C&F comms** — copy or email a pre-filled status request to the
  forwarder per shipment.
- ⬆️ **CSV import** — paste a spreadsheet; columns auto-map. Duplicates skipped.
- 🔎 **CRM autofill** — type a supplier/forwarder and pull it from the imported
  TASCAM SA CRM (521 companies) so contacts aren't retyped.

## Run it

```bash
cd logistics-tracker-2
pip install flask
python3 app.py
```

Open http://localhost:7501 (binds 0.0.0.0 — use localhost:7501 from Windows too).

## Live data notes

- **Flights**: OpenSky Network, no API key required.
- **Vessels**: seeded realistic SA coastal fleet. For live AIS positions set
  `AISSTREAM_KEY` (free key from aisstream.io) before starting.
- **Shipments / alerts / digest**: owned by you — entered via the UI.

## Configuration (Settings tab → ⚙)

- `digest_enabled` (0/1), `digest_email`, `digest_hour` (local 0–23)
- `smtp_host`, `smtp_user` — SMTP_PASSWORD is read from the `SMTP_PASS`
  environment variable (never stored in the DB or repo).

## Project layout

```
app.py                 Flask app: routes, DB, live data, enrichment, digest
agents/live_fetcher.py background agent: auto-stage, alerts, digest scheduler
templates/             dashboard.html, map.html
static/js/             dashboard.js, map.js
static/css/            dashboard.css
data/tracker.db        SQLite (created on first run; git-ignored)
```

## Notes

- Seeded with example Alpha import shipments + fleet so it is usable immediately.
- The `crm_contacts` table is populated on first run from
  `TASCAM_SA_Leads_Master.csv` (not committed).
