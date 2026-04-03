from typing import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.email_log import EmailLog, StatusEmail
from app.repositories.base import BaseRepository


class EmailLogRepository(BaseRepository[EmailLog]):
    def __init__(self, session: AsyncSession):
        super().__init__(EmailLog, session)

    async def get_by_pedido(self, pedido_id: UUID) -> Sequence[EmailLog]:
        result = await self.session.execute(
            select(EmailLog)
            .where(EmailLog.pedido_id == pedido_id)
            .order_by(EmailLog.created_at.desc())
        )
        return result.scalars().all()

    async def get_by_user(
        self, user_id: UUID, *, skip: int = 0, limit: int = 50
    ) -> tuple[Sequence[EmailLog], int]:
        from sqlalchemy import func

        filters = [EmailLog.user_id == user_id]
        return await self.get_all(
            skip=skip, limit=limit, filters=filters, order_by=EmailLog.created_at.desc()
        )

    async def get_pendentes(self, user_id: UUID) -> Sequence[EmailLog]:
        result = await self.session.execute(
            select(EmailLog).where(
                EmailLog.user_id == user_id,
                EmailLog.status.in_([StatusEmail.PENDENTE, StatusEmail.FALHA]),
            )
        )
        return result.scalars().all()
