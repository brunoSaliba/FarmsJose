from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.animal_repo import AnimalRepository
from app.repositories.fazenda_repo import FazendaRepository
from app.schemas.animal import AnimalCreate, AnimalUpdate


class AnimalService:
    def __init__(self, session: AsyncSession):
        self.repo = AnimalRepository(session)
        self.fazenda_repo = FazendaRepository(session)

    async def list_animais(
        self,
        *,
        user: User,
        fazenda_id: UUID | None = None,
        sexo: str | None = None,
        lote_numero: int | None = None,
        q: str | None = None,
        page: int = 1,
        limit: int = 20,
    ):
        skip = (page - 1) * limit
        if fazenda_id and not user.is_admin:
            fazenda = await self.fazenda_repo.get_by_id(fazenda_id)
            if not fazenda or fazenda.user_id != user.id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Fazenda nao encontrada",
                )
        user_id_filter = None if user.is_admin else user.id
        items, total = await self.repo.search(
            fazenda_id=fazenda_id,
            sexo=sexo,
            lote_numero=lote_numero,
            q=q,
            user_id=user_id_filter,
            skip=skip,
            limit=limit,
        )
        pages = (total + limit - 1) // limit if limit else 1
        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages,
        }

    async def get_animal(self, animal_id: UUID, user: User):
        """Read-only access — admin can view any animal."""
        if user.is_admin:
            animal = await self.repo.get_by_id(animal_id)
        else:
            animal = await self.repo.get_by_id_and_user(animal_id, user.id)
        if not animal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Animal nao encontrado",
            )
        return animal

    async def _get_owned_animal(self, animal_id: UUID, user: User):
        """Write access — strict ownership, admin cannot modify others' data."""
        animal = await self.repo.get_by_id_and_user(animal_id, user.id)
        if not animal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Animal nao encontrado",
            )
        return animal

    async def create_animal(self, data: AnimalCreate, user: User):
        fazenda = await self.fazenda_repo.get_by_id(data.fazenda_id)
        if not fazenda or fazenda.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Fazenda nao encontrada",
            )
        return await self.repo.create(data.model_dump())

    async def update_animal(self, animal_id: UUID, data: AnimalUpdate, user: User):
        animal = await self._get_owned_animal(animal_id, user)
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return animal
        return await self.repo.update(animal, update_data)

    async def delete_animal(self, animal_id: UUID, user: User):
        animal = await self._get_owned_animal(animal_id, user)
        await self.repo.delete(animal)

    async def get_totalizadores(self, fazenda_id: UUID, user: User):
        fazenda = await self.fazenda_repo.get_by_id(fazenda_id)
        if not fazenda or fazenda.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Fazenda nao encontrada",
            )
        return await self.repo.get_totalizadores(fazenda_id)
