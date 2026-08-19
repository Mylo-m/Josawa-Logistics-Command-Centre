# JOSAWA LOGISTICS — USER MANUAL
### Shipment Control Tower (sea & air imports, clearing & forwarding)

A simple dashboard to track every import from supplier → delivered, see live
vessel/flight positions on a map, and get alerts when something needs attention.

---

## 1. HOW TO OPEN IT (every day)

**Easiest way:** open your web browser and go to:

    http://localhost:7501

That's it — the app runs on your own computer. Keep the window open while you work.

**If the page won't load** (computer restarted, or app closed):
1. Open the folder: `logistics-tracker-2`
2. Double-click `start.bat` (Windows) — or run `start.sh` (Mac/Linux)
3. Wait ~5 seconds, then refresh the browser.

> Tip: other people on your office Wi-Fi can open it too by using your computer's
> network address (shown at the bottom of the Dashboard, e.g. `http://192.168.x.x:7501`).

---

## 2. THE SIDEBAR (left menu)

Click any of these to switch screens:

| Button | What it does |
|--------|--------------|
| 📊 **Dashboard** | Overview: counts per stage + a list of shipments needing attention |
| 🗺️ **Live Map** | Map with live aircraft (OpenSky) and seeded SA coastal vessels |
| 📦 **Shipments** | The main list — add, edit, advance, and track each import |
| 📍 **My Assets** | Track specific ships/flights by name and watch their progress bar |
| ✈️ **Tracker** | Type a flight or shipping number to pull LIVE position data |
| 📧 **Digest & Alerts** | Set up a daily morning email summary |
| 🗂️ **Consolidator** | Groups shipments by forwarder so you can consolidate |
| 🚢 **Port Migration** | Port/berth migration view |
| 📈 **Progress** | Charts: pipeline stage, air vs sea, attention buckets |
| 🏭 **Suppliers** | Your supplier master list |
| 📁 **Documents** | Upload docs *per shipment* (invoices, SAD500, etc.) |
| ⚙️ **Settings** | Digest email, SMTP, alerts on/off |

---

## 3. SHIPMENTS (the main screen)

### Add a shipment
Fill the top row and click **+ Add**:
- **Ref** — your reference, e.g. `JOS-2608-01`
- **Supplier** — who you bought from (auto-suggests past suppliers)
- **Description** — what's in it
- **Mode** — Sea or Air
- **Carrier / Vessel** — shipping line or airline
- **AWB/B/L** — the air waybill or bill of lading number
- **Container** — container number (sea)
- **Destination** — Durban / Cape Town / Joburg / PE
- **Forwarder** — your clearing agent (auto-suggests)
- **Contact** — forwarder email
- **ETA** — expected arrival date/time

### Move a shipment forward
Each shipment flows through 5 stages:
**Booked → In Transit → Arrived → Customs Cleared → Delivered**

Click the green **▶ Next Stage** button on a row to advance it one step.
The little dots under each row fill in teal as it progresses.

### Flags (status tags)
Click **📂 details** on a row, then add a flag:
`Customs Hold`, `Missing Docs`, `Overdue`, `Ready`, `Awaiting Slot`, `Held by Forwarder`, etc.
Flagged shipments show up on the Dashboard under "Needs attention".

### Booking slot
In details, set the harbour/flight **booking slot** (date + ref) so you can see
which shipments are slotted vs waiting.

### Notes & Messages
- **📋 status msg** — copies a ready-to-send status WhatsApp/email text.
- **✉️ email fwd** — opens an email to the forwarder.
- **📁 docs** — jumps to that shipment's documents.

---

## 4. LIVE MAP

- **Aircraft** (✈️ yellow) are REAL and live — positions stream from OpenSky, no setup needed.
- **Vessels** (🚢 teal) show a realistic seeded SA coastal fleet so the map is useful offline.
  To see REAL ships, ask your admin to set an `AISSTREAM_KEY` (free key from aisstream.io).
- Your tracked **assets** appear as orange dots.
- SA destination ports are grey dots.

---

## 5. TRACKER (pull live data on demand)

1. Go to the **✈️ Tracker** tab.
2. Type a flight number (e.g. `BA0001`) or a container/ship name.
3. The app fetches live position, speed, and ETA and shows it.

> Live flight data works with no key. Live shipping needs the AIS key (see admin).

---

## 6. MY ASSETS

Add a ship name or flight number + destination. The card shows a **progress bar**
(how far along its route), distance remaining, ETA, and status. Click **✕ remove** to delete.

---

## 7. DIGEST & ALERTS (daily email)

1. Go to **⚙️ Settings**.
2. Tick **Enable daily morning digest**, enter your email, send hour (0–23).
3. Enter SMTP host (e.g. `smtp.gmail.com`) + user. The password is read from an
   environment variable `SMTP_PASS` (never typed in the page).
4. Save. Each morning you get a summary; it's also saved in-app under the 🔔 bell.

> Without SMTP set, the digest is still saved in the app (🔔 bell) — it just won't email.

---

## 8. DOCUMENTS

Pick a shipment → pick a document type (Proforma, Commercial Invoice, Packing List,
HAWB/MAWB, SAD500/501/507, Customs Worksheet, EDI/Release, Clearing Instruction, POA)
→ upload the file. Stored per shipment.

---

## 9. CONSOLIDATOR

Groups shipments that share a forwarder so you can see which forwarders have multiple
consignments to combine. Useful for consolidating collectivist deliveries.

---

## 10. EXPORTS

- **Excel**: on the Shipments screen there's an export to `Josawa_Shipments.xlsx`.
- **CSV import**: bulk-add shipments from a CSV file (📥 import).

---

## 11. SETTINGS REFERENCE

| Setting | Meaning |
|---------|---------|
| digest_enabled | Send the daily summary? (on/off) |
| digest_email | Where the summary goes |
| digest_hour | Hour of day to send (0–23) |
| smtp_host / smtp_user | Email server login |
| alerts_enabled | In-app alert bell on/off |

---

## 12. TROUBLESHOOTING

| Problem | Fix |
|---------|-----|
| Page won't open | App isn't running — see section 1 "If the page won't load" |
| Map shows no real ships | Normal offline; ask admin for `AISSTREAM_KEY` |
| Digest not emailing | SMTP not configured — it's saved in-app instead |
| Logo missing | Clear browser cache (Ctrl+Shift+R) |
| Data looks old after an update | Hard-refresh the browser (Ctrl+Shift+R) |

---

## 13. FOR THE ADMIN (Kamil)

- App folder: `logistics-tracker-2`
- Runs on port **7501** (`app.run(host='0.0.0.0', port=7501)`)
- Database: `data/tracker.db` (SQLite, do NOT edit by hand; backed up by git ignore)
- Live AIS vessels: set env `AISSTREAM_KEY`
- Digest email: set env `SMTP_PASS`
- Restart: `start.sh` / `start.bat`, or say "restart josawa"
- Repo: https://github.com/Mylo-m/Josawa-Logistics-Command-Centre

*Built and designed by Kamil Meer Motala.*
