import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.fabrica_unidade import PapelFabrica


class FabricaUsuarioCreate(BaseModel):
    user_id: uuid.UUID
    papel: PapelFabrica = PapelFabrica.SELLER


class FabricaUsuarioUpdate(BaseModel):
    papel: PapelFabrica | None = None
    ativo: bool | None = None


class FabricaUsuarioResponse(BaseModel):
    id: uuid.UUID
    fabrica_id: uuid.UUID
    user_id: uuid.UUID
    papel: PapelFabrica
    ativo: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FabricaUsuarioDetailResponse(FabricaUsuarioResponse):
    user_nome: str
    user_email: str

    @classmethod
    def from_vinculo(cls, vinculo: object) -> "FabricaUsuarioDetailResponse":
        return cls(
            id=vinculo.id,  # type: ignore[attr-defined]
            fabrica_id=vinculo.fabrica_id,  # type: ignore[attr-defined]
            user_id=vinculo.user_id,  # type: ignore[attr-defined]
            papel=vinculo.papel,  # type: ignore[attr-defined]
            ativo=vinculo.ativo,  # type: ignore[attr-defined]
            created_at=vinculo.created_at,  # type: ignore[attr-defined]
            updated_at=vinculo.updated_at,  # type: ignore[attr-defined]
            user_nome=vinculo.user.nome,  # type: ignore[attr-defined]
            user_email=vinculo.user.email,  # type: ignore[attr-defined]
        )
