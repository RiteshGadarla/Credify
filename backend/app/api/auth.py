from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Body, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from ..core.config import settings
from ..core.security import create_access_token, get_password_hash, verify_password
from ..db.mongodb import get_database
from ..models.user import UserCreate, UserOut, Token, UserInDB
from datetime import datetime
import uuid

router = APIRouter()

@router.post("/signup", response_model=UserOut)
async def signup(user_in: UserCreate):
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
        # For social login or empty password signup
        user_dict.pop("password")
        user_dict["hashed_password"] = None

    user_dict["_id"] = str(uuid.uuid4())
    user_dict["created_at"] = datetime.utcnow()
    
    await db["users"].insert_one(user_dict)
    
    # Return user with id string
    user_dict["id"] = user_dict.pop("_id")
    return user_dict

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    db = get_database()
    user = await db["users"].find_one({"email": form_data.username})
    if not user or not user.get("hashed_password") or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(
            user["email"], expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.post("/google", response_model=Token)
async def google_auth(token: str = Body(..., embed=True)):
    """
    Frontend sends Google ID Token (credential)
    Backend verifies it and returns a JWT
    """
    try:
        # Verify Google ID token
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
            # Create a new user if they don't exist
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
            # Update user info and ensure provider is set to google
            await db["users"].update_one(
                {"email": email},
                {"$set": {
                    "picture": picture, 
                    "provider": "google"
                }}
            )

        # Generate our own internal JWT for the session
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        return {
            "access_token": create_access_token(
                email, expires_delta=access_token_expires
            ),
            "token_type": "bearer",
        }
    except ValueError as e:
        # Invalid token
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}",
        )
    except Exception as e:
        # Other errors
        print(f"Error during Google Auth: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during authentication",
        )
