from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import FabricaAccessContext, require_fabrica_access
from app.schemas.cliente import ClienteCreate, ClienteResponse, ClienteUpdate
from app.schemas.common import MessageResponse, PaginatedResponse
from app.services.cliente_service import ClienteService

router = APIRouter(prefix="/clientes", tags=["Clientes"])


@router.get("", response_model=PaginatedResponse[ClienteResponse])
async def list_clientes(
    q: str | None = Query(None),
    ativo: bool | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    ctx: FabricaAccessContext = Depends(require_fabrica_access("fabrica")),
):
    service = ClienteService(db)
    return await service.list_clientes(ctx=ctx, q=q, ativo=ativo, page=page, limit=limit)


@router.get("/{cliente_id}", response_model=ClienteResponse)
async def get_cliente(
    cliente_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: FabricaAccessContext = Depends(require_fabrica_access("fabrica")),
):
    service = ClienteService(db)
    return await service.get_cliente(cliente_id, ctx)


@router.post("", response_model=ClienteResponse, status_code=201)
async def create_cliente(
    data: ClienteCreate,
    db: AsyncSession = Depends(get_db),
    ctx: FabricaAccessContext = Depends(require_fabrica_access("fabrica")),
):
    service = ClienteService(db)
    return await service.create_cliente(data, ctx)


@router.put("/{cliente_id}", response_model=ClienteResponse)
async def update_cliente(
    cliente_id: UUID,
    data: ClienteUpdate,
    db: AsyncSession = Depends(get_db),
    ctx: FabricaAccessContext = Depends(require_fabrica_access("fabrica")),
):
    service = ClienteService(db)
    return await service.update_cliente(cliente_id, data, ctx)


@router.delete("/{cliente_id}", response_model=MessageResponse)
async def delete_cliente(
    cliente_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: FabricaAccessContext = Depends(require_fabrica_access("fabrica")),
):
    service = ClienteService(db)
    await service.delete_cliente(cliente_id, ctx)
    return MessageResponse(message="Cliente excluido com sucesso")
