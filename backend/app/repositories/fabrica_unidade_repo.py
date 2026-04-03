from typing import Any, Sequence
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.fabrica_unidade import FabricaUnidade, FabricaUsuario
from app.repositories.base import BaseRepository


class FabricaUnidadeRepository(BaseRepository[FabricaUnidade]):
    def __init__(self, session: AsyncSession):
        super().__init__(FabricaUnidade, session)

    async def search(
        self,
        *,
        q: str | None = None,
        ativo: bool | None = None,
        user_id: UUID | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[Sequence[FabricaUnidade], int]:
        filters: list[Any] = [FabricaUnidade.deletado == False]  # noqa: E712
        if user_id is not None:
            filters.append(FabricaUnidade.user_id == user_id)
        if ativo is not None:
            filters.append(FabricaUnidade.ativo == ativo)
        if q:
            pattern = f"%{q}%"
            filters.append(
                or_(
                    FabricaUnidade.nome.ilike(pattern),
                    FabricaUnidade.email_pedido.ilike(pattern),
                )
            )
        return await self.get_all(
            skip=skip, limit=limit, filters=filters, order_by=FabricaUnidade.nome
        )

    async def search_by_user_membership(
        self,
        *,
        user_id: UUID,
        q: str | None = None,
        ativo: bool | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[Sequence[FabricaUnidade], int]:
        filters: list[Any] = [FabricaUsuario.user_id == user_id, FabricaUsuario.ativo == True]  # noqa: E712
        if ativo is not None:
            filters.append(FabricaUnidade.ativo == ativo)
        if q:
            pattern = f"%{q}%"
            filters.append(
                or_(
                    FabricaUnidade.nome.ilike(pattern),
                    FabricaUnidade.email_pedido.ilike(pattern),
                )
            )

        query = (
            select(FabricaUnidade)
            .join(FabricaUsuario, FabricaUsuario.fabrica_id == FabricaUnidade.id)
            .where(FabricaUnidade.deletado == False, *filters)  # noqa: E712
            .order_by(FabricaUnidade.nome)
            .offset(skip)
            .limit(limit)
        )
        count_query = (
            select(FabricaUnidade.id)
            .join(FabricaUsuario, FabricaUsuario.fabrica_id == FabricaUnidade.id)
            .where(FabricaUnidade.deletado == False, *filters)  # noqa: E712
        )
        items = (await self.session.execute(query)).scalars().all()
        total = len((await self.session.execute(count_query)).scalars().all())
        return items, total
