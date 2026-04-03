from typing import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.fabrica_unidade import FabricaUsuario
from app.repositories.base import BaseRepository


class FabricaUsuarioRepository(BaseRepository[FabricaUsuario]):
    def __init__(self, session: AsyncSession):
        super().__init__(FabricaUsuario, session)

    async def get_by_user_and_fabrica(self, user_id: UUID, fabrica_id: UUID) -> FabricaUsuario | None:
        result = await self.session.execute(
            select(FabricaUsuario).where(
                FabricaUsuario.user_id == user_id,
                FabricaUsuario.fabrica_id == fabrica_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_by_fabrica(self, fabrica_id: UUID) -> Sequence[FabricaUsuario]:
        result = await self.session.execute(
            select(FabricaUsuario)
            .options(selectinload(FabricaUsuario.user))
            .where(FabricaUsuario.fabrica_id == fabrica_id)
            .order_by(FabricaUsuario.created_at)
        )
        return result.scalars().all()

    async def list_by_user(self, user_id: UUID) -> Sequence[FabricaUsuario]:
        result = await self.session.execute(
            select(FabricaUsuario)
            .where(FabricaUsuario.user_id == user_id, FabricaUsuario.ativo == True)  # noqa: E712
            .order_by(FabricaUsuario.created_at)
        )
        return result.scalars().all()
