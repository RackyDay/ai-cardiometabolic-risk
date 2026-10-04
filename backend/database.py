from supabase_client import get_user_scoped_client
from auth import _maybe_single_data

def save_assessment(user_id, risk_score, model_version, risk_inputs, token, context=None):

    user_client = get_user_scoped_client(token)

    response = user_client.table("risk_calculations").insert({
                "user_id": user_id,
                "risk_score": risk_score,
                "model_version": model_version
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


def latest_assessment_id(token):
    rows = (get_user_scoped_client(token).table("risk_calculations")
            .select("riskcalc_id").order("riskcalc_timestamp", desc=True).limit(1).execute().data)
    return rows[0]["riskcalc_id"] if rows else None


def save_stress(riskcalc_id, stress, token):
    # The user-scoped client enforces ownership through the existing RLS rules.
    client = get_user_scoped_client(token)
    rows = client.table("risk_inputs").select("context_JSON").eq("riskcalc_id", riskcalc_id).execute().data
    if not rows:
        return None
    context = dict(rows[0].get("context_JSON") or {})
    context["stress"] = stress
    updated = client.table("risk_inputs").update({"context_JSON": context}).eq("riskcalc_id", riskcalc_id).execute()
    return context if updated.data else None

def update_assessment(riskcalc_id, risk_score, risk_inputs, token):
    user_client = get_user_scoped_client(token)

    user_client.table("risk_calculations").update(
        {"risk_score": risk_score}
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

    risk_calc_response = (
        user_client
        .table("risk_calculations")
        .select("*")
        .eq("riskcalc_id", riskcalc_id)
        .execute()
    )

    risk_inputs_response = (
        user_client
        .table("risk_inputs")
        .select("*")
        .eq("riskcalc_id", riskcalc_id)
        .execute()
    )

    return risk_calc_response.data, risk_inputs_response.data

def fetch_latest_risk_calculation(token):
    user_client = get_user_scoped_client(token)

    risk_calc = (user_client.table("risk_calculations")
                .select("riskcalc_id, risk_score, riskcalc_timestamp")
                .order("riskcalc_timestamp", desc=True)
                .limit(1)
                .execute())

    if not risk_calc.data:
        return None

    latest = risk_calc.data[0]

    inputs = _maybe_single_data(
        user_client.table("risk_inputs")
        .select("inputs_JSON")
        .eq("riskcalc_id", latest["riskcalc_id"])
        .maybe_single()
    )

    return (latest, inputs)
