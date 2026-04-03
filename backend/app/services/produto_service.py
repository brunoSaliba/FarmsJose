from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import FabricaAccessContext
from app.repositories.produto_repo import ProdutoRepository
from app.schemas.produto import ProdutoCreate, ProdutoUpdate


class ProdutoService:
    def __init__(self, session: AsyncSession):
        self.repo = ProdutoRepository(session)

    async def list_produtos(
        self,
        *,
        ctx: FabricaAccessContext,
        q: str | None = None,
        ativo: bool | None = None,
        page: int = 1,
        limit: int = 20,
    ):
        skip = (page - 1) * limit
        items, total = await self.repo.search(
            q=q, ativo=ativo, fabrica_id=ctx.fabrica.id, skip=skip, limit=limit
        )
        pages = (total + limit - 1) // limit if limit else 1
        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages,
        }

    async def get_produto(self, produto_id: UUID, ctx: FabricaAccessContext):
        produto = await self.repo.get_by_id(produto_id)
        if not produto or produto.deletado or produto.fabrica_id != ctx.fabrica.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Produto nao encontrado",
            )
        return produto

    async def _get_owned_produto(self, produto_id: UUID, ctx: FabricaAccessContext):
        produto = await self.repo.get_by_id(produto_id)
        if not produto or produto.deletado or produto.fabrica_id != ctx.fabrica.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Produto nao encontrado",
            )
        return produto

    async def create_produto(self, data: ProdutoCreate, ctx: FabricaAccessContext):
        data_dict = data.model_dump()
        data_dict["user_id"] = ctx.user.id
        data_dict["fabrica_id"] = ctx.fabrica.id
        return await self.repo.create(data_dict)

    async def update_produto(self, produto_id: UUID, data: ProdutoUpdate, ctx: FabricaAccessContext):
        produto = await self._get_owned_produto(produto_id, ctx)
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return produto
        return await self.repo.update(produto, update_data)

    async def delete_produto(self, produto_id: UUID, ctx: FabricaAccessContext):
        produto = await self._get_owned_produto(produto_id, ctx)
        return await self.repo.update(produto, {"deletado": True})
