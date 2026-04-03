from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.fazenda_repo import FazendaRepository
from app.schemas.fazenda import FazendaCreate, FazendaUpdate


class FazendaService:
    def __init__(self, session: AsyncSession):
        self.repo = FazendaRepository(session)

    async def list_fazendas(
        self,
        *,
        user: User,
        q: str | None = None,
        estado: str | None = None,
        cidade: str | None = None,
        page: int = 1,
        limit: int = 20,
    ):
        skip = (page - 1) * limit
        user_id_filter = None if user.is_admin else user.id
        items, total = await self.repo.search(
            q=q, estado=estado, cidade=cidade, user_id=user_id_filter, skip=skip, limit=limit
        )
        pages = (total + limit - 1) // limit if limit else 1
        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages,
        }

    async def get_resumo_all(self, user: User):
        user_id_filter = None if user.is_admin else user.id
        return await self.repo.get_resumo_all(user_id=user_id_filter)

    async def get_fazenda(self, fazenda_id: UUID, user: User):
        """Read-only access — admin can view any fazenda."""
        fazenda = await self.repo.get_by_id(fazenda_id)
        if not fazenda or (not user.is_admin and fazenda.user_id != user.id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Fazenda nao encontrada",
            )
        return fazenda

    async def _get_owned_fazenda(self, fazenda_id: UUID, user: User):
        """Write access — strict ownership, admin cannot modify others' data."""
        fazenda = await self.repo.get_by_id(fazenda_id)
        if not fazenda or fazenda.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Fazenda nao encontrada",
            )
        return fazenda

    async def create_fazenda(self, data: FazendaCreate, user: User):
        if data.cnpj:
            existing = await self.repo.get_by_cnpj(data.cnpj)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="CNPJ ja cadastrado",
                )
        if data.cpf:
            existing = await self.repo.get_by_cpf(data.cpf)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="CPF ja cadastrado",
                )
        data_dict = data.model_dump()
        data_dict["user_id"] = user.id
        return await self.repo.create(data_dict)

    async def update_fazenda(self, fazenda_id: UUID, data: FazendaUpdate, user: User):
        fazenda = await self._get_owned_fazenda(fazenda_id, user)
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return fazenda

        if "cnpj" in update_data and update_data["cnpj"]:
            existing = await self.repo.get_by_cnpj(update_data["cnpj"])
            if existing and existing.id != fazenda_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="CNPJ ja cadastrado",
                )
        if "cpf" in update_data and update_data["cpf"]:
            existing = await self.repo.get_by_cpf(update_data["cpf"])
            if existing and existing.id != fazenda_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="CPF ja cadastrado",
                )
        return await self.repo.update(fazenda, update_data)

    async def delete_fazenda(self, fazenda_id: UUID, user: User):
        fazenda = await self._get_owned_fazenda(fazenda_id, user)
        has_animals = await self.repo.has_animals(fazenda_id)
        if has_animals:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Fazenda possui animais cadastrados. Remova os animais antes de excluir.",
            )
        await self.repo.delete(fazenda)
