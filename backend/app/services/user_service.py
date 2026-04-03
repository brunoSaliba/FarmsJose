from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.user_repo import UserRepository
from app.schemas.user import UserCreate, UserUpdate
from app.utils.security import hash_password, verify_password, create_access_token, create_refresh_token


class UserService:
    def __init__(self, session: AsyncSession):
        self.repo = UserRepository(session)

    async def authenticate(self, email: str, password: str) -> dict:
        user = await self.repo.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou senha incorretos",
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuario inativo",
            )
        return {
            "access_token": create_access_token(str(user.id)),
            "refresh_token": create_refresh_token(str(user.id)),
            "token_type": "bearer",
        }

    async def get_user(self, user_id: UUID) -> User:
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario nao encontrado",
            )
        return user

    async def create_user(self, data: UserCreate) -> User:
        existing = await self.repo.get_by_email(data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email ja cadastrado",
            )
        user_data = data.model_dump(exclude={"password"})
        user_data["hashed_password"] = hash_password(data.password)
        return await self.repo.create(user_data)

    async def update_user(self, user_id: UUID, data: UserUpdate) -> User:
        user = await self.get_user(user_id)
        update_data = data.model_dump(exclude_unset=True)
        if "password" in update_data:
            update_data["hashed_password"] = hash_password(update_data.pop("password"))
        if "email" in update_data and update_data["email"] != user.email:
            existing = await self.repo.get_by_email(update_data["email"])
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Email ja cadastrado",
                )
        return await self.repo.update(user, update_data)

    async def delete_user(self, user_id: UUID, requesting_user_id: UUID) -> None:
        if user_id == requesting_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nao e possivel apagar seu proprio usuario",
            )
        user = await self.get_user(user_id)
        await self.repo.delete(user)

    async def list_users(self):
        users, total = await self.repo.get_all(limit=1000)
        return list(users)
