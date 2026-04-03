from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.custo_fazenda import CustoFazenda
from app.repositories.base import BaseRepository


class CustoFazendaRepository(BaseRepository[CustoFazenda]):
    def __init__(self, session: AsyncSession):
        super().__init__(CustoFazenda, session)

    async def get_by_fazenda(self, fazenda_id: UUID) -> CustoFazenda | None:
        result = await self.session.execute(
            select(CustoFazenda).where(CustoFazenda.fazenda_id == fazenda_id)
        )
        return result.scalar_one_or_none()
