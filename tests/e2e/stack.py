"""A local, offline stand-in for the Supabase services the site and dashboard use.

  static site      http://127.0.0.1:8765          (the repository root, unchanged files)
  gateway          http://127.0.0.1:54331         (/rest/v1 -> PostgREST, /auth/v1, /storage/v1, /functions/v1)
  PostgREST        http://127.0.0.1:54330         (real PostgREST 12 against a throw-away local database)

Everything runs against synthetic data on the local PostgreSQL test cluster. Nothing here
talks to Supabase. Run directly (`python3 tests/e2e/stack.py`) to keep it up for manual testing.
"""
from __future__ import annotations

import base64
import email.parser
import email.policy
import hashlib
import hmac
import http.client
import json
import os
import shutil
import signal
import struct
import subprocess
import sys
import tempfile
import threading
import time
import urllib.parse
import uuid
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "tests" / "db"))
import harness  # noqa: E402

JWT_SECRET = "local-e2e-jwt-secret-not-used-anywhere-else-0123456789"
PUBLISHABLE = "local-publishable-key"
SECRET_KEY = "local-secret-key"
CRON_SECRET = "local-cron-secret-0123456789"
ADMIN = {"id": harness.ADMIN_ID, "email": "admin@test.invalid", "password": "local-admin-pass-123"}
VISITOR = {"id": harness.USER_ID, "email": "visitor@test.invalid", "password": "local-visitor-pass-123"}

SITE_PORT, REST_PORT, GW_PORT, FN_PORT = 8765, 54330, 54331, 54332
POSTGREST = os.environ.get("RQ_POSTGREST") or shutil.which("postgrest") or str(
    Path("/tmp/claude-0/-home-claude/b9834369-8d56-5eee-b70e-e6b01d8d4a10/scratchpad/tools/postgrest/postgrest"))


