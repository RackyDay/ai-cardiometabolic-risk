from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from supabase_client import supabase

security = HTTPBearer(auto_error=False)

def get_optional_user(credentials: HTTPAuthorizationCredentials | None = Depends(security)):

    if credentials is None:
        return None #non logged in user
    token = credentials.credentials

    try:
        response = supabase.auth.get_user(token)
        return response.user, token
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def get_current_user(auth = Depends(get_optional_user)):
    if auth is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user, token = auth
    return user