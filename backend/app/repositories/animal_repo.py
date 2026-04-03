from typing import Any, Sequence
from uuid import UUID

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.animal import Animal
from app.models.fazenda import Fazenda
from app.repositories.base import BaseRepository


class AnimalRepository(BaseRepository[Animal]):
    def __init__(self, session: AsyncSession):
        super().__init__(Animal, session)

    async def search(
        self,
        *,
        fazenda_id: UUID | None = None,
        sexo: str | None = None,
        lote_numero: int | None = None,
        q: str | None = None,
        user_id: UUID | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[Sequence[Animal], int]:
        query = select(Animal)
        count_query = select(func.count()).select_from(Animal)

        if user_id is not None:
            query = query.join(Fazenda, Animal.fazenda_id == Fazenda.id)
            count_query = count_query.join(Fazenda, Animal.fazenda_id == Fazenda.id)
            query = query.where(Fazenda.user_id == user_id)
            count_query = count_query.where(Fazenda.user_id == user_id)

        if fazenda_id:
            query = query.where(Animal.fazenda_id == fazenda_id)
            count_query = count_query.where(Animal.fazenda_id == fazenda_id)
        if sexo:
            query = query.where(Animal.sexo == sexo)
            count_query = count_query.where(Animal.sexo == sexo)
        if lote_numero:
            query = query.where(Animal.lote_numero == lote_numero)
            count_query = count_query.where(Animal.lote_numero == lote_numero)
        if q:
            pattern = f"%{q}%"
            condition = or_(
                Animal.codigo_identificacao.ilike(pattern),
                Animal.origem.ilike(pattern),
            )
            query = query.where(condition)
            count_query = count_query.where(condition)

        total = (await self.session.execute(count_query)).scalar() or 0
        query = query.order_by(Animal.lote_numero).offset(skip).limit(limit)
        result = await self.session.execute(query)
        return result.scalars().all(), total

    async def get_by_id_and_user(self, animal_id: UUID, user_id: UUID) -> Animal | None:
        result = await self.session.execute(
            select(Animal)
            .join(Fazenda, Animal.fazenda_id == Fazenda.id)
            .where(Animal.id == animal_id)
            .where(Fazenda.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_totalizadores(self, fazenda_id: UUID) -> dict:
        result = await self.session.execute(
            select(
                func.count().label("total_animais"),
                func.count().filter(Animal.sexo == "M").label("total_machos"),
                func.count().filter(Animal.sexo == "F").label("total_femeas"),
                func.count().filter(Animal.is_vaca.is_(True)).label("total_vaca"),
                func.count().filter(Animal.is_touro.is_(True)).label("total_touro"),
                func.count().filter(Animal.is_cria.is_(True)).label("total_cria"),
                func.count().filter(Animal.is_recria.is_(True)).label("total_recria"),
                func.count().filter(Animal.is_engorda.is_(True)).label("total_engorda"),
                func.coalesce(func.sum(Animal.preco_compra), 0).label("custo_total_lote"),
            ).where(Animal.fazenda_id == fazenda_id)
        )
        row = result.one()
        return {
            "total_animais": row.total_animais,
            "total_machos": row.total_machos,
            "total_femeas": row.total_femeas,
            "total_vaca": row.total_vaca,
            "total_touro": row.total_touro,
            "total_cria": row.total_cria,
            "total_recria": row.total_recria,
            "total_engorda": row.total_engorda,
            "custo_total_lote": row.custo_total_lote,
        }

    async def count_by_fazenda(self, fazenda_id: UUID) -> int:
        result = await self.session.execute(
            select(func.count()).select_from(Animal).where(
                Animal.fazenda_id == fazenda_id
            )
        )
        return result.scalar() or 0
