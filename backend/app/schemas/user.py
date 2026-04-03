import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginRequest(BaseModel):
    email: str = Field(..., max_length=200)
    password: str = Field(..., min_length=4)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: uuid.UUID
    nome: str
    email: str
    is_admin: bool
    is_active: bool
    modulos: list[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=200)
    email: str = Field(..., max_length=200)
    password: str = Field(..., min_length=4)
    is_admin: bool = False
    modulos: list[str] = []


class UserSelfUpdate(BaseModel):
    nome: str | None = Field(None, min_length=2, max_length=200)
    email: str | None = Field(None, max_length=200)
    password: str | None = Field(None, min_length=4)
    current_password: str | None = Field(None, min_length=4)


class UserUpdate(BaseModel):
    nome: str | None = Field(None, min_length=2, max_length=200)
    email: str | None = Field(None, max_length=200)
    password: str | None = Field(None, min_length=4)
    is_admin: bool | None = None
    is_active: bool | None = None
    modulos: list[str] | None = None
