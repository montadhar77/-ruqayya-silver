"""Server-side limits on orders and messages, with the limits exactly as shipped."""
import json
import uuid

import psycopg
import pytest

import harness
from test_0001_inventory import parallel

P1 = "20000000-0000-4000-8000-000000000001"


@pytest.fixture
def real(db):
    harness.real_limits(db)
    return db


def cust(phone="07700000001", name="زبون تجريبي"):
    return json.dumps({"name": name, "phone": phone, "city": "كربلاء"})


def place(s, phone="07700000001", key=None):
    return s.one("select public.place_order(%s::jsonb, %s::jsonb, %s::uuid)", (cust(phone), json.dumps([{"id": P1}]), key))


def from_ip(db, ip, header="x-forwarded-for"):
    return harness.Session(db, "anon", headers={header: ip})


def test_phone_limit(real):
    with harness.session(real) as s:
        for _ in range(4):
            place(s, "0770 111 2233")
        with pytest.raises(psycopg.errors.RaiseException, match="rate_limited"):
            place(s, "+964 770 111 2233")          # same number written differently
        place(s, "07702223344")                   # another customer is not affected


def test_ip_limit_and_other_ip_unaffected(real):
    a, b = from_ip(real, "203.0.113.5, 10.0.0.1"), from_ip(real, "198.51.100.7")
    try:
        for i in range(6):
            place(a, f"0770000010{i}")
        with pytest.raises(psycopg.errors.RaiseException, match="rate_limited"):
            place(a, "07700000199")
        place(b, "07700000200")
    finally:
        a.close(), b.close()


def test_cf_connecting_ip_is_preferred(real):
    """A visitor cannot dodge the limit by sending a fake X-Forwarded-For when the edge sets cf-connecting-ip."""
    sessions = [harness.Session(real, "anon", headers={"cf-connecting-ip": "203.0.113.9", "x-forwarded-for": f"10.9.9.{i}"})
                for i in range(7)]
    try:
        for i in range(6):
            place(sessions[i], f"0771000010{i}")
        with pytest.raises(psycopg.errors.RaiseException, match="rate_limited"):
            place(sessions[6], "07710000199")
    finally:
        for s in sessions:
            s.close()


def test_parallel_burst_cannot_slip_through(real):
    sessions = [from_ip(real, "203.0.113.77") for _ in range(20)]
    try:
        res = parallel(20, lambda i: place(sessions[i], f"07720000{i:03d}"))
    finally:
        for s in sessions:
            s.close()
    assert sum(isinstance(r, dict) for r in res) == 6, res
    assert all("rate_limited" in str(r) for r in res if not isinstance(r, dict))


def test_retry_of_saved_checkout_is_not_limited(real):
    key = str(uuid.uuid4())
    with harness.session(real) as s:
        first = place(s, "07730000001", key)
        for _ in range(3):
            place(s, "07730000001")
        for _ in range(5):                        # limit reached, but replays still answer
            again = place(s, "07730000001", key)
            assert again["order_no"] == first["order_no"] and again["duplicate"]


def test_shop_wide_circuit_breaker(real):
    harness.admin_sql(real, "update private.rate_rules set max_count = 3 where kind = 'order' and scope = 'all'")
    with harness.session(real) as s:
        for i in range(3):
            place(s, f"0774000000{i}")
        with pytest.raises(psycopg.errors.RaiseException, match="rate_limited"):
            place(s, "07740000009")


def test_failed_attempts_leave_nothing_behind(real):
    with harness.session(real) as s:
        with pytest.raises(psycopg.errors.RaiseException, match="invalid_name"):
            s.one("select public.place_order(%s::jsonb, %s::jsonb)", (json.dumps({"name": "x", "phone": "07750000001"}), json.dumps([{"id": P1}])))
    assert harness.admin_sql(real, "select count(*) from private.rate_events")[0][0] == 0


def test_only_hashes_are_stored(real):
    with from_ip(real, "203.0.113.200") as s:
        place(s, "07760000001")
    rows = harness.admin_sql(real, "select scope, subject from private.rate_events order by scope")
    assert [r[0] for r in rows] == ["all", "ip", "phone"]
    assert all(r[1] == "all" or len(r[1]) == 64 for r in rows)
    assert not any("203.0.113.200" in r[1] or "7760000001" in r[1] for r in rows)


# ------------------------------------------------------------------ Edge Function entry points
def test_submit_order_is_service_only(real, anon, visitor, service):
    args = (cust(), json.dumps([{"id": P1}]), None, "203.0.113.1")
    for s in (anon, visitor):
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            s.one("select public.submit_order(%s::jsonb, %s::jsonb, %s::uuid, %s)", args)
    r = service.one("select public.submit_order(%s::jsonb, %s::jsonb, %s::uuid, %s)", args)
    assert r["total"] == 245000


def test_submit_order_limits_by_given_ip(real, service):
    for i in range(6):
        service.one("select public.submit_order(%s::jsonb, %s::jsonb, null, %s)", (cust(f"0777000000{i}"), json.dumps([{"id": P1}]), "203.0.113.50"))
    with pytest.raises(psycopg.errors.RaiseException, match="rate_limited"):
        service.one("select public.submit_order(%s::jsonb, %s::jsonb, null, %s)", (cust("07770000099"), json.dumps([{"id": P1}]), "203.0.113.50"))


def test_order_by_key(real, anon, service):
    key = str(uuid.uuid4())
    place(anon, "07780000001", key)
    assert service.one("select public.order_by_key(%s)", (key,))["duplicate"] is True
    assert service.one("select public.order_by_key(%s)", (str(uuid.uuid4()),)) is None
    with pytest.raises(psycopg.errors.InsufficientPrivilege):
        anon.one("select public.order_by_key(%s)", (key,))


def test_direct_inquiries_are_limited(real):
    with from_ip(real, "203.0.113.60") as s:
        for i in range(5):
            s.q("insert into public.inquiries (name, phone, body) values ('زائر', '', %s)", (f"سؤال {i}",))
        with pytest.raises(psycopg.errors.RaiseException, match="rate_limited"):
            s.q("insert into public.inquiries (name, phone, body) values ('زائر', '', 'سؤال آخر')")


def test_submit_inquiry(real, anon, service):
    assert service.one("select public.submit_inquiry('زائر', '0770', 'هل يتوفر؟', '203.0.113.61')")["ok"] is True
    with pytest.raises(psycopg.errors.RaiseException, match="invalid_inquiry"):
        service.one("select public.submit_inquiry('ز', '', 'x', '203.0.113.61')")
    with pytest.raises(psycopg.errors.InsufficientPrivilege):
        anon.one("select public.submit_inquiry('زائر', '', 'سؤال', '1.1.1.1')")
    # counted once (by the function), not twice (by the direct-insert guard)
    assert harness.admin_sql(real, "select count(*) from private.rate_events where kind = 'inquiry' and scope = 'ip'")[0][0] == 1


def test_internal_functions_are_not_exposed(anon, visitor, service):
    calls = ["select private.create_order('{}'::jsonb, '[]'::jsonb, null)", "select private.hit('order', null, null)",
             "select private.replay_order(null)", "select * from private.rate_rules", "select * from private.rate_events"]
    for s in (anon, visitor, service):
        for sql in calls:
            with pytest.raises(psycopg.errors.InsufficientPrivilege):
                s.q(sql)
