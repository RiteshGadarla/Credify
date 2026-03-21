from fastapi import APIRouter, Body, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.models.user import UserCreate, UserOut, Token
from app.services import auth_service
from app.utils.logger import logger

router = APIRouter()

@router.post("/signup", response_model=UserOut)
async def signup(user_in: UserCreate):
    logger.info(f"Signup attempt started for {user_in.email}")
    return await auth_service.signup_user(user_in)

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    logger.info(f"Login attempt for user: {form_data.username}")
    result = await auth_service.authenticate_user(form_data.username, form_data.password)
    if not result:
        logger.warning(f"Failed login attempt for {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    return result

@router.post("/google", response_model=Token)
async def google_auth(token: str = Body(..., embed=True)):
    """
    Frontend sends Google ID Token (credential).
    Backend verifies it and returns a JWT.
    """
    return await auth_service.google_authenticate(token)
