from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import FabricaAccessContext, require_fabrica_access
from app.schemas.configuracao import ConfiguracaoResponse, ConfiguracaoUpsert
from app.services.configuracao_service import ConfiguracaoService

router = APIRouter(prefix="/configuracoes", tags=["Configuracoes"])


@router.get("", response_model=list[ConfiguracaoResponse])
async def list_configuracoes(
    db: AsyncSession = Depends(get_db),
    ctx: FabricaAccessContext = Depends(require_fabrica_access("fabrica")),
):
    service = ConfiguracaoService(db)
    return await service.get_all(ctx)


@router.put("/{chave}", response_model=ConfiguracaoResponse)
async def upsert_configuracao(
    chave: str,
    data: ConfiguracaoUpsert,
    db: AsyncSession = Depends(get_db),
    ctx: FabricaAccessContext = Depends(require_fabrica_access("fabrica")),
):
    service = ConfiguracaoService(db)
    return await service.upsert(ctx, chave, data.valor)
