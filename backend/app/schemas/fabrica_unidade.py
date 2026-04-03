import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.fabrica_unidade import PapelFabrica


class FabricaUnidadeCreate(BaseModel):
    nome: str = Field(..., min_length=1, max_length=200)
    email_pedido: str | None = Field(None, max_length=254)
    # Required when system admin creates a fabrica — defines the fabrica's admin account
    admin_nome: str | None = Field(None, min_length=2, max_length=200)
    admin_email: EmailStr | None = None
    admin_password: str | None = Field(None, min_length=4)


class FabricaUnidadeUpdate(BaseModel):
    nome: str | None = Field(None, min_length=1, max_length=200)
    email_pedido: str | None = Field(None, max_length=254)
    ativo: bool | None = None


class FabricaUnidadeResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID | None
    nome: str
    email_pedido: str | None
    ativo: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FabricaCreateUser(BaseModel):
    nome: str = Field(..., min_length=2, max_length=200)
    email: EmailStr
    password: str = Field(..., min_length=4)
    papel: PapelFabrica = PapelFabrica.SELLER


class FabricaContaResponse(BaseModel):
    user_id: uuid.UUID
    nome: str
    email: str


class FabricaContaUpdate(BaseModel):
    nome: str | None = Field(None, min_length=2, max_length=200)
    email: EmailStr | None = None
    password: str | None = Field(None, min_length=4)


class MeuAcessoResponse(BaseModel):
    papel: PapelFabrica
    ativo: bool
    is_system_admin: bool