# ---------------------------------------------------------------- JWT / TOTP helpers
def b64u(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode().rstrip("=")


def unb64u(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def sign_jwt(claims: dict) -> str:
    head = b64u(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    body = b64u(json.dumps(claims).encode())
    sig = hmac.new(JWT_SECRET.encode(), f"{head}.{body}".encode(), hashlib.sha256).digest()
    return f"{head}.{body}.{b64u(sig)}"


def verify_jwt(tok: str) -> dict | None:
    try:
        head, body, sig = tok.split(".")
        good = hmac.new(JWT_SECRET.encode(), f"{head}.{body}".encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(good, unb64u(sig)):
            return None
        claims = json.loads(unb64u(body))
        if claims.get("exp", 0) < time.time():
            return None
        return claims
    except Exception:
        return None


def totp(secret_b32: str, t: float | None = None, step: int = 30) -> str:
    key = base64.b32decode(secret_b32 + "=" * (-len(secret_b32) % 8))
    counter = int((t or time.time()) // step)
    h = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
    o = h[-1] & 15
    return f"{(struct.unpack('>I', h[o:o + 4])[0] & 0x7fffffff) % 1_000_000:06d}"


ANON_JWT = sign_jwt({"role": "anon", "iss": "local", "exp": int(time.time()) + 86400 * 30})
SERVICE_JWT = sign_jwt({"role": "service_role", "iss": "local", "exp": int(time.time()) + 86400 * 30})


class AuthState:
    """In-memory auth server state (users, MFA factors, refresh tokens)."""

    def __init__(self):
        self.users = {u["email"]: dict(u) for u in (ADMIN, VISITOR)}
        self.factors: dict[str, dict] = {}       # factor id -> {user, secret, status, ...}
        self.challenges: dict[str, str] = {}     # challenge id -> factor id
        self.refresh: dict[str, tuple[str, str]] = {}  # refresh token -> (user id, aal)
        self.ttl = 3600
        self.lock = threading.Lock()

    def user_obj(self, uid: str) -> dict:
        u = next(x for x in self.users.values() if x["id"] == uid)
        factors = [{"id": fid, "friendly_name": f["name"], "factor_type": "totp", "status": f["status"],
                    "created_at": "2026-11-01T00:00:00Z", "updated_at": "2026-11-01T00:00:00Z"}
                   for fid, f in self.factors.items() if f["user"] == uid]
        return {"id": uid, "aud": "authenticated", "role": "authenticated", "email": u["email"],
                "app_metadata": {"provider": "email"}, "user_metadata": {}, "factors": factors,
                "created_at": "2026-09-14T00:00:00Z", "updated_at": "2026-11-01T00:00:00Z"}

    def session(self, uid: str, aal: str = "aal1") -> dict:
        now = int(time.time())
        amr = [{"method": "password", "timestamp": now}]
        if aal == "aal2":
            amr.insert(0, {"method": "totp", "timestamp": now})
        claims = {"aud": "authenticated", "exp": now + self.ttl, "iat": now, "iss": "local", "sub": uid,
                  "email": self.user_obj(uid)["email"], "role": "authenticated", "aal": aal, "amr": amr,
                  "session_id": str(uuid.uuid4()), "is_anonymous": False}
        rt = uuid.uuid4().hex
        self.refresh[rt] = (uid, aal)
        return {"access_token": sign_jwt(claims), "token_type": "bearer", "expires_in": self.ttl,
                "expires_at": now + self.ttl, "refresh_token": rt, "user": self.user_obj(uid)}


AUTH = AuthState()
LOG: list[dict] = []          # every request the gateway saw (method, path, status)
TELEGRAM: list[dict] = []     # messages "sent" to the fake Telegram API
FAKE = {"telegram_down": False, "turnstile_tokens": []}
STORE = Path(tempfile.mkdtemp(prefix="rq_storage_"))


# ---------------------------------------------------------------- gateway
class Gateway(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "rq-local-gateway"

    def log_message(self, *a):
        pass

    # -- plumbing
    def cors(self):
        self.send_header("Access-Control-Allow-Origin", self.headers.get("Origin") or "*")
        self.send_header("Access-Control-Allow-Headers", "authorization, apikey, content-type, prefer, range, x-client-info, "
                         "accept-profile, content-profile, x-supabase-api-version, x-upsert, cache-control, x-idempotency-key")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS, HEAD")
        self.send_header("Access-Control-Expose-Headers", "content-range, content-profile, preference-applied, location, x-ratelimit-remaining")
        self.send_header("Access-Control-Max-Age", "600")

    def reply(self, status: int, body=b"", ctype="application/json", extra: dict | None = None):
        self.body()   # drain the request body so keep-alive connections stay in sync
        if isinstance(body, (dict, list)) or body is None and ctype == "application/json":
            body = json.dumps(body).encode()
        elif isinstance(body, str):
            body = body.encode()
        self.send_response(status)
        self.cors()
        if body:
            self.send_header("Content-Type", ctype)
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)
        LOG.append({"method": self.command, "path": self.path, "status": status})

    def body(self) -> bytes:
        if getattr(self, "_body", None) is None:
            n = int(self.headers.get("Content-Length") or 0)
            self._body = self.rfile.read(n) if n else b""
        return self._body

    def bearer(self) -> str | None:
        """Translate the API key / user token the way the Supabase gateway does."""
        auth = self.headers.get("Authorization", "")
        tok = auth[7:] if auth.lower().startswith("bearer ") else ""
        key = self.headers.get("apikey", "")
        if tok and tok.count(".") == 2:
            return tok if verify_jwt(tok) else None
        k = tok or key
        if k == SECRET_KEY:
            return SERVICE_JWT
        if k == PUBLISHABLE or not k:
            return ANON_JWT if k else None
        return None

    def parse_request(self):
        self._body = None            # one handler serves many requests on a keep-alive connection
        return super().parse_request()

    def do_OPTIONS(self):
        self.reply(204)

    def do_GET(self): self.route()
    def do_HEAD(self): self.route()
    def do_POST(self): self.route()
    def do_PATCH(self): self.route()
    def do_PUT(self): self.route()
    def do_DELETE(self): self.route()

    def route(self):
        p = self.path
        try:
            if p.startswith("/rest/v1/"):
                return self.rest(p[len("/rest/v1"):])
            if p.startswith("/auth/v1/"):
                return self.auth(urllib.parse.urlsplit(p[len("/auth/v1"):]))
            if p.startswith("/storage/v1/"):
                return self.storage(urllib.parse.urlsplit(p[len("/storage/v1"):]).path)
            if p.startswith("/functions/v1/"):
                return self.functions(p[len("/functions/v1"):])
            if p.startswith("/__turnstile"):
                return self.fake_turnstile()
            if p.startswith("/__telegram/"):
                return self.fake_telegram()
            return self.reply(404, {"message": "not found"})
        except BrokenPipeError:
            pass

    # -- PostgREST proxy
    def rest(self, path: str):
        tok = self.bearer()
        if tok is None:
            return self.reply(401, {"message": "Invalid API key or JWT"})
        hdrs = {"Authorization": f"Bearer {tok}"}
        for h in ("Content-Type", "Prefer", "Accept", "Range", "Range-Unit", "Accept-Profile", "Content-Profile"):
            if self.headers.get(h):
                hdrs[h] = self.headers[h]
        hdrs["X-Forwarded-For"] = self.headers.get("X-Forwarded-For") or self.client_address[0]
        data = self.body()
        c = http.client.HTTPConnection("127.0.0.1", REST_PORT, timeout=30)
        c.request(self.command, path, body=data or None, headers=hdrs)
        r = c.getresponse()
        out = r.read()
        extra = {k: v for k, v in r.getheaders() if k.lower() in ("content-range", "preference-applied", "location", "content-profile")}
        self.reply(r.status, out, r.getheader("Content-Type") or "application/json", extra)
        c.close()

    # -- Edge Functions proxy (local Deno server)
    def functions(self, path: str):
        # accept-encoding is not forwarded: Deno would gzip the reply and this proxy relays raw bytes
        hdrs = {k: v for k, v in self.headers.items() if k.lower() not in ("host", "content-length", "connection", "accept-encoding")}
        hdrs["X-Forwarded-For"] = self.headers.get("X-Forwarded-For") or self.client_address[0]
        data = self.body()
        try:
            c = http.client.HTTPConnection("127.0.0.1", FN_PORT, timeout=30)
            c.request(self.command, path, body=data or None, headers=hdrs)
            r = c.getresponse()
            out = r.read()
        except OSError:
            return self.reply(503, {"error": "functions_offline"})
        self.reply(r.status, out, r.getheader("Content-Type") or "application/json")

    # -- Cloudflare Turnstile siteverify stand-in (test-key semantics: 1x... passes, 2x... fails)
    def fake_turnstile(self):
        form = urllib.parse.parse_qs(self.body().decode())
        secret, token = form.get("secret", [""])[0], form.get("response", [""])[0]
        FAKE["turnstile_tokens"].append(token)
        ok = secret.startswith("1x") and token not in ("", "invalid") and not token.startswith("fail")
        return self.reply(200, {"success": ok, "error-codes": [] if ok else ["invalid-input-response"]})

    # -- Telegram Bot API stand-in
    def fake_telegram(self):
        raw = self.body()
        if FAKE["telegram_down"]:
            return self.reply(502, {"ok": False, "description": "Bad Gateway"})
        msg = json.loads(raw or b"{}")
        TELEGRAM.append({"path": self.path, "chat_id": msg.get("chat_id"), "text": msg.get("text", "")})
        return self.reply(200, {"ok": True, "result": {"message_id": len(TELEGRAM)}})

    # -- GoTrue stand-in
    def auth_user(self) -> tuple[str, dict] | None:
        auth = self.headers.get("Authorization", "")
        claims = verify_jwt(auth[7:]) if auth.lower().startswith("bearer ") else None
        if not claims or claims.get("role") != "authenticated":
            return None
        return claims["sub"], claims

    def auth(self, u):
        q = urllib.parse.parse_qs(u.query)
        raw = self.body()
        b = json.loads(raw) if raw else {}
        path = u.path
        with AUTH.lock:
            if path == "/token" and q.get("grant_type") == ["password"]:
                user = AUTH.users.get((b.get("email") or "").lower())
                if not user or user["password"] != b.get("password"):
                    return self.reply(400, {"code": 400, "error_code": "invalid_credentials", "msg": "Invalid login credentials"})
                return self.reply(200, AUTH.session(user["id"]))
            if path == "/token" and q.get("grant_type") == ["refresh_token"]:
                got = AUTH.refresh.pop(b.get("refresh_token", ""), None)
                if not got:
                    return self.reply(400, {"code": 400, "error_code": "refresh_token_not_found", "msg": "Invalid Refresh Token"})
                return self.reply(200, AUTH.session(*got))
            who = self.auth_user()
            if path == "/logout":
                return self.reply(204)
            if who is None:
                return self.reply(401, {"code": 401, "error_code": "no_authorization", "msg": "This endpoint requires a valid Bearer token"})
            uid, claims = who
            if path == "/user" and self.command == "GET":
                return self.reply(200, AUTH.user_obj(uid))
            if path == "/factors" and self.command == "POST":
                fid = str(uuid.uuid4())
                secret = base64.b32encode(os.urandom(20)).decode().rstrip("=")
                AUTH.factors[fid] = {"user": uid, "secret": secret, "status": "unverified", "name": b.get("friendly_name") or ""}
                uri = f"otpauth://totp/ruqayya:{AUTH.user_obj(uid)['email']}?secret={secret}&issuer=ruqayya"
                svg = "<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><rect width='10' height='10'/></svg>"
                return self.reply(200, {"id": fid, "type": "totp", "friendly_name": b.get("friendly_name") or "",
                                        "totp": {"qr_code": "data:image/svg+xml;utf-8," + svg, "secret": secret, "uri": uri}})
            parts = path.strip("/").split("/")
            if len(parts) >= 2 and parts[0] == "factors":
                f = AUTH.factors.get(parts[1])
                if not f or f["user"] != uid:
                    return self.reply(404, {"code": 404, "error_code": "mfa_factor_not_found", "msg": "Factor not found"})
                if len(parts) == 2 and self.command == "DELETE":
                    AUTH.factors.pop(parts[1])
                    return self.reply(200, {"id": parts[1]})
                if parts[2:] == ["challenge"]:
                    cid = str(uuid.uuid4())
                    AUTH.challenges[cid] = parts[1]
                    return self.reply(200, {"id": cid, "type": "totp", "expires_at": int(time.time()) + 300})
                if parts[2:] == ["verify"]:
                    if AUTH.challenges.pop(b.get("challenge_id", ""), None) != parts[1]:
                        return self.reply(422, {"code": 422, "error_code": "mfa_challenge_expired", "msg": "Challenge expired"})
                    codes = {totp(f["secret"], time.time() + d) for d in (-30, 0, 30)}
                    if b.get("code") not in codes:
                        return self.reply(422, {"code": 422, "error_code": "mfa_verification_failed", "msg": "Invalid TOTP code entered"})
                    f["status"] = "verified"
                    return self.reply(200, AUTH.session(uid, "aal2"))
            return self.reply(404, {"code": 404, "msg": "unsupported auth endpoint in local stack: " + path})

    # -- Storage stand-in
    def storage(self, path: str):
        parts = path.strip("/").split("/")
        if parts[:2] == ["object", "public"] and self.command in ("GET", "HEAD"):
            f = STORE.joinpath(*parts[2:])
            if not f.is_file():
                return self.reply(404, {"error": "not_found"})
            meta = f.with_name(f.name + ".type")
            return self.reply(200, f.read_bytes(), meta.read_text() if meta.exists() else "application/octet-stream",
                              {"Cache-Control": "public, max-age=31536000"})
        tok = self.bearer()
        claims = verify_jwt(tok) if tok else None
        is_admin = False
        if claims and claims.get("role") == "authenticated":
            # same rule as the storage policies: private.is_admin() under the caller's own token (aal2 needed)
            import psycopg
            with psycopg.connect(harness.dsn(STACK["db"])) as c:
                c.execute("select set_config('request.jwt.claims', %s, true)", (json.dumps(claims),))
                is_admin = bool(c.execute("select private.is_admin()").fetchone()[0])
        if claims and claims.get("role") == "service_role":
            is_admin = True
        if parts[0] == "object" and self.command in ("POST", "PUT") and len(parts) >= 3:
            if not is_admin:
                return self.reply(403, {"statusCode": "403", "error": "Unauthorized", "message": "new row violates row-level security policy"})
            data, ctype = self.body(), self.headers.get("Content-Type", "")
            if ctype.startswith("multipart/form-data"):
                msg = email.parser.BytesParser(policy=email.policy.HTTP).parsebytes(
                    f"Content-Type: {ctype}\r\n\r\n".encode() + data)
                for part in msg.iter_parts():
                    if part.get_filename() is not None or part.get_param("name", header="content-disposition") == "":
                        data, ctype = part.get_payload(decode=True), part.get_content_type()
            f = STORE.joinpath(*parts[1:])
            if f.exists() and self.headers.get("x-upsert") != "true":
                return self.reply(400, {"statusCode": "409", "error": "Duplicate", "message": "The resource already exists"})
            f.parent.mkdir(parents=True, exist_ok=True)
            f.write_bytes(data)
            f.with_name(f.name + ".type").write_text(ctype or "application/octet-stream")
            return self.reply(200, {"Key": "/".join(parts[1:]), "Id": str(uuid.uuid4())})
        if parts[0] == "object" and self.command == "DELETE" and len(parts) == 2:
            if not is_admin:
                return self.reply(403, {"error": "Unauthorized"})
            removed = []
            for pfx in json.loads(self.body() or b"{}").get("prefixes", []):
                f = STORE / parts[1] / pfx
                if f.is_file():
                    f.unlink()
                    removed.append({"name": pfx, "bucket_id": parts[1]})
            return self.reply(200, removed)
        if parts[:2] == ["object", "list"] and self.command == "POST":
            body = json.loads(self.body() or b"{}")
            d = STORE / parts[2] / body.get("prefix", "")
            items = [{"name": x.name, "id": x.name, "metadata": {"size": x.stat().st_size}}
                     for x in sorted(d.iterdir())] if d.is_dir() else []
            return self.reply(200, [i for i in items if not i["name"].endswith(".type")])
        return self.reply(404, {"error": "unsupported storage endpoint in local stack"})


class Quiet(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(ROOT), **k)

    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


STACK: dict = {}


def load_catalog(db: str):
    """E2E catalog: the public catalog structure used by the dashboard previews (no customer data)."""
    mock = json.loads((HERE / "catalog.json").read_text())
    harness.admin_sql(db, "delete from public.products; delete from public.categories")
    for c in mock["cats"]:
        harness.admin_sql(db, """insert into public.categories (id, name, subtitle, slug, icon, image_url, sort, active)
            values (%s,%s,%s,%s,%s,%s,%s,%s)""", (c["id"], c["name"], c.get("subtitle", ""), c["slug"], c.get("icon", "gift"),
                                                 c.get("image_url", ""), c.get("sort", 0), c.get("active", True)))
    for p in mock["prods"]:
        harness.admin_sql(db, """insert into public.products (id, category_id, name, description, price, old_price, images, badge,
            metal, stone, weight, size, stock, featured, active, sort) values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                          (p["id"], p["category_id"], p["name"], p["description"], p["price"], p["old_price"], p["images"],
                           p["badge"], p["metal"], p["stone"], p["weight"], p["size"], p["stock"], p["featured"], p["active"], p["sort"]))
    harness.admin_sql(db, "update public.settings set data = %s::jsonb", (json.dumps(mock.get("settings", {})),))


def start(db: str | None = None, functions: bool = True) -> dict:
    if STACK:
        return STACK
    db = db or harness.build()
    load_catalog(db)
    env = dict(os.environ,
               PGRST_DB_URI=f"postgres://authenticator@/{db}?host={harness.HOST}&port={harness.PORT}",
               PGRST_DB_SCHEMAS="public", PGRST_DB_ANON_ROLE="anon", PGRST_JWT_SECRET=JWT_SECRET,
               PGRST_SERVER_HOST="127.0.0.1", PGRST_SERVER_PORT=str(REST_PORT), PGRST_DB_POOL=os.environ.get("RQ_POOL", "15"),
               PGRST_DB_MAX_ROWS="1000", PGRST_DB_EXTRA_SEARCH_PATH="public,extensions", PGRST_LOG_LEVEL="warn",
               PGRST_DB_CHANNEL_ENABLED="true")
    logs = Path(tempfile.mkdtemp(prefix="rq_logs_"))
    procs = [subprocess.Popen([POSTGREST], env=env, stdout=subprocess.DEVNULL, stderr=open(logs / "postgrest.log", "wb"))]
    if functions and (ROOT / "supabase" / "functions" / "_dev" / "serve.ts").exists():
        fenv = dict(os.environ, SUPABASE_URL=f"http://127.0.0.1:{GW_PORT}", SB_SECRET_KEY=SECRET_KEY, SB_PUBLISHABLE_KEY=PUBLISHABLE,
                    TURNSTILE_SECRET="1x0000000000000000000000000000000AA", TURNSTILE_VERIFY_URL=f"http://127.0.0.1:{GW_PORT}/__turnstile",
                    TELEGRAM_API=f"http://127.0.0.1:{GW_PORT}/__telegram", TELEGRAM_BOT_TOKEN="local-bot-token", TELEGRAM_CHAT_ID="1001",
                    CRON_SECRET=CRON_SECRET, ALLOWED_ORIGINS=f"http://127.0.0.1:{SITE_PORT}", PORT=str(FN_PORT),
                    NO_PROXY="127.0.0.1,localhost", no_proxy="127.0.0.1,localhost")
        deno = os.environ.get("RQ_DENO") or shutil.which("deno") or str(
            Path("/tmp/claude-0/-home-claude/b9834369-8d56-5eee-b70e-e6b01d8d4a10/scratchpad/tools/node_modules/.bin/deno"))
        procs.append(subprocess.Popen([deno, "run", "--allow-net", "--allow-env", "--no-prompt",
                                       str(ROOT / "supabase" / "functions" / "_dev" / "serve.ts")],
                                      env=fenv, stdout=open(logs / "functions.log", "wb"), stderr=subprocess.STDOUT))
    gw = ThreadingHTTPServer(("127.0.0.1", GW_PORT), Gateway)
    site = ThreadingHTTPServer(("127.0.0.1", SITE_PORT), Quiet)
    for s in (gw, site):
        threading.Thread(target=s.serve_forever, daemon=True).start()
    STACK.update(db=db, procs=procs, servers=[gw, site], logs=logs, site=f"http://127.0.0.1:{SITE_PORT}",
                 gateway=f"http://127.0.0.1:{GW_PORT}")
    # wait for PostgREST (it answers 503 while it loads the schema cache) and the functions
    def ready(port, path, headers=None):
        try:
            c = http.client.HTTPConnection("127.0.0.1", port, timeout=2)
            c.request("GET", path, headers=headers or {})
            r = c.getresponse()
            r.read()
            return r.status < 500 or path == "/health"
        except OSError:
            return False
    deadline = time.time() + 40
    while not ready(REST_PORT, "/", {"Authorization": f"Bearer {ANON_JWT}"}):
        if time.time() > deadline or procs[0].poll() is not None:
            err = (logs / "postgrest.log").read_text(errors="replace")[-2000:]
            stop()
            raise RuntimeError("PostgREST did not start: " + err)
        time.sleep(0.2)
    if len(procs) > 1:
        deadline = time.time() + 60
        while not ready(FN_PORT, "/health"):
            if time.time() > deadline or procs[1].poll() is not None:
                err = (logs / "functions.log").read_text(errors="replace")[-2000:]
                stop()
                raise RuntimeError("Edge Functions did not start: " + err)
            time.sleep(0.2)
    return STACK


def stop():
    for s in STACK.get("servers", []):
        s.shutdown()
        s.server_close()
    for p in STACK.get("procs", []):
        p.terminate()
        try:
            p.wait(5)
        except subprocess.TimeoutExpired:
            p.kill()
    if STACK.get("db"):
        harness.drop_db(STACK["db"])
    shutil.rmtree(STORE, ignore_errors=True)
    STACK.clear()


if __name__ == "__main__":
    s = start()
    print(f"site     {s['site']}/?backend=local")
    print(f"admin    {s['site']}/admin/?backend=local   ({ADMIN['email']} / {ADMIN['password']})")
    print(f"gateway  {s['gateway']}   database {s['db']}")
    signal.signal(signal.SIGTERM, lambda *a: (stop(), sys.exit(0)))
    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        stop()
