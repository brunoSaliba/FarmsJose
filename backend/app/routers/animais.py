from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.animal import (
    AnimalCreate,
    AnimalResponse,
    AnimalUpdate,
    TotalizadoresResponse,
)
from app.schemas.common import MessageResponse, PaginatedResponse
from app.services.animal_service import AnimalService

router = APIRouter(prefix="/animais", tags=["Animais"])


@router.get("", response_model=PaginatedResponse[AnimalResponse])
async def list_animais(
    fazenda_id: UUID | None = Query(None),
    sexo: str | None = Query(None, pattern="^[MF]$"),
    lote_numero: int | None = Query(None),
    q: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = AnimalService(db)
    return await service.list_animais(
        user=user,
        fazenda_id=fazenda_id,
        sexo=sexo,
        lote_numero=lote_numero,
        q=q,
        page=page,
        limit=limit,
    )


@router.get("/totalizadores/{fazenda_id}", response_model=TotalizadoresResponse)
async def get_totalizadores(
    fazenda_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = AnimalService(db)
    return await service.get_totalizadores(fazenda_id, user)


@router.get("/{animal_id}", response_model=AnimalResponse)
async def get_animal(
    animal_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = AnimalService(db)
    return await service.get_animal(animal_id, user)


@router.post("", response_model=AnimalResponse, status_code=201)
async def create_animal(
    data: AnimalCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = AnimalService(db)
    return await service.create_animal(data, user)


@router.put("/{animal_id}", response_model=AnimalResponse)
async def update_animal(
    animal_id: UUID,
    data: AnimalUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = AnimalService(db)
    return await service.update_animal(animal_id, data, user)


@router.delete("/{animal_id}", response_model=MessageResponse)
async def delete_animal(
    animal_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = AnimalService(db)
    await service.delete_animal(animal_id, user)
    return MessageResponse(message="Animal excluido com sucesso")
