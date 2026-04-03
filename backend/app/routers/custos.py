from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.custo_fazenda import CustoFazendaUpdate, ResumoFazendaResponse
from app.services.custo_service import CustoService

router = APIRouter(prefix="/fazendas/{fazenda_id}/custos", tags=["Custos"])


@router.get("/resumo", response_model=ResumoFazendaResponse)
async def get_resumo(
    fazenda_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = CustoService(db)
    return await service.get_resumo(fazenda_id, user)


@router.put("", response_model=ResumoFazendaResponse)
async def update_custo(
    fazenda_id: UUID,
    data: CustoFazendaUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = CustoService(db)
    await service.update_custo(fazenda_id, data, user)
    return await service.get_resumo(fazenda_id, user)
