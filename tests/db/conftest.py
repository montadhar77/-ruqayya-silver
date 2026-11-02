import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))
import harness  # noqa: E402

_template = {}


def _template_db():
    """One fully migrated database (with fixtures) used as a template; each test
    gets a cheap copy so tests never share state."""
    if "name" not in _template:
        name = "rq_template_" + harness.uuid.uuid4().hex[:6]
        harness.build(name=name)
        _template["name"] = name
    return _template["name"]


@pytest.fixture
def db():
    name = harness.create_db(template=_template_db())
    try:
        yield name
    finally:
        harness.drop_db(name)


@pytest.fixture
def anon(db):
    with harness.session(db, "anon") as s:
        yield s


@pytest.fixture
def visitor(db):
    with harness.session(db, "authenticated", harness.USER_ID) as s:
        yield s


@pytest.fixture
def admin(db):
    """The shop owner after password + authenticator code (aal2)."""
    with harness.session(db, "authenticated", harness.ADMIN_ID, claims={"aal": "aal2"}) as s:
        yield s


@pytest.fixture
def admin_password_only(db):
    """The owner's account signed in with the password alone (aal1)."""
    with harness.session(db, "authenticated", harness.ADMIN_ID, claims={"aal": "aal1"}) as s:
        yield s


@pytest.fixture
def service(db):
    with harness.session(db, "service_role") as s:
        yield s


def pytest_sessionfinish(session, exitstatus):
    if "name" in _template:
        harness.drop_db(_template["name"])
