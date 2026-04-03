from datetime import date
from typing import Any, Sequence
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.pedido import ItemPedido, Pedido, StatusPedido
from app.models.user import User
from app.repositories.base import BaseRepository


class PedidoRepository(BaseRepository[Pedido]):
    def __init__(self, session: AsyncSession):
        super().__init__(Pedido, session)

    async def search(
        self,
        *,
        cliente_id: UUID | None = None,
        status: StatusPedido | None = None,
        data_inicio: date | None = None,
        data_fim: date | None = None,
        user_id: UUID | None = None,
        fabrica_id: UUID | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[Sequence[Pedido], int]:
        filters: list[Any] = []
        if fabrica_id is not None:
            filters.append(Pedido.fabrica_id == fabrica_id)
        if cliente_id is not None:
            filters.append(Pedido.cliente_id == cliente_id)
        if status is not None:
            filters.append(Pedido.status == status)
        if data_inicio is not None:
            filters.append(func.date(Pedido.created_at) >= data_inicio)
        if data_fim is not None:
            filters.append(func.date(Pedido.created_at) <= data_fim)
        return await self.get_all(
            skip=skip, limit=limit, filters=filters, order_by=Pedido.numero.desc(),
            options=[selectinload(Pedido.user)],
        )

    async def get_with_itens(self, pedido_id: UUID) -> Pedido | None:
        result = await self.session.execute(
            select(Pedido)
            .options(selectinload(Pedido.itens), selectinload(Pedido.cliente))
            .where(Pedido.id == pedido_id)
        )
        return result.scalar_one_or_none()

    async def get_by_periodo(
        self,
        *,
        data_inicio: date,
        data_fim: date,
        user_id: UUID | None = None,
        fabrica_id: UUID | None = None,
        statuses: list[StatusPedido] | None = None,
    ) -> Sequence[Pedido]:
        query = (
            select(Pedido)
            .options(selectinload(Pedido.itens), selectinload(Pedido.cliente))
            .where(
                func.date(Pedido.created_at) >= data_inicio,
                func.date(Pedido.created_at) <= data_fim,
            )
        )
        if fabrica_id is not None:
            query = query.where(Pedido.fabrica_id == fabrica_id)
        if statuses:
            query = query.where(Pedido.status.in_(statuses))
        query = query.order_by(Pedido.numero)
        result = await self.session.execute(query)
        return result.scalars().all()

    async def delete_itens(self, pedido_id: UUID) -> None:
        items = await self.session.execute(
            select(ItemPedido).where(ItemPedido.pedido_id == pedido_id)
        )
        for item in items.scalars().all():
            await self.session.delete(item)
        await self.session.flush()
