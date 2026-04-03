from typing import Any, Sequence
from uuid import UUID

from sqlalchemy import or_, select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.fazenda import Fazenda
from app.models.animal import Animal
from app.repositories.base import BaseRepository


class FazendaRepository(BaseRepository[Fazenda]):
    def __init__(self, session: AsyncSession):
        super().__init__(Fazenda, session)

    async def get_by_cnpj(self, cnpj: str) -> Fazenda | None:
        result = await self.session.execute(
            select(Fazenda).where(Fazenda.cnpj == cnpj)
        )
        return result.scalar_one_or_none()

    async def get_by_cpf(self, cpf: str) -> Fazenda | None:
        result = await self.session.execute(
            select(Fazenda).where(Fazenda.cpf == cpf)
        )
        return result.scalar_one_or_none()

    async def search(
        self,
        *,
        q: str | None = None,
        estado: str | None = None,
        cidade: str | None = None,
        user_id: UUID | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[Sequence[Fazenda], int]:
        filters: list[Any] = []
        if user_id is not None:
            filters.append(Fazenda.user_id == user_id)
        if q:
            pattern = f"%{q}%"
            filters.append(
                or_(
                    Fazenda.nome_fantasia.ilike(pattern),
                    Fazenda.razao_social.ilike(pattern),
                    Fazenda.cnpj.ilike(pattern),
                )
            )
        if estado:
            filters.append(Fazenda.estado == estado)
        if cidade:
            filters.append(Fazenda.cidade.ilike(f"%{cidade}%"))

        return await self.get_all(
            skip=skip, limit=limit, filters=filters, order_by=Fazenda.id_sistema
        )

    async def has_animals(self, fazenda_id: UUID) -> bool:
        result = await self.session.execute(
            select(func.count()).select_from(Animal).where(
                Animal.fazenda_id == fazenda_id
            )
        )
        return (result.scalar() or 0) > 0

    async def get_resumo_all(self, user_id: UUID | None = None) -> list[dict]:
        stmt = (
            select(
                Fazenda.id,
                Fazenda.nome_fantasia,
                Fazenda.cidade,
                Fazenda.estado,
                func.count(Animal.id).label("total_animais"),
                func.count(func.distinct(Animal.lote_numero)).label("total_lotes"),
            )
            .outerjoin(Animal, Animal.fazenda_id == Fazenda.id)
            .group_by(Fazenda.id, Fazenda.nome_fantasia, Fazenda.cidade, Fazenda.estado)
            .order_by(Fazenda.nome_fantasia)
        )
        if user_id is not None:
            stmt = stmt.where(Fazenda.user_id == user_id)
        result = await self.session.execute(stmt)
        return [
            {
                "id": str(row.id),
                "nome_fantasia": row.nome_fantasia,
                "cidade": row.cidade,
                "estado": row.estado,
                "total_animais": row.total_animais,
                "total_lotes": row.total_lotes,
            }
            for row in result.all()
        ]

    async def get_with_custo(self, fazenda_id: UUID) -> Fazenda | None:
        result = await self.session.execute(
            select(Fazenda)
            .options(selectinload(Fazenda.custo))
            .where(Fazenda.id == fazenda_id)
        )
        return result.scalar_one_or_none()
