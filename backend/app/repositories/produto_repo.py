from typing import Any, Sequence
from uuid import UUID

from sqlalchemy import or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.produto import Produto
from app.repositories.base import BaseRepository


class ProdutoRepository(BaseRepository[Produto]):
    def __init__(self, session: AsyncSession):
        super().__init__(Produto, session)

    async def search(
        self,
        *,
        q: str | None = None,
        ativo: bool | None = None,
        user_id: UUID | None = None,
        fabrica_id: UUID | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[Sequence[Produto], int]:
        filters: list[Any] = [Produto.deletado == False]  # noqa: E712
        if fabrica_id is not None:
            filters.append(Produto.fabrica_id == fabrica_id)
        if ativo is not None:
            filters.append(Produto.ativo == ativo)
        if q:
            pattern = f"%{q}%"
            filters.append(
                or_(
                    Produto.nome.ilike(pattern),
                    Produto.descricao.ilike(pattern),
                    Produto.sku.ilike(pattern),
                )
            )
        return await self.get_all(
            skip=skip, limit=limit, filters=filters, order_by=Produto.nome
        )
