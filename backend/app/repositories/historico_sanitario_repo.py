from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.models.historico_sanitario import HistoricoSanitario
from app.repositories.base import BaseRepository


class HistoricoSanitarioRepository(BaseRepository[HistoricoSanitario]):
    def __init__(self, session: AsyncSession):
        super().__init__(HistoricoSanitario, session)

    async def get_by_animal(self, animal_id: UUID) -> list[HistoricoSanitario]:
        result = await self.session.execute(
            select(HistoricoSanitario)
            .where(HistoricoSanitario.animal_id == animal_id)
            .order_by(HistoricoSanitario.data_aplicacao.desc())
        )
        return list(result.scalars().all())
