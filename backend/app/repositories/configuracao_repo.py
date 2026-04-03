from typing import Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.configuracao import Configuracao
from app.repositories.base import BaseRepository


class ConfiguracaoRepository(BaseRepository[Configuracao]):
    def __init__(self, session: AsyncSession):
        super().__init__(Configuracao, session)

    async def get_by_chave(self, fabrica_id, chave: str) -> Configuracao | None:
        result = await self.session.execute(
            select(Configuracao).where(
                Configuracao.fabrica_id == fabrica_id,
                Configuracao.chave == chave,
            )
        )
        return result.scalar_one_or_none()

    async def get_all_by_fabrica(self, fabrica_id) -> Sequence[Configuracao]:
        result = await self.session.execute(
            select(Configuracao)
            .where(Configuracao.fabrica_id == fabrica_id)
            .order_by(Configuracao.chave)
        )
        return result.scalars().all()

    async def get_all_by_user(self, user_id):
        return await self.get_all_by_fabrica(user_id)

    async def upsert(self, fabrica_id, chave: str, valor: str) -> Configuracao:
        existing = await self.get_by_chave(fabrica_id, chave)
        if existing:
            return await self.update(existing, {"valor": valor})
        return await self.create({"fabrica_id": fabrica_id, "chave": chave, "valor": valor})
