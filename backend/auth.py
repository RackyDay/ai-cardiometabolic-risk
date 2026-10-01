from types import SimpleNamespace

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from supabase_client import supabase, supabase_admin
from schemas import AuthResponse, LoginRequest, SignUpRequest, UserOut

security = HTTPBearer(auto_error=False)

def _maybe_single_data(query) -> dict | None:
    """.maybe_single().execute() returns None outright (not a response
    object with .data=None) when zero rows match - not an object with a
    .data attribute you can safely check. Normalize both cases to a dict or
    None so callers don't have to know about that quirk.
    """
    result = query.execute()
    return result.data if result is not None else None

def get_optional_user(credentials: HTTPAuthorizationCredentials | None = Depends(security)):

    if credentials is None:
        return None #non logged in user
    token = credentials.credentials

    # get_claims() verifies the JWT locally (this project signs with ES256,
    # so it checks the signature against Supabase's cached public key set
    # instead of calling the Auth server on every request) rather than
    # get_user()'s round trip to /auth/v1/user. The trade-off: a token
    # revoked server-side (e.g. explicit logout, forced password reset)
    # still verifies locally until it naturally expires - local
    # verification can't see that revocation, only expiry.
    try:
        claims = supabase.auth.get_claims(token)
        if claims is None:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        payload = claims["claims"]
        user = SimpleNamespace(id=payload["sub"], email=payload.get("email"))
        return user, token
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def get_current_user_and_token(auth = Depends(get_optional_user)):
    if auth is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user, token = auth
    return (user, token)

def _resolve_login_email(identifier: str) -> str:
    """Accept either an email or a username and return the email to
    authenticate with. Username -> user_id goes through the service-role
    client (RLS on public.profiles only lets a user read their own row);
    user_id -> email is then read live from auth.users via the Admin API,
    rather than a denormalized copy - one extra round trip per username
    login, but no second copy of email that could ever drift out of sync.
    """
    if "@" in identifier:
        return identifier

    data = _maybe_single_data(
        supabase_admin.table("profiles").select("user_id").eq("user_displayname", identifier).maybe_single()
    )
    if not data or not data.get("user_id"):
        # Unknown username - raise the same generic error the caller uses
        # for a wrong password, so login never reveals which part was wrong.
        raise HTTPException(status_code=401, detail="Invalid email/username or password")

    try:
        user = supabase_admin.auth.admin.get_user_by_id(data["user_id"]).user
    except Exception:
        user = None

    if not user or not user.email:
        raise HTTPException(status_code=401, detail="Invalid email/username or password")

    return user.email


def sign_up(req: SignUpRequest) -> AuthResponse:
    """Create an account. Password hashing/salting is entirely Supabase
    Auth's responsibility (GoTrue, bcrypt) - this function never sees or
    stores a hash itself, only forwards the plaintext password once to
    supabase.auth.sign_up over HTTPS, same as any password field would be.
    """
    # Check username availability up front via the service-role client
    # (bypasses RLS). Without this, a taken username would only surface as
    # a Postgres unique-violation raised inside the handle_new_user()
    # trigger, which fails the auth.users insert itself and surfaces as an
    # opaque 500 from Supabase Auth instead of a clean 409 here.
    existing = _maybe_single_data(
        supabase_admin.table("profiles").select("user_id").eq("user_displayname", req.username).maybe_single()
    )
    if existing:
        raise HTTPException(status_code=409, detail="That username is already taken")

    try:
        # "username" here is just the auth.users.raw_user_meta_data JSON key
        # handle_new_user() reads from - unrelated to the profiles column
        # name, which is user_displayname (see the consolidation migration).
        result = supabase.auth.sign_up({
            "email": req.email,
            "password": req.password,
            "options": {"data": {"username": req.username}},
        })
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    user = result.user
    session = result.session

    if user is not None and not user.identities:
        # Supabase's anti-enumeration behavior: signing up with an email
        # that already has a confirmed account succeeds with no error, no
        # email sent, and no identities on the returned user - the only
        # signal that it was a no-op.
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    if session is None:
        # Email confirmation is required by the project's Auth settings -
        # no session yet, the user must confirm via the emailed link first.
        return AuthResponse(email_confirmation_required=True)

    return AuthResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        user=UserOut(id=user.id, email=user.email, username=req.username),
    )


