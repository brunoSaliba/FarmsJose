from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.repositories.historico_sanitario_repo import HistoricoSanitarioRepository
from app.schemas.common import MessageResponse
from app.schemas.historico_sanitario import HistSanitarioCreate, HistSanitarioResponse
from app.services.animal_service import AnimalService

router = APIRouter(prefix="/animais/{animal_id}/historico", tags=["Historico Sanitario"])


@router.get("", response_model=list[HistSanitarioResponse])
async def list_historico(
    animal_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = AnimalService(db)
    await service.get_animal(animal_id, user)

    repo = HistoricoSanitarioRepository(db)
    return await repo.get_by_animal(animal_id)


@router.post("", response_model=HistSanitarioResponse, status_code=201)
async def create_historico(
    animal_id: UUID,
    data: HistSanitarioCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = AnimalService(db)
    await service.get_animal(animal_id, user)

    repo = HistoricoSanitarioRepository(db)
    return await repo.create({"animal_id": animal_id, **data.model_dump()})


@router.delete("/{historico_id}", response_model=MessageResponse)
async def delete_historico(
    animal_id: UUID,
    historico_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = AnimalService(db)
    await service.get_animal(animal_id, user)
    repo = HistoricoSanitarioRepository(db)
    hist = await repo.get_by_id(historico_id)
    if not hist or hist.animal_id != animal_id:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registro nao encontrado")
    await repo.delete(hist)
    return MessageResponse(message="Registro excluido com sucesso")
