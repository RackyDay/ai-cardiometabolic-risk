# Auth endpoint tests, covering the login feature end to end: signup, login,
# logout, and /me. These monkeypatch auth.supabase/auth.supabase_admin with
# lightweight fakes so the suite never makes a live call to a Supabase
# project - keeping `pytest` hermetic and runnable offline, like the rest of
# this test suite.
from types import SimpleNamespace

from fastapi.testclient import TestClient

import auth as auth_module
import main as main_module
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
        # Tracks every sign_out() call so logout tests can assert on it
        # (the token passed, and how many times) instead of only checking
        # the endpoint doesn't crash.
        self.sign_out_calls = []

    def sign_out(self, token, scope="global"):
        self.sign_out_calls.append(token)
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
    def __init__(self, users, tokens=None, signup_session=True):
        self._users = users  # email -> {password, id, username}
        # token -> {"id":..., "email":...}, for tests that need get_user()
        # (i.e. /me and anything else gated by get_current_user) without
        # going through a real sign-in first.
        self._tokens = tokens or {}
        # False simulates a Supabase project with email confirmation
        # required: sign_up() succeeds but returns no session.
        self._signup_session = signup_session
        self.admin = FakeAuthAdminAPI(users)

    def get_user(self, token):
        record = self._tokens.get(token)
        if not record:
            raise Exception("Invalid or expired token")
        return SimpleNamespace(user=SimpleNamespace(id=record["id"], email=record["email"]))

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
        session = (
            SimpleNamespace(access_token="access-token", refresh_token="refresh-token")
            if self._signup_session else None
        )
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


def _install_fake_supabase(monkeypatch, tables=None, users=None, tokens=None, signup_session=True):
    tables = tables if tables is not None else {"profiles": []}
    users = users if users is not None else {}
    fake_client = FakeSupabaseClient(tables, FakeAuth(users, tokens=tokens, signup_session=signup_session))
    monkeypatch.setattr(auth_module, "supabase", fake_client)
    monkeypatch.setattr(auth_module, "supabase_admin", fake_client)
    # main.py's /me imports supabase_admin directly from supabase_client
    # (`from supabase_client import ... supabase_admin`) - a separate name
    # binding from auth.supabase_admin, so it needs patching too or it'll
    # silently fall through to the real Supabase project.
    monkeypatch.setattr(main_module, "supabase_admin", fake_client)
    return tables, users, fake_client


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


def test_signup_reports_email_confirmation_required_when_no_session(monkeypatch):
    # Simulates a Supabase project with "Confirm email" turned on: sign_up()
    # itself succeeds, but no session comes back yet.
    _install_fake_supabase(monkeypatch, signup_session=False)

    response = client.post("/auth/signup", json={
        "email": "pending@example.com",
        "username": "pendinguser",
        "password": "correcthorse",
    })

    assert response.status_code == 200
    body = response.json()
    assert body["email_confirmation_required"] is True
    assert body["access_token"] is None
    assert body["user"] is None


# --- Sign up validation (fails before reaching Supabase at all) ----------

def test_signup_rejects_short_password(monkeypatch):
    _install_fake_supabase(monkeypatch)

    response = client.post("/auth/signup", json={
        "email": "new@example.com",
        "username": "newuser",
        "password": "short1",
    })

    assert response.status_code == 422


def test_signup_rejects_invalid_username_characters(monkeypatch):
    _install_fake_supabase(monkeypatch)

    response = client.post("/auth/signup", json={
        "email": "new@example.com",
        "username": "not a valid username!",
        "password": "correcthorse",
    })

    assert response.status_code == 422


def test_signup_rejects_invalid_email_format(monkeypatch):
    _install_fake_supabase(monkeypatch)

    response = client.post("/auth/signup", json={
        "email": "not-an-email",
        "username": "newuser",
        "password": "correcthorse",
    })

    assert response.status_code == 422


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


def test_login_returns_null_username_when_no_profile_row(monkeypatch):
    # A user_id with no matching profiles row at all (not just a null
    # user_displayname) - log_in should still succeed, just with username=None.
    users = {"user@example.com": {"password": "correcthorse", "id": "u1", "username": "someone"}}
    _install_fake_supabase(monkeypatch, tables={"profiles": []}, users=users)

    response = client.post("/auth/login", json={
        "identifier": "user@example.com",
        "password": "correcthorse",
    })

    assert response.status_code == 200
    assert response.json()["user"]["username"] is None


# --- Log in validation -----------------------------------------------------

def test_login_rejects_empty_identifier(monkeypatch):
    _install_fake_supabase(monkeypatch)

    response = client.post("/auth/login", json={"identifier": "", "password": "whatever1"})

    assert response.status_code == 422


def test_login_rejects_empty_password(monkeypatch):
    _install_fake_supabase(monkeypatch)

    response = client.post("/auth/login", json={"identifier": "user@example.com", "password": ""})

    assert response.status_code == 422


# --- Logout ----------------------------------------------------------------

def test_logout_with_valid_token_revokes_it(monkeypatch):
    _, _, fake_client = _install_fake_supabase(monkeypatch)

    response = client.post("/auth/logout", headers={"Authorization": "Bearer some-access-token"})

    assert response.status_code == 200
    assert response.json() == {"message": "Logged out"}
    assert fake_client.auth.admin.sign_out_calls == ["some-access-token"]


def test_logout_without_authorization_header_still_succeeds(monkeypatch):
    _, _, fake_client = _install_fake_supabase(monkeypatch)

    response = client.post("/auth/logout")

    assert response.status_code == 200
    assert response.json() == {"message": "Logged out"}
    # No token to revoke - log_out() is never even called.
    assert fake_client.auth.admin.sign_out_calls == []


def test_logout_with_malformed_header_still_succeeds(monkeypatch):
    _, _, fake_client = _install_fake_supabase(monkeypatch)

    response = client.post("/auth/logout", headers={"Authorization": "not-a-bearer-token"})

    assert response.status_code == 200
    assert response.json() == {"message": "Logged out"}
    assert fake_client.auth.admin.sign_out_calls == []


# --- /me ---------------------------------------------------------------

def test_me_returns_user_info_with_username(monkeypatch):
    tokens = {"good-token": {"id": "u1", "email": "user@example.com"}}
    tables = {"profiles": [{"user_id": "u1", "user_displayname": "someone"}]}
    _install_fake_supabase(monkeypatch, tables=tables, tokens=tokens)

    response = client.get("/me", headers={"Authorization": "Bearer good-token"})

    assert response.status_code == 200
    assert response.json() == {"id": "u1", "email": "user@example.com", "username": "someone"}


def test_me_returns_null_username_when_no_profile_row(monkeypatch):
    tokens = {"good-token": {"id": "u1", "email": "user@example.com"}}
    _install_fake_supabase(monkeypatch, tables={"profiles": []}, tokens=tokens)

    response = client.get("/me", headers={"Authorization": "Bearer good-token"})

    assert response.status_code == 200
    assert response.json()["username"] is None


def test_me_rejects_missing_token(monkeypatch):
    _install_fake_supabase(monkeypatch)

    response = client.get("/me")

    assert response.status_code == 401


def test_me_rejects_invalid_token(monkeypatch):
    _install_fake_supabase(monkeypatch, tokens={"good-token": {"id": "u1", "email": "user@example.com"}})

    response = client.get("/me", headers={"Authorization": "Bearer wrong-token"})

    assert response.status_code == 401
