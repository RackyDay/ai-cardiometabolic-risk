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

def delete_assessment(riskcalc_id, token):
    user_client = create_client(SUPABASE_URL, SUPABASE_KEY)

    user_client.postgrest.auth(token)

    user_client.table("risk_calculations").delete().eq("riskcalc_id", riskcalc_id).execute()