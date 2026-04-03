from typing import Any, Sequence
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cliente import Cliente
from app.models.pedido import Pedido
from app.repositories.base import BaseRepository


class ClienteRepository(BaseRepository[Cliente]):
    def __init__(self, session: AsyncSession):
        super().__init__(Cliente, session)

    async def search(
        self,
        *,
        q: str | None = None,
        ativo: bool | None = None,
        user_id: UUID | None = None,
        fabrica_id: UUID | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[Sequence[Cliente], int]:
        filters: list[Any] = [Cliente.deletado == False]  # noqa: E712
        if fabrica_id is not None:
            filters.append(Cliente.fabrica_id == fabrica_id)
        if ativo is not None:
            filters.append(Cliente.ativo == ativo)
        if q:
            pattern = f"%{q}%"
            filters.append(
                or_(
                    Cliente.nome.ilike(pattern),
                    Cliente.email.ilike(pattern),
                    Cliente.cpf_cnpj.ilike(pattern),
                )
            )
        return await self.get_all(
            skip=skip, limit=limit, filters=filters, order_by=Cliente.nome
        )

    async def has_pedidos(self, cliente_id: UUID) -> bool:
        result = await self.session.execute(
            select(func.count()).select_from(Pedido).where(
                Pedido.cliente_id == cliente_id
            )
        )
        return (result.scalar() or 0) > 0
