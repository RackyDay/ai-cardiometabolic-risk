from supabase_client import supabase, SUPABASE_URL, SUPABASE_KEY
from supabase import create_client

def save_assessment(user_id, risk_score, model_version, token):
    user_client = create_client(SUPABASE_URL, SUPABASE_KEY)

    user_client.postgrest.auth(token)

    response = user_client.table("risk_calculations").insert({
                "user_id": user_id,
                "risk_score": risk_score,
                "model_version": model_version
    }).execute()

    print(response.data)