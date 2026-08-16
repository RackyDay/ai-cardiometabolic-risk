from supabase_client import supabase

email = "user@example.com"
password = "Password"

response = supabase.auth.sign_in_with_password({"email": email, "password": password,})

token = response.session.access_token
print(token)