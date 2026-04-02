from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from app.core.auth import create_access_token, get_current_user, hash_password, verify_password
from app.core.database import get_async_db
from app.models.user import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


class SignupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    team: str


class AuthResponse(BaseModel):
    user: UserResponse
    token: str


@router.post("/signup", response_model=AuthResponse)
async def signup(body: SignupRequest):
    db = get_async_db()

    existing = await db.users.find_one({"email": body.email})
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        name=body.name,
        email=body.email,
        hashed_password=hash_password(body.password),
    )
    await db.users.insert_one(user.to_doc())

    token = create_access_token(user.id)
    return AuthResponse(
        user=UserResponse(id=user.id, email=user.email, name=user.name, team=user.team),
        token=token,
    )


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    db = get_async_db()

    doc = await db.users.find_one({"email": body.email})
    if not doc or not verify_password(body.password, doc["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    user = User.from_doc(doc)
    token = create_access_token(user.id)
    return AuthResponse(
        user=UserResponse(id=user.id, email=user.email, name=user.name, team=user.team),
        token=token,
    )


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return UserResponse(id=user.id, email=user.email, name=user.name, team=user.team)
