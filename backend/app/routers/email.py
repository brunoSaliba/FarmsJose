from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import FabricaAccessContext, require_fabrica_access
from app.schemas.common import PaginatedResponse
from app.schemas.email_log import EmailLogResponse, EmailRelatorioRequest
from app.services.email_service import EmailService

router = APIRouter(prefix="/email", tags=["Email"])


@router.post("/confirmar-pedido/{pedido_id}", response_model=EmailLogResponse)
async def enviar_confirmacao(
    pedido_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: FabricaAccessContext = Depends(require_fabrica_access("fabrica")),
):
    service = EmailService(db)
    return await service.enviar_confirmacao(pedido_id, ctx)


@router.post("/relatorio", response_model=EmailLogResponse)
async def enviar_relatorio(
    data: EmailRelatorioRequest,
    db: AsyncSession = Depends(get_db),
    ctx: FabricaAccessContext = Depends(require_fabrica_access("fabrica")),
):
    service = EmailService(db)
    return await service.enviar_consolidado(data.data_inicio, data.data_fim, ctx)


@router.get("/logs", response_model=PaginatedResponse[EmailLogResponse])
async def list_email_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    ctx: FabricaAccessContext = Depends(require_fabrica_access("fabrica")),
):
    service = EmailService(db)
    return await service.list_logs(ctx, page=page, limit=limit)
