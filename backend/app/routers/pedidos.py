from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import FabricaAccessContext, require_fabrica_access
from app.models.pedido import StatusPedido
from app.schemas.common import PaginatedResponse
from app.schemas.pedido import PedidoCreate, PedidoListResponse, PedidoResponse, PedidoUpdate
from app.services.pedido_service import PedidoService

router = APIRouter(prefix="/pedidos", tags=["Pedidos"])


@router.get("", response_model=PaginatedResponse[PedidoListResponse])
async def list_pedidos(
    cliente_id: UUID | None = Query(None),
    status: StatusPedido | None = Query(None),
    data_inicio: date | None = Query(None),
    data_fim: date | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    ctx: FabricaAccessContext = Depends(require_fabrica_access("fabrica")),
):
    service = PedidoService(db)
    return await service.list_pedidos(
        ctx=ctx,
        cliente_id=cliente_id,
        status_filter=status,
        data_inicio=data_inicio,
        data_fim=data_fim,
        page=page,
        limit=limit,
    )


@router.get("/{pedido_id}", response_model=PedidoResponse)
async def get_pedido(
    pedido_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: FabricaAccessContext = Depends(require_fabrica_access("fabrica")),
):
    service = PedidoService(db)
    return await service.get_pedido(pedido_id, ctx)


@router.post("", response_model=PedidoResponse, status_code=201)
async def create_pedido(
    data: PedidoCreate,
    db: AsyncSession = Depends(get_db),
    ctx: FabricaAccessContext = Depends(require_fabrica_access("fabrica")),
):
    service = PedidoService(db)
    return await service.create_pedido(data, ctx)


@router.put("/{pedido_id}", response_model=PedidoResponse)
async def update_pedido(
    pedido_id: UUID,
    data: PedidoUpdate,
    db: AsyncSession = Depends(get_db),
    ctx: FabricaAccessContext = Depends(require_fabrica_access("fabrica")),
):
    service = PedidoService(db)
    return await service.update_pedido(pedido_id, data, ctx)


@router.patch("/{pedido_id}/confirmar", response_model=PedidoResponse)
async def confirmar_pedido(
    pedido_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: FabricaAccessContext = Depends(require_fabrica_access("fabrica")),
):
    service = PedidoService(db)
    return await service.confirmar_pedido(pedido_id, ctx)


@router.patch("/{pedido_id}/cancelar", response_model=PedidoResponse)
async def cancelar_pedido(
    pedido_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: FabricaAccessContext = Depends(require_fabrica_access("fabrica")),
):
    service = PedidoService(db)
    return await service.cancelar_pedido(pedido_id, ctx)


@router.post("/{pedido_id}/duplicar", response_model=PedidoResponse, status_code=201)
async def duplicar_pedido(
    pedido_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: FabricaAccessContext = Depends(require_fabrica_access("fabrica")),
):
    service = PedidoService(db)
    return await service.duplicar_pedido(pedido_id, ctx)
