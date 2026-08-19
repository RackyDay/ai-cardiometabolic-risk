import os

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


def get_user_scoped_client(access_token: str) -> Client:
    """A fresh anon-key client with the given user's access token attached,
    so PostgREST requests run as that authenticated user and are subject to
    their own RLS policies (e.g. auth.uid() = user_id) instead of needing
    the service-role key.
    """
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    client.postgrest.auth(access_token)
    return client
