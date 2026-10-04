from postgrest.exceptions import APIError

from supabase_client import get_user_scoped_client

# PostgREST's error code for "no function matches this name/signature in
# the schema cache" - i.e. the atomic-write migration hasn't been applied
# to this database yet. Anything else is a real failure and must surface,
# not be swallowed into the slower fallback path.
_RPC_NOT_FOUND = "PGRST202"


def save_assessment(user_id, risk_score, model_version, risk_inputs, top_contributors, token, context=None):
    user_client = get_user_scoped_client(token)

    # One round trip (both inserts run atomically inside the Postgres
    # function - see the 2026-10-01 migration) instead of inserting into
    # risk_calculations then risk_inputs separately. Falls back to the
    # original two-insert sequence if that migration isn't applied yet, so
    # this code works regardless of deploy/migration ordering.
    try:
        response = user_client.rpc("save_assessment_atomic", {
            "p_user_id": user_id,
            "p_risk_score": risk_score,
            "p_model_version": model_version,
            "p_inputs": risk_inputs,
            "p_top_contributors": top_contributors,
        }).execute()
        return response.data
    except APIError as exc:
        if exc.code != _RPC_NOT_FOUND:
            raise

    response = user_client.table("risk_calculations").insert({
                "user_id": user_id,
                "risk_score": risk_score,
                "model_version": model_version,
                "top_contributors": top_contributors,
    }).execute()

    riskcalc_id = response.data[0]["riskcalc_id"]

    user_client.table("risk_inputs").insert({
        "riskcalc_id": riskcalc_id,
        "inputs_JSON": risk_inputs,
        "context_JSON": context,
    }).execute()

    return riskcalc_id

def delete_assessment(riskcalc_id, token):
    user_client = get_user_scoped_client(token)

    user_client.table("risk_calculations").delete().eq("riskcalc_id", riskcalc_id).execute()

def update_assessment(riskcalc_id, risk_score, risk_inputs, top_contributors, token):
    user_client = get_user_scoped_client(token)

    # Same one-round-trip/fallback approach as save_assessment above.
    try:
        user_client.rpc("update_assessment_atomic", {
            "p_riskcalc_id": riskcalc_id,
            "p_risk_score": risk_score,
            "p_inputs": risk_inputs,
            "p_top_contributors": top_contributors,
        }).execute()
        return
    except APIError as exc:
        if exc.code != _RPC_NOT_FOUND:
            raise

    user_client.table("risk_calculations").update(
        {"risk_score": risk_score, "top_contributors": top_contributors}
    ).eq("riskcalc_id", riskcalc_id).execute()

    # risk_inputs' own primary key is riskinput_id - riskcalc_id is only its
    # foreign key back to risk_calculations, so the filter has to be on
    # riskcalc_id here, not riskinput_id.
    user_client.table("risk_inputs").update(
        {"inputs_JSON": risk_inputs}
    ).eq("riskcalc_id", riskcalc_id).execute()

def fetch_assessment_history(token):
    user_client = get_user_scoped_client(token)

    response = (user_client
                .table("risk_calculations")
                .select("riskcalc_id", "risk_score", "riskcalc_timestamp")
                .order("riskcalc_timestamp", desc=True)
                .execute())
    
    return response.data

def fetch_risk_calculation(riskcalc_id, token):
    user_client = get_user_scoped_client(token)

    # Embeds risk_inputs via the riskcalc_id foreign key so this is one
    # round trip instead of a risk_calculations query followed by a
    # separate risk_inputs query - same fix as fetch_latest_risk_calculation.
    response = (
        user_client
        .table("risk_calculations")
        .select("*, risk_inputs(*)")
        .eq("riskcalc_id", riskcalc_id)
        .execute()
    )

    if not response.data:
        return [], []

    row = response.data[0]
    embedded_inputs = row.pop("risk_inputs", None) or []

    return [row], embedded_inputs

def fetch_latest_risk_calculation(token):
    user_client = get_user_scoped_client(token)

    # Embeds risk_inputs via the riskcalc_id foreign key so this is one
    # round trip instead of a risk_calculations query followed by a
    # separate risk_inputs query.
    response = (user_client.table("risk_calculations")
                .select("riskcalc_id, risk_score, riskcalc_timestamp, top_contributors, risk_inputs(inputs_JSON)")
                .order("riskcalc_timestamp", desc=True)
                .limit(1)
                .execute())

    if not response.data:
        return None

    row = response.data[0]
    embedded_inputs = row.pop("risk_inputs", None) or []
    inputs = embedded_inputs[0] if embedded_inputs else None

    return (row, inputs)
