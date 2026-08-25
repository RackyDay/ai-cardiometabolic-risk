from supabase_client import supabase, SUPABASE_URL, SUPABASE_KEY
from supabase import create_client

def save_assessment(user_id, risk_score, model_version, risk_inputs, token):
    user_client = create_client(SUPABASE_URL, SUPABASE_KEY)

    user_client.postgrest.auth(token)

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
    user_client = create_client(SUPABASE_URL, SUPABASE_KEY)

    user_client.postgrest.auth(token)

    user_client.table("risk_calculations").delete().eq("riskcalc_id", riskcalc_id).execute()

def edit_assessment(riskcalc_id, risk_inputs, token):
    user_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    user_client.postgrest.auth(token)

    response = user_client.table("risk_inputs").update({"inputs_JSON": risk_inputs}).eq("riskinput_id", riskcalc_id).execute()

def fetch_risk_calculations(token):
    user_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    user_client.postgrest.auth(token)

    response = (user_client
                .table("risk_calculations")
                .select("riskcalc_id", "risk_score", "riskcalc_timestamp")
                .order("riskcalc_timestamp", desc=True)
                .execute())
    
    return response.data

def fetch_risk_calculation(riskcalc_id, token):
    user_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    user_client.postgrest.auth(token)

    risk_calc = (user_client.table("risk_calculations")
                .select("*")
                .execute()
                )

    risk_inputs = (user_client.table("risk_inputs")
                   .select("*")
                   .eq("riskcalc_id", riskcalc_id))

    return risk_calc, risk_inputs