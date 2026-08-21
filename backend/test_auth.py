# Auth endpoint tests. These monkeypatch auth.supabase/auth.supabase_admin
# with lightweight fakes so the suite never makes a live call to a Supabase
# project - keeping `pytest` hermetic and runnable offline, like the rest of
# this test suite.
from types import SimpleNamespace

from fastapi.testclient import TestClient

import auth as auth_module
from main import app

client = TestClient(app)


class FakeQuery:
    def __init__(self, rows):
        self._rows = rows
        self._filters = {}
        self._is_maybe_single = False

    def select(self, *args, **kwargs):
        return self

    def eq(self, field, value):
        self._filters[field] = value
        return self

    def maybe_single(self):
        self._is_maybe_single = True
        return self

    def execute(self):
        matches = [
            row for row in self._rows
            if all(row.get(k) == v for k, v in self._filters.items())
        ]
        if self._is_maybe_single:
            # Real postgrest-py quirk: .maybe_single().execute() returns
            # None outright (not a response object) when zero rows match.
            return SimpleNamespace(data=matches[0]) if matches else None
        return SimpleNamespace(data=matches)


class FakeTableClient:
    def __init__(self, tables):
        self._tables = tables

    def table(self, name):
        return FakeQuery(self._tables.get(name, []))


class FakeAuthAdminAPI:
    def __init__(self, users):
        self._users = users  # email -> {password, id, username}

    def sign_out(self, token, scope="global"):
        return None

    def get_user_by_id(self, uid):
        # Mirrors the real Admin API: look up by user id, not email - the
        # only index test_auth's fake user store doesn't already have, so
        # scan for it (fine at test scale).
        for email, record in self._users.items():
            if record["id"] == uid:
                return SimpleNamespace(user=SimpleNamespace(id=uid, email=email))
        return SimpleNamespace(user=None)


class FakeAuth:
    def __init__(self, users):
        self._users = users  # email -> {password, id, username}
        self.admin = FakeAuthAdminAPI(users)

    def sign_up(self, payload):
        email = payload["email"]
        password = payload["password"]
        username = payload["options"]["data"]["username"]

        if email in self._users:
            # Supabase's anti-enumeration behavior: re-signing up an
            # existing email succeeds with no error but no identities.
            user = SimpleNamespace(id=self._users[email]["id"], email=email, identities=[])
            return SimpleNamespace(user=user, session=None)

        user_id = f"user-{len(self._users) + 1}"
        self._users[email] = {"password": password, "id": user_id, "username": username}
        user = SimpleNamespace(id=user_id, email=email, identities=[SimpleNamespace()])
        session = SimpleNamespace(access_token="access-token", refresh_token="refresh-token")
        return SimpleNamespace(user=user, session=session)

    def sign_in_with_password(self, payload):
        record = self._users.get(payload["email"])
        if not record or record["password"] != payload["password"]:
            raise Exception("Invalid login credentials")
        user = SimpleNamespace(id=record["id"], email=payload["email"])
        session = SimpleNamespace(access_token="access-token", refresh_token="refresh-token")
        return SimpleNamespace(user=user, session=session)


class FakeSupabaseClient(FakeTableClient):
    def __init__(self, tables, fake_auth):
        super().__init__(tables)
        self.auth = fake_auth


def _install_fake_supabase(monkeypatch, tables=None, users=None):
    tables = tables if tables is not None else {"profiles": []}
    users = users if users is not None else {}
    fake_client = FakeSupabaseClient(tables, FakeAuth(users))
    monkeypatch.setattr(auth_module, "supabase", fake_client)
    monkeypatch.setattr(auth_module, "supabase_admin", fake_client)
    return tables, users


# --- Sign up -----------------------------------------------------------

def test_signup_succeeds_and_returns_a_session(monkeypatch):
    _install_fake_supabase(monkeypatch)

    response = client.post("/auth/signup", json={
        "email": "new@example.com",
        "username": "newuser",
        "password": "correcthorse",
    })

    assert response.status_code == 200
    body = response.json()
    assert body["access_token"] == "access-token"
    assert body["user"]["username"] == "newuser"
    assert body["email_confirmation_required"] is False


def test_signup_rejects_taken_username(monkeypatch):
    tables = {"profiles": [{"user_id": "u1", "user_displayname": "taken"}]}
    _install_fake_supabase(monkeypatch, tables=tables)

    response = client.post("/auth/signup", json={
        "email": "b@example.com",
        "username": "taken",
        "password": "correcthorse",
    })

    assert response.status_code == 409


def test_signup_rejects_existing_email(monkeypatch):
    users = {"dup@example.com": {"password": "whatever1", "id": "u1", "username": "someone"}}
    _install_fake_supabase(monkeypatch, users=users)

    response = client.post("/auth/signup", json={
        "email": "dup@example.com",
        "username": "brandnew",
        "password": "correcthorse",
    })

    assert response.status_code == 409


# --- Log in --------------------------------------------------------------

def test_login_by_email_succeeds(monkeypatch):
    users = {"user@example.com": {"password": "correcthorse", "id": "u1", "username": "someone"}}
    tables = {"profiles": [{"user_id": "u1", "user_displayname": "someone"}]}
    _install_fake_supabase(monkeypatch, tables=tables, users=users)

    response = client.post("/auth/login", json={
        "identifier": "user@example.com",
        "password": "correcthorse",
    })

    assert response.status_code == 200
    body = response.json()
    assert body["access_token"] == "access-token"
    assert body["user"]["username"] == "someone"


def test_login_by_username_succeeds(monkeypatch):
    users = {"user@example.com": {"password": "correcthorse", "id": "u1", "username": "someone"}}
    tables = {"profiles": [{"user_id": "u1", "user_displayname": "someone"}]}
    _install_fake_supabase(monkeypatch, tables=tables, users=users)

    response = client.post("/auth/login", json={
        "identifier": "someone",
        "password": "correcthorse",
    })

    assert response.status_code == 200
    assert response.json()["user"]["email"] == "user@example.com"


def test_login_rejects_unknown_username(monkeypatch):
    _install_fake_supabase(monkeypatch)

    response = client.post("/auth/login", json={
        "identifier": "ghost",
        "password": "whatever1",
    })

    assert response.status_code == 401


def test_login_rejects_wrong_password(monkeypatch):
    users = {"user@example.com": {"password": "correcthorse", "id": "u1", "username": "someone"}}
    tables = {"profiles": [{"user_id": "u1", "user_displayname": "someone"}]}
    _install_fake_supabase(monkeypatch, tables=tables, users=users)

    response = client.post("/auth/login", json={
        "identifier": "user@example.com",
        "password": "wrongpassword",
    })

    assert response.status_code == 401
