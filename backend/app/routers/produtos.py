from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import FabricaAccessContext, require_fabrica_access
from app.schemas.common import MessageResponse, PaginatedResponse
from app.schemas.produto import ProdutoCreate, ProdutoResponse, ProdutoUpdate
from app.services.produto_service import ProdutoService

router = APIRouter(prefix="/produtos", tags=["Produtos"])


@router.get("", response_model=PaginatedResponse[ProdutoResponse])
async def list_produtos(
    q: str | None = Query(None),
    ativo: bool | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    ctx: FabricaAccessContext = Depends(require_fabrica_access("fabrica")),
):
    service = ProdutoService(db)
    return await service.list_produtos(ctx=ctx, q=q, ativo=ativo, page=page, limit=limit)


@router.get("/{produto_id}", response_model=ProdutoResponse)
async def get_produto(
    produto_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: FabricaAccessContext = Depends(require_fabrica_access("fabrica")),
):
    service = ProdutoService(db)
    return await service.get_produto(produto_id, ctx)


@router.post("", response_model=ProdutoResponse, status_code=201)
async def create_produto(
    data: ProdutoCreate,
    db: AsyncSession = Depends(get_db),
    ctx: FabricaAccessContext = Depends(require_fabrica_access("fabrica")),
):
    service = ProdutoService(db)
    return await service.create_produto(data, ctx)


@router.put("/{produto_id}", response_model=ProdutoResponse)
async def update_produto(
    produto_id: UUID,
    data: ProdutoUpdate,
    db: AsyncSession = Depends(get_db),
    ctx: FabricaAccessContext = Depends(require_fabrica_access("fabrica")),
):
    service = ProdutoService(db)
    return await service.update_produto(produto_id, data, ctx)


@router.delete("/{produto_id}", response_model=MessageResponse)
async def delete_produto(
    produto_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: FabricaAccessContext = Depends(require_fabrica_access("fabrica")),
):
    service = ProdutoService(db)
    await service.delete_produto(produto_id, ctx)
    return MessageResponse(message="Produto excluido com sucesso")
