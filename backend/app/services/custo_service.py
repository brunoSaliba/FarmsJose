from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.animal_repo import AnimalRepository
from app.repositories.custo_fazenda_repo import CustoFazendaRepository
from app.repositories.fazenda_repo import FazendaRepository
from app.schemas.custo_fazenda import CustoFazendaUpdate


class CustoService:
    def __init__(self, session: AsyncSession):
        self.repo = CustoFazendaRepository(session)
        self.fazenda_repo = FazendaRepository(session)
        self.animal_repo = AnimalRepository(session)

    async def get_resumo(self, fazenda_id: UUID, user: User):
        fazenda = await self.fazenda_repo.get_by_id(fazenda_id)
        if not fazenda or (not user.is_admin and fazenda.user_id != user.id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Fazenda nao encontrada",
            )

        custo = await self.repo.get_by_fazenda(fazenda_id)
        totais = await self.animal_repo.get_totalizadores(fazenda_id)

        total_animais = totais["total_animais"]
        custo_total_lote = totais["custo_total_lote"]

        preco_animal = (
            custo_total_lote / total_animais if total_animais > 0 else Decimal(0)
        )

        custo_mensal = custo.custo_mensal if custo else Decimal(0)
        custo_diario = custo_mensal / 30 if custo_mensal else Decimal(0)
        custo_total_animal = custo.custo_total_animal if custo else Decimal(0)
        preco_venda = custo.preco_venda if custo else Decimal(0)
        lucro = preco_venda - custo_total_animal

        return {
            "fazenda_id": fazenda_id,
            "id_sistema": fazenda.id_sistema,
            "nome_fantasia": fazenda.nome_fantasia,
            "custo_total_lote": custo_total_lote,
            "total_animais": total_animais,
            "preco_animal": round(preco_animal, 2),
            "custo_mensal": custo_mensal,
            "custo_diario": round(custo_diario, 2),
            "custo_total_animal": custo_total_animal,
            "preco_venda": preco_venda,
            "lucro": round(lucro, 2),
        }

    async def update_custo(self, fazenda_id: UUID, data: CustoFazendaUpdate, user: User):
        fazenda = await self.fazenda_repo.get_by_id(fazenda_id)
        if not fazenda or fazenda.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Fazenda nao encontrada",
            )

        custo = await self.repo.get_by_fazenda(fazenda_id)
        custo_data = data.model_dump()
        custo_data["custo_diario"] = data.custo_mensal / 30

        # Recalculate custo_total_lote from animals
        totais = await self.animal_repo.get_totalizadores(fazenda_id)
        custo_data["custo_total_lote"] = totais["custo_total_lote"]

        if custo:
            return await self.repo.update(custo, custo_data)
        else:
            custo_data["fazenda_id"] = fazenda_id
            return await self.repo.create(custo_data)
