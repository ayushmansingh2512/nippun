from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.schema import User
from app.services.auth_service import hash_password, verify_password, generate_session_token

router = APIRouter()

class SignupRequest(BaseModel):
    username: str
    password: str
    full_name: Optional[str] = None
    email: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(req: SignupRequest, db: AsyncSession = Depends(get_db)):
    clean_username = req.username.strip().lower()
    if len(clean_username) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be at least 3 characters long."
        )
    if len(req.password) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 4 characters long."
        )

    # Check if username already exists in Neon DB
    stmt = select(User).where(User.username == clean_username)
    result = await db.execute(stmt)
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{clean_username}' is already registered. Please choose another or login."
        )

    # Hash password and create user in Neon PostgreSQL
    hashed_pwd = hash_password(req.password)
    new_user = User(
        username=clean_username,
        password_hash=hashed_pwd,
        full_name=req.full_name or clean_username,
        email=req.email,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    token = generate_session_token(new_user.username)

    return {
        "success": True,
        "message": "User registered successfully in Neon DB.",
        "username": new_user.username,
        "full_name": new_user.full_name,
        "token": token,
    }

@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    clean_username = req.username.strip().lower()

    # Query user from Neon DB
    stmt = select(User).where(User.username == clean_username)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password."
        )

    token = generate_session_token(user.username)

    return {
        "success": True,
        "message": "Login successful.",
        "username": user.username,
        "full_name": user.full_name,
        "token": token,
    }

@router.get("/me")
async def get_current_user_profile(username: str, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.username == username.strip().lower())
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "username": user.username,
        "full_name": user.full_name,
        "email": user.email,
        "created_at": user.created_at.isoformat(),
    }
