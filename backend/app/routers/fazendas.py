from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.fazenda import FazendaCreate, FazendaResponse, FazendaResumoItem, FazendaUpdate
from app.schemas.common import MessageResponse, PaginatedResponse
from app.services.fazenda_service import FazendaService

router = APIRouter(prefix="/fazendas", tags=["Fazendas"])


@router.get("/resumo-geral", response_model=list[FazendaResumoItem])
async def resumo_geral(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = FazendaService(db)
    return await service.get_resumo_all(user)


@router.get("", response_model=PaginatedResponse[FazendaResponse])
async def list_fazendas(
    q: str | None = Query(None, description="Busca por nome, razao social ou CNPJ"),
    estado: str | None = Query(None, max_length=2),
    cidade: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = FazendaService(db)
    return await service.list_fazendas(
        user=user, q=q, estado=estado, cidade=cidade, page=page, limit=limit
    )


@router.get("/{fazenda_id}", response_model=FazendaResponse)
async def get_fazenda(
    fazenda_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = FazendaService(db)
    return await service.get_fazenda(fazenda_id, user)


@router.post("", response_model=FazendaResponse, status_code=201)
async def create_fazenda(
    data: FazendaCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = FazendaService(db)
    return await service.create_fazenda(data, user)


@router.put("/{fazenda_id}", response_model=FazendaResponse)
async def update_fazenda(
    fazenda_id: UUID,
    data: FazendaUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = FazendaService(db)
    return await service.update_fazenda(fazenda_id, data, user)


@router.delete("/{fazenda_id}", response_model=MessageResponse)
async def delete_fazenda(
    fazenda_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = FazendaService(db)
    await service.delete_fazenda(fazenda_id, user)
    return MessageResponse(message="Fazenda excluida com sucesso")
