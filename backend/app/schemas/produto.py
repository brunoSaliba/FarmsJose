import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ProdutoCreate(BaseModel):
    nome: str = Field(..., min_length=1, max_length=200)
    descricao: str | None = Field(None, max_length=500)
    sku: str | None = Field(None, max_length=50)
    fabrica_id: uuid.UUID | None = None
    unidade: str = Field("un", max_length=20)
    preco: Decimal = Field(..., ge=0)

class ProdutoUpdate(BaseModel):
    nome: str | None = Field(None, min_length=1, max_length=200)
    descricao: str | None = Field(None, max_length=500)
    sku: str | None = Field(None, max_length=50)
    fabrica_id: uuid.UUID | None = None
    unidade: str | None = Field(None, max_length=20)
    preco: Decimal | None = Field(None, ge=0)
    ativo: bool | None = None


class ProdutoResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    fabrica_id: uuid.UUID | None
    nome: str
    descricao: str | None
    sku: str | None
    unidade: str
    preco: Decimal
    ativo: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
