from supabase_client import get_user_scoped_client

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

    # Embeds risk_inputs via the riskcalc_id foreign key so this is one
    # round trip instead of a risk_calculations query followed by a
    # separate risk_inputs query.
    response = (user_client.table("risk_calculations")
                .select("riskcalc_id, risk_score, riskcalc_timestamp, risk_inputs(inputs_JSON)")
                .order("riskcalc_timestamp", desc=True)
                .limit(1)
                .execute())

    if not response.data:
        return None

    row = response.data[0]
    embedded_inputs = row.pop("risk_inputs", None) or []
    inputs = embedded_inputs[0] if embedded_inputs else None

    return (row, inputs)