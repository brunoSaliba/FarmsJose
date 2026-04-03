from uuid import UUID

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.deps import get_current_user, get_admin_user
from app.models.user import User
from app.repositories.user_repo import UserRepository
from app.schemas.user import LoginRequest, TokenResponse, UserCreate, UserResponse, UserSelfUpdate, UserUpdate
from app.services.user_service import UserService
from app.utils.security import create_access_token, create_refresh_token, verify_refresh_token

router = APIRouter(prefix="/auth", tags=["Auth"])

_COOKIE_NAME = "refresh_token"
_COOKIE_MAX_AGE = settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=_COOKIE_MAX_AGE,
        path="/api/v1/auth",
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    svc = UserService(db)
    tokens = await svc.authenticate(body.email, body.password)
    _set_refresh_cookie(response, tokens["refresh_token"])
    return {"access_token": tokens["access_token"], "token_type": "bearer"}


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response,
    db: AsyncSession = Depends(get_db),
    refresh_token: str | None = Cookie(None),
):
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token ausente")
    user_id = verify_refresh_token(refresh_token)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token invalido ou expirado")
    repo = UserRepository(db)
    user = await repo.get_by_id(UUID(user_id))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario inativo")
    new_access = create_access_token(str(user.id))
    new_refresh = create_refresh_token(str(user.id))
    _set_refresh_cookie(response, new_refresh)
    return {"access_token": new_access, "token_type": "bearer"}


@router.post("/logout", status_code=204)
async def logout(response: Response):
    response.delete_cookie(key=_COOKIE_NAME, path="/api/v1/auth")



@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return user


@router.put("/me", response_model=UserResponse)
async def update_me(
    body: UserSelfUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from fastapi import HTTPException, status
    from app.utils.security import verify_password
    # If changing email or password, require current_password
    if (body.email or body.password) and not body.current_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe a senha atual para alterar email ou senha",
        )
    if body.current_password and not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Senha atual incorreta",
        )
    update_fields = body.model_dump(exclude={"current_password"}, exclude_unset=True)
    update_data = UserUpdate(**update_fields)
    svc = UserService(db)
    return await svc.update_user(current_user.id, update_data)


@router.get("/users", response_model=list[UserResponse])
async def list_users(db: AsyncSession = Depends(get_db), _admin: User = Depends(get_admin_user)):
    svc = UserService(db)
    return await svc.list_users()


@router.post("/users", response_model=UserResponse, status_code=201)
async def create_user(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    svc = UserService(db)
    return await svc.create_user(body)


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    svc = UserService(db)
    return await svc.update_user(user_id, body)


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _admin: User = Depends(get_admin_user),
):
    svc = UserService(db)
    await svc.delete_user(user_id, current_user.id)
