from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.core.config import settings
from app.utils.mongo import get_database
from app.utils.auth import verify_access_token
from app.models.user import TokenData

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/login"
)

async def get_current_user(
    token: str = Depends(oauth2_scheme)
):
    email = verify_access_token(token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    token_data = TokenData(email=email)
    
    db = get_database()
    user = await db["users"].find_one({"email": token_data.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Convert _id to id
    user["id"] = str(user.pop("_id"))
    return user