def log_in(req: LoginRequest) -> AuthResponse:
    """Log in with either an email or a username + password. Password
    verification happens entirely inside supabase.auth.sign_in_with_password
    - this function only ever sees a pass/fail result, never a stored hash.
    """
    email = _resolve_login_email(req.identifier)

    try:
        result = supabase.auth.sign_in_with_password({
            "email": email,
            "password": req.password,
        })
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid email/username or password")

    session = result.session
    user = result.user
    if session is None or user is None:
        raise HTTPException(status_code=401, detail="Invalid email/username or password")

    profile = _maybe_single_data(
        supabase_admin.table("profiles").select("user_displayname").eq("user_id", user.id).maybe_single()
    )
    username = profile.get("user_displayname") if profile else None

    return AuthResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        user=UserOut(id=user.id, email=user.email, username=username),
    )


def log_out(access_token: str) -> None:
    try:
        supabase_admin.auth.admin.sign_out(access_token)
    except Exception:
        # Logout is best-effort server-side revocation; the frontend clears
        # its local session regardless, so a failure here isn't fatal.
        pass


def update_username(user, new_username: str) -> UserOut:
    """Change the logged-in user's display name. Uniqueness is checked the
    same way sign_up does it - a service-role read of public.profiles, since
    RLS only lets a user see their own row - and the write goes to both
    stores signup populates: public.profiles.user_displayname (what login and
    /me read) and auth.users.raw_user_meta_data.username (what the Google
    session path reads), so the two can't drift apart.
    """
    existing = _maybe_single_data(
        supabase_admin.table("profiles").select("user_id").eq("user_displayname", new_username).maybe_single()
    )
    if existing and existing.get("user_id") != user.id:
        raise HTTPException(status_code=409, detail="That username is already taken")

    supabase_admin.table("profiles").update(
        {"user_displayname": new_username}
    ).eq("user_id", user.id).execute()

    try:
        supabase_admin.auth.admin.update_user_by_id(
            user.id, {"user_metadata": {"username": new_username}}
        )
    except Exception:
        # Best-effort metadata mirror: profiles is the source of truth for a
        # password account, so a failure here doesn't fail the request.
        pass

    return UserOut(id=user.id, email=user.email, username=new_username)


def _verify_current_password(user, current_password: str) -> None:
    """Re-check the caller's password with a plain sign-in (same call log_in
    uses - a pass/fail result, never a stored hash). Gate for the
    destructive/sensitive account actions below, so a walked-away logged-in
    session can't change the password or delete the account outright.
    """
    try:
        result = supabase.auth.sign_in_with_password({
            "email": user.email,
            "password": current_password,
        })
    except Exception:
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    if result.session is None:
        raise HTTPException(status_code=401, detail="Current password is incorrect")


def update_password(user, current_password: str, new_password: str) -> None:
    """Change the logged-in user's password. current_password is verified
    first (see _verify_current_password); the change itself goes through the
    Admin API rather than relying on the shared client holding this user's
    session.
    """
    _verify_current_password(user, current_password)

    try:
        supabase_admin.auth.admin.update_user_by_id(user.id, {"password": new_password})
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


def delete_account(user, current_password: str) -> None:
    """Permanently delete the logged-in user's account after re-verifying the
    current password. Removal is in two parts: the auth.users row (email +
    password hash, owned by Supabase Auth) via the Admin API, then the
    public.profiles row (the username), whose ON DELETE CASCADE clears this
    user's risk_calculations and, through them, risk_inputs. There is no
    on_auth_user_deleted trigger, so the profiles row has to be removed
    explicitly - deleting the auth user alone would orphan it.
    """
    _verify_current_password(user, current_password)

    try:
        supabase_admin.auth.admin.delete_user(user.id)
    except Exception as exc:
        # Nothing has been deleted yet - surface it and leave the account
        # intact rather than half-removing it.
        raise HTTPException(status_code=500, detail=f"Couldn't delete account: {exc}")

    try:
        supabase_admin.table("profiles").delete().eq("user_id", user.id).execute()
    except Exception:
        # The account itself is already gone (step above) - the user can no
        # longer sign in. A leftover, now-orphaned profiles row is harmless;
        # don't fail a request the user already sees as done.
        pass
