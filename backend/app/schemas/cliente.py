import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ClienteCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=150)
    email: str = Field(..., max_length=254)
    telefone: str = Field(..., max_length=20)
    cpf_cnpj: str | None = Field(None, max_length=18)
    endereco: str | None = Field(None, max_length=300)
    cidade: str | None = Field(None, max_length=100)
    estado: str | None = Field(None, max_length=2)
    cep: str | None = Field(None, max_length=9)
    observacoes: str | None = Field(None, max_length=500)


class ClienteUpdate(BaseModel):
    nome: str | None = Field(None, min_length=2, max_length=150)
    email: str | None = Field(None, max_length=254)
    telefone: str | None = Field(None, max_length=20)
    cpf_cnpj: str | None = Field(None, max_length=18)
    endereco: str | None = Field(None, max_length=300)
    cidade: str | None = Field(None, max_length=100)
    estado: str | None = Field(None, max_length=2)
    cep: str | None = Field(None, max_length=9)
    observacoes: str | None = Field(None, max_length=500)
    ativo: bool | None = None


class ClienteResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    fabrica_id: uuid.UUID
    nome: str
    email: str
    telefone: str
    cpf_cnpj: str | None
    endereco: str | None
    cidade: str | None
    estado: str | None
    cep: str | None
    observacoes: str | None
    ativo: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
