from datetime import datetime, timedelta
import uuid
from typing import Optional
from fastapi import HTTPException, status
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.core.config import settings
from app.utils.auth import create_access_token, get_password_hash, verify_password
from app.utils.mongo import get_database
from app.schemas.user import UserCreate, UserOut, Token

async def signup_user(user_in: UserCreate) -> dict:
    db = get_database()
    user = await db["users"].find_one({"email": user_in.email})
    if user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists.",
        )
    
    user_dict = user_in.dict()
    if user_dict.get("password"):
        user_dict["hashed_password"] = get_password_hash(user_dict.pop("password"))
    else:
        user_dict.pop("password", None)
        user_dict["hashed_password"] = None

    user_dict["_id"] = str(uuid.uuid4())
    user_dict["created_at"] = datetime.utcnow()
    
    await db["users"].insert_one(user_dict)
    
    user_dict["id"] = user_dict.pop("_id")
    return user_dict

async def authenticate_user(email: str, password: str) -> Optional[dict]:
    db = get_database()
    user = await db["users"].find_one({"email": email})
    if not user or not user.get("hashed_password") or not verify_password(password, user["hashed_password"]):
        return None
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(
            user["email"], expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

async def google_authenticate(token: str) -> dict:
    try:
        idinfo = id_token.verify_oauth2_token(
            token, 
            google_requests.Request(), 
            settings.GOOGLE_CLIENT_ID
        )
        
        email = idinfo['email']
        username = idinfo.get('name', email.split('@')[0])
        picture = idinfo.get('picture')
        
        db = get_database()
        user = await db["users"].find_one({"email": email})
        
        if not user:
            user_dict = {
                "_id": str(uuid.uuid4()),
                "email": email,
                "username": username,
                "picture": picture,
                "provider": "google",
                "hashed_password": None,
                "created_at": datetime.utcnow()
            }
            await db["users"].insert_one(user_dict)
        else:
            await db["users"].update_one(
                {"email": email},
                {"$set": {
                    "picture": picture, 
                    "provider": "google"
                }}
            )

        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        return {
            "access_token": create_access_token(
                email, expires_delta=access_token_expires
            ),
            "token_type": "bearer",
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error during authentication: {str(e)}",
        )
