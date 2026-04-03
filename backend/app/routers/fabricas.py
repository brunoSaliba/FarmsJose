from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import require_module
from app.models.user import User
from app.schemas.common import MessageResponse, PaginatedResponse
from app.schemas.fabrica_unidade import FabricaContaResponse, FabricaContaUpdate, FabricaCreateUser, FabricaUnidadeCreate, FabricaUnidadeResponse, FabricaUnidadeUpdate, MeuAcessoResponse
from app.schemas.fabrica_usuario import FabricaUsuarioCreate, FabricaUsuarioDetailResponse, FabricaUsuarioResponse, FabricaUsuarioUpdate
from app.services.fabrica_unidade_service import FabricaUnidadeService

router = APIRouter(prefix="/fabricas", tags=["Fabricas"])


@router.get("", response_model=PaginatedResponse[FabricaUnidadeResponse])
async def list_fabricas(
    q: str | None = Query(None),
    ativo: bool | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_module("fabrica")),
):
    service = FabricaUnidadeService(db)
    return await service.list_fabricas(user=user, q=q, ativo=ativo, page=page, limit=limit)


@router.get("/{fabrica_id}", response_model=FabricaUnidadeResponse)
async def get_fabrica(
    fabrica_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_module("fabrica")),
):
    service = FabricaUnidadeService(db)
    return await service.get_fabrica(fabrica_id, user)


@router.post("", response_model=FabricaUnidadeResponse, status_code=201)
async def create_fabrica(
    data: FabricaUnidadeCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_module("fabrica")),
):
    service = FabricaUnidadeService(db)
    return await service.create_fabrica(data, user)


@router.put("/{fabrica_id}", response_model=FabricaUnidadeResponse)
async def update_fabrica(
    fabrica_id: UUID,
    data: FabricaUnidadeUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_module("fabrica")),
):
    service = FabricaUnidadeService(db)
    return await service.update_fabrica(fabrica_id, data, user)


@router.delete("/{fabrica_id}", response_model=MessageResponse)
async def delete_fabrica(
    fabrica_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_module("fabrica")),
):
    service = FabricaUnidadeService(db)
    await service.delete_fabrica(fabrica_id, user)
    return MessageResponse(message="Fabrica excluida com sucesso")


@router.get("/{fabrica_id}/usuarios", response_model=list[FabricaUsuarioDetailResponse])
async def list_fabrica_usuarios(
    fabrica_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_module("fabrica")),
):
    service = FabricaUnidadeService(db)
    return await service.list_usuarios_detail(fabrica_id, user)


@router.post("/{fabrica_id}/usuarios", response_model=FabricaUsuarioResponse, status_code=201)
async def add_fabrica_usuario(
    fabrica_id: UUID,
    data: FabricaUsuarioCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_module("fabrica")),
):
    service = FabricaUnidadeService(db)
    return await service.add_usuario(fabrica_id, data, user)


@router.post("/{fabrica_id}/usuarios/criar", response_model=FabricaUsuarioDetailResponse, status_code=201)
async def criar_usuario_fabrica(
    fabrica_id: UUID,
    data: FabricaCreateUser,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_module("fabrica")),
):
    service = FabricaUnidadeService(db)
    return await service.create_and_link_usuario(fabrica_id, data, user)


@router.delete("/{fabrica_id}/usuarios/{vinculo_id}", response_model=MessageResponse)
async def deactivate_fabrica_usuario(
    fabrica_id: UUID,
    vinculo_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_module("fabrica")),
):
    service = FabricaUnidadeService(db)
    await service.deactivate_usuario(fabrica_id, vinculo_id, user)
    return MessageResponse(message="Acesso removido com sucesso")


@router.get("/{fabrica_id}/meu-acesso", response_model=MeuAcessoResponse)
async def get_meu_acesso(
    fabrica_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_module("fabrica")),
):
    service = FabricaUnidadeService(db)
    return await service.get_meu_acesso(fabrica_id, user)


@router.get("/{fabrica_id}/conta", response_model=FabricaContaResponse)
async def get_fabrica_conta(
    fabrica_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_module("fabrica")),
):
    service = FabricaUnidadeService(db)
    return await service.get_conta(fabrica_id, user)


@router.put("/{fabrica_id}/conta", response_model=FabricaContaResponse)
async def update_fabrica_conta(
    fabrica_id: UUID,
    data: FabricaContaUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_module("fabrica")),
):
    service = FabricaUnidadeService(db)
    return await service.update_conta(fabrica_id, data, user)


@router.put("/{fabrica_id}/usuarios/{vinculo_id}", response_model=FabricaUsuarioResponse)
async def update_fabrica_usuario(
    fabrica_id: UUID,
    vinculo_id: UUID,
    data: FabricaUsuarioUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_module("fabrica")),
):
    service = FabricaUnidadeService(db)
    return await service.update_usuario(fabrica_id, vinculo_id, data, user)
