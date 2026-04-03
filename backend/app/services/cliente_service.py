from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import FabricaAccessContext
from app.repositories.cliente_repo import ClienteRepository
from app.schemas.cliente import ClienteCreate, ClienteUpdate


class ClienteService:
    def __init__(self, session: AsyncSession):
        self.repo = ClienteRepository(session)

    async def list_clientes(
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

    async def get_cliente(self, cliente_id: UUID, ctx: FabricaAccessContext):
        """Read-only access — admin can view any cliente."""
        cliente = await self.repo.get_by_id(cliente_id)
        if not cliente or cliente.deletado or cliente.fabrica_id != ctx.fabrica.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cliente nao encontrado",
            )
        return cliente

    async def _get_owned_cliente(self, cliente_id: UUID, ctx: FabricaAccessContext):
        """Write access — strict ownership, admin cannot modify others' data."""
        cliente = await self.repo.get_by_id(cliente_id)
        if not cliente or cliente.deletado or cliente.fabrica_id != ctx.fabrica.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cliente nao encontrado",
            )
        return cliente

    async def create_cliente(self, data: ClienteCreate, ctx: FabricaAccessContext):
        data_dict = data.model_dump()
        data_dict["user_id"] = ctx.user.id
        data_dict["fabrica_id"] = ctx.fabrica.id
        return await self.repo.create(data_dict)

    async def update_cliente(self, cliente_id: UUID, data: ClienteUpdate, ctx: FabricaAccessContext):
        cliente = await self._get_owned_cliente(cliente_id, ctx)
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return cliente
        return await self.repo.update(cliente, update_data)

    async def delete_cliente(self, cliente_id: UUID, ctx: FabricaAccessContext):
        cliente = await self._get_owned_cliente(cliente_id, ctx)
        return await self.repo.update(cliente, {"deletado": True})
