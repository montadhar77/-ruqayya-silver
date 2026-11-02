"""Alert bookkeeping: every order/message is handed out for sending until confirmed."""
import json

import psycopg
import pytest

import harness
from test_0001_inventory import parallel

P1 = "20000000-0000-4000-8000-000000000001"


def new_order(anon, name="زبون تجريبي"):
    return anon.one("select public.place_order(%s::jsonb, %s::jsonb)",
                    (json.dumps({"name": name, "phone": "07700000001", "city": "كربلاء", "address": "شارع ١", "notes": "مقاس ٢٠"}),
                     json.dumps([{"id": P1, "qty": 2}])))["order_no"]


def age(db, table, minutes):
    harness.admin_sql(db, f"update public.{table} set created_at = created_at - make_interval(mins => %s)", (minutes,))


def claim(service, kind, ref):
    return service.one("select public.claim_notification(%s, %s)", (kind, str(ref)))


def finish(service, kind, ref, ok, err=""):
    service.q("select public.finish_notification(%s, %s, %s, %s)", (kind, str(ref), ok, err))


def test_claim_send_finish(anon, service, db):
    no = new_order(anon)
    c = claim(service, "order", no)
    assert c["send"] is True
    p = c["payload"]
    assert (p["order_no"], p["customer_name"], p["total"], p["currency"], p["international"]) == (no, "زبون تجريبي", 485000, "د.ع", False)
    assert p["items"][0]["qty"] == 2 and p["notes"] == "مقاس ٢٠"
    assert claim(service, "order", no)["send"] is False          # someone is already sending it
    finish(service, "order", no, True)
    st = harness.admin_sql(db, "select notified_at is not null, notify_attempts, notify_error from public.orders")
    assert st == [(True, 1, "")]
    assert claim(service, "order", no)["send"] is False


def test_failed_send_is_retried_with_backoff(anon, service, db):
    no = new_order(anon)
    claim(service, "order", no)
    finish(service, "order", no, False, "telegram_502: bad gateway")
    assert harness.admin_sql(db, "select notified_at, notify_error from public.orders") == [(None, "telegram_502: bad gateway")]
    age(db, "orders", 2)
    assert service.one("select public.claim_pending_notifications()") == []      # 1st retry waits 1 minute after the claim
    harness.admin_sql(db, "update public.orders set notify_claimed_at = now() - interval '61 seconds'")
    got = service.one("select public.claim_pending_notifications()")
    assert [g["ref"] for g in got] == [str(no)]
    finish(service, "order", no, False, "network")
    harness.admin_sql(db, "update public.orders set notify_claimed_at = now() - interval '90 seconds'")
    assert service.one("select public.claim_pending_notifications()") == []      # 2nd retry waits 2 minutes
    harness.admin_sql(db, "update public.orders set notify_claimed_at = now() - interval '121 seconds'")
    assert len(service.one("select public.claim_pending_notifications()")) == 1


def test_pending_skips_fresh_and_confirmed(anon, service, db):
    a, b = new_order(anon, "طلب أ"), new_order(anon, "طلب ب")
    assert service.one("select public.claim_pending_notifications()") == []      # under a minute old: the function sends those
    age(db, "orders", 5)
    claim(service, "order", a)
    finish(service, "order", a, True)
    got = service.one("select public.claim_pending_notifications()")
    assert [g["ref"] for g in got] == [str(b)] and got[0]["payload"]["customer_name"] == "طلب ب"


def test_history_before_migration_is_not_sent(anon, service, db):
    new_order(anon)
    harness.admin_sql(db, "update private.notify_state set since = now() + interval '1 minute'")
    age(db, "orders", 5)
    assert service.one("select public.claim_pending_notifications()") == []


def test_owner_can_switch_alerts_off(anon, service, db):
    harness.admin_sql(db, """update public.settings set data = jsonb_set(data, '{notify}', '{"orders": false, "inquiries": true}')""")
    no = new_order(anon)
    assert claim(service, "order", no) == {"send": False}
    assert harness.admin_sql(db, "select notify_error, notified_at is not null from public.orders") == [("disabled", True)]
    anon.q("insert into public.inquiries (name, phone, body) values ('زائر', '', 'سؤال')")
    age(db, "inquiries", 5)
    got = service.one("select public.claim_pending_notifications()")
    assert [g["kind"] for g in got] == ["inquiry"] and got[0]["payload"]["body"] == "سؤال"


def test_inquiry_claim_and_submit_returns_id(service, db):
    r = service.one("select public.submit_inquiry('زائر', '0770', 'هل يتوفر؟', '203.0.113.1')")
    c = claim(service, "inquiry", r["id"])
    assert c["send"] and c["payload"] == {"name": "زائر", "phone": "0770", "body": "هل يتوفر؟"}
    finish(service, "inquiry", r["id"], True)
    assert harness.admin_sql(db, "select notified_at is not null from public.inquiries") == [(True,)]


def test_two_retry_runs_never_send_the_same_alert(anon, db):
    for i in range(30):
        new_order(anon, f"زبون {i}")
    age(db, "orders", 5)
    sessions = [harness.Session(db, "service_role") for _ in range(4)]
    try:
        res = parallel(4, lambda i: sessions[i].one("select public.claim_pending_notifications(10)"))
    finally:
        for s in sessions:
            s.close()
    refs = [g["ref"] for r in res for g in r]
    assert len(refs) == len(set(refs)) == 30


def test_gives_up_after_twenty_tries(anon, service, db):
    new_order(anon)
    age(db, "orders", 5)
    harness.admin_sql(db, "update public.orders set notify_attempts = 20")
    assert service.one("select public.claim_pending_notifications()") == []


def test_alert_functions_are_service_only(anon, visitor, admin):
    for s in (anon, visitor, admin):
        for sql in ["select public.claim_pending_notifications()", "select public.claim_notification('order', '1001')",
                    "select public.finish_notification('order', '1001', true, '')", "select * from private.notify_state"]:
            with pytest.raises(psycopg.errors.InsufficientPrivilege):
                s.q(sql)


def test_admin_sees_alert_status(anon, admin):
    new_order(anon)
    row = admin.q("select notified_at, notify_error from public.orders")
    assert row == [(None, "")]
