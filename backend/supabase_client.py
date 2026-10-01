import os
from functools import lru_cache

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# Anon-key client: subject to RLS, used for auth (sign up/in) and any
# operation performed as the anonymous role.
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Service-role client: bypasses RLS. Server-side only - never expose this
# key or this client's results to the frontend. Used for cross-user lookups
# (e.g. resolving a username to an email at login) that RLS deliberately
# blocks for the anon/authenticated roles.
supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


@lru_cache(maxsize=256)
def get_user_scoped_client(access_token: str) -> Client:
    """An anon-key client with the given user's access token attached, so
    PostgREST requests run as that authenticated user and are subject to
    their own RLS policies (e.g. auth.uid() = user_id) instead of needing
    the service-role key.

    Cached per access token (an lru_cache, not a fresh create_client() every
    call) so requests from the same session reuse one underlying connection
    pool instead of paying a new TCP+TLS handshake to Supabase on every
    request. Safe to cache: a given token's scope never changes, so a cache
    hit is byte-for-byte what a fresh client would have produced. Eviction
    only needs to bound memory - an expired/invalidated token simply fails
    at the Supabase API layer the same way a freshly-built client's would.
    """
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    client.postgrest.auth(access_token)
    return client
