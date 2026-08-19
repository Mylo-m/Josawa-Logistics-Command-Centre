"""Background agent: live alerts + auto-stage + digest scheduler.

- Auto-advances linked shipments In Transit -> Arrived when their fleet vessel
  reaches the destination SA port (within BORDER_KM).
- Writes notifications when a shipment's attention bucket changes
  (arriving soon / overdue / needs clearing / ready / delivered) so the UI can
  push them live via SSE and the morning digest can summarise.
- Sends the morning digest at the configured local hour (C).
"""
import time
import threading
from datetime import datetime, timedelta

# import shared helpers from the app package
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import (get_db, enrich_shipment, notify, get_setting, build_digest,
                 send_email, haversine, SA_TARGETS, BORDER_KM, ATTENTION_DAYS, STAGE_INDEX)


def _calc_attention(s):
    return enrich_shipment(dict(s))['attention']


def auto_stage_once():
    """One pass: auto-arrive linked shipments + alert on attention-bucket change.

    Writes shipment stage changes and notifications separately to avoid a WAL
    write/write deadlock (an open outer transaction + a nested write conn).
    """
    last_attention = auto_stage_once._last if hasattr(auto_stage_once, '_last') else {}
    alerts = []  # (kind, shipment_id, message) collected, written after commit
    conn = get_db()
    try:
        ships = conn.execute('SELECT * FROM shipments').fetchall()
        prev = dict(last_attention)
        last_attention = {}
        for sh in ships:
            sh = dict(sh)
            enr = enrich_shipment(sh, conn)
            last_attention[sh['id']] = enr['attention']

            # auto-arrival from live vessel position
            if (sh['stage'] == 'In Transit' and sh['linked_vessel_id']
                    and enr.get('live_lat') is not None):
                tgt = SA_TARGETS.get(sh['destination'])
                if tgt:
                    dist = haversine(enr['live_lat'], enr['live_lon'], tgt['lat'], tgt['lon'])
                    if dist <= BORDER_KM:
                        conn.execute(
                            "UPDATE shipments SET stage='Arrived', updated_at=datetime('now') WHERE id=?",
                            (sh['id'],))
                        alerts.append(('arrived', sh['id'],
                                       f"{sh['reference']} arrived at {sh['destination']} "
                                       f"(vessel {enr.get('linked_vessel_name')})."))
            # alert on attention-bucket change
            if sh['id'] in prev and prev[sh['id']] != enr['attention']:
                a = _alert_for_change(sh, prev[sh['id']], enr['attention'])
                if a:
                    alerts.append(a)
            # one-time alert when a booking slot becomes due-soon or missed
            ss = enr.get('slot_status')
            if ss in ('due-soon', 'missed'):
                key = (sh['id'], ss)
                seen = getattr(auto_stage_once, '_slot_alerted', set())
                if key not in seen:
                    seen.add(key)
                    auto_stage_once._slot_alerted = seen
                    label = 'due within 24h' if ss == 'due-soon' else 'MISSED (overdue)'
                    alerts.append(('slot', sh['id'],
                        f"{sh['reference']} booking slot ({enr.get('slot_type') or 'slot'}) {label}"
                        f"{(' — ' + enr.get('slot_ref')) if enr.get('slot_ref') else ''}."))
        conn.commit()
    finally:
        conn.close()
    # write notifications AFTER the shipment transaction is closed
    for kind, sid, msg in alerts:
        notify(kind, sid, msg)
    auto_stage_once._last = last_attention


def auto_stage_loop(interval=60):
    """Move In Transit -> Arrived when the linked vessel hits the destination port."""
    while True:
        try:
            auto_stage_once()
        except Exception as e:
            print('[AGENT auto-stage]', e)
        time.sleep(interval)


def _alert_for_change(sh, old_att, new_att):
    """Return (kind, shipment_id, message) for an attention-bucket change, or None."""
    ref = sh['reference']
    if new_att == 'Needs Clearing':
        return ('stage', sh['id'], f"{ref} has ARRIVED — needs customs clearing.")
    elif new_att == 'Ready for Collection':
        return ('cleared', sh['id'], f"{ref} CLEARED — ready for collection/delivery.")
    elif new_att == 'Overdue':
        return ('overdue', sh['id'], f"{ref} is OVERDUE (past ETA, not delivered).")
    elif new_att == 'Arriving Soon':
        return ('arriving', sh['id'], f"{ref} arriving within {ATTENTION_DAYS} days.")
    elif new_att == 'Done':
        return ('delivered', sh['id'], f"{ref} delivered.")
    return None


def digest_loop():
    """Send the morning digest at the configured local hour (once per day)."""
    sent_today = ''
    while True:
        try:
            if get_setting('digest_enabled') == '1':
                hour = int(get_setting('digest_hour') or '7')
                now = datetime.now()
                today = now.strftime('%Y-%m-%d')
                if now.hour == hour and sent_today != today:
                    text = build_digest()
                    email = get_setting('digest_email')
                    host = get_setting('smtp_host')
                    if email and host:
                        send_email(email, 'AlphaTech Logistics — Morning Digest', text)
                    conn = get_db()
                    conn.execute("INSERT INTO notifications (kind, message) VALUES (?,?)",
                                 ('digest', text))
                    conn.commit()
                    conn.close()
                    sent_today = today
                    print('[DIGEST] sent for', today)
        except Exception as e:
            print('[DIGEST]', e)
        time.sleep(60)


def start_fetcher(interval=60):
    t1 = threading.Thread(target=auto_stage_loop, args=(interval,), daemon=True)
    t2 = threading.Thread(target=digest_loop, daemon=True)
    t1.start()
    t2.start()
    return (t1, t2)
