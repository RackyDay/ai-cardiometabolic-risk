from supabase_client import get_user_scoped_client
from auth import _maybe_single_data

def save_assessment(user_id, risk_score, model_version, risk_inputs, token):

    user_client = get_user_scoped_client(token)

    response = user_client.table("risk_calculations").insert({
                "user_id": user_id,
                "risk_score": risk_score,
                "model_version": model_version
    }).execute()

    riskcalc_id = response.data[0]["riskcalc_id"]

    user_client.table("risk_inputs").insert({
        "riskcalc_id": riskcalc_id,
        "inputs_JSON": risk_inputs
    }).execute()

    return riskcalc_id

def delete_assessment(riskcalc_id, token):
    user_client = get_user_scoped_client(token)

    user_client.table("risk_calculations").delete().eq("riskcalc_id", riskcalc_id).execute()

def edit_assessment(riskcalc_id, risk_inputs, token):
    user_client = get_user_scoped_client(token)

    user_client.table("risk_inputs").update({"inputs_JSON": risk_inputs}).eq("riskinput_id", riskcalc_id).execute()

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

    risk_calc = (user_client.table("risk_calculations")
                .select("*")
                .execute()
                )

    risk_inputs = (user_client.table("risk_inputs")
                   .select("*")
                   .eq("riskcalc_id", riskcalc_id))

    return risk_calc, risk_inputs

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