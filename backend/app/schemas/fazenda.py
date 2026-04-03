import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.utils.validators import validar_cnpj, validar_cpf


class FazendaBase(BaseModel):
    razao_social: str = Field(..., min_length=3, max_length=200)
    nome_fantasia: str = Field(..., min_length=2, max_length=200)
    cnpj: str | None = Field(None, max_length=18)
    inscricao_estadual: str | None = Field(None, max_length=20)
    rg: str | None = Field(None, max_length=20)
    cpf: str | None = Field(None, max_length=14)
    telefone: str | None = Field(None, max_length=15)
    celular: str | None = Field(None, max_length=15)
    endereco: str | None = Field(None, max_length=300)
    numero_km: str | None = Field(None, max_length=20)
    bairro: str | None = Field(None, max_length=100)
    ponto_referencia: str | None = Field(None, max_length=200)
    cep: str | None = Field(None, max_length=10)
    email: str | None = Field(None, max_length=200)
    caixa_postal: str | None = Field(None, max_length=20)
    cidade: str | None = Field(None, max_length=100)
    estado: str | None = Field(None, max_length=2)

    @field_validator("cnpj")
    @classmethod
    def validate_cnpj(cls, v: str | None) -> str | None:
        if v and not validar_cnpj(v):
            raise ValueError("CNPJ invalido")
        return v

    @field_validator("cpf")
    @classmethod
    def validate_cpf(cls, v: str | None) -> str | None:
        if v and not validar_cpf(v):
            raise ValueError("CPF invalido")
        return v


class FazendaCreate(FazendaBase):
    data_cadastro: date = Field(default_factory=date.today)


class FazendaUpdate(BaseModel):
    razao_social: str | None = Field(None, min_length=3, max_length=200)
    nome_fantasia: str | None = Field(None, min_length=2, max_length=200)
    cnpj: str | None = Field(None, max_length=18)
    inscricao_estadual: str | None = Field(None, max_length=20)
    rg: str | None = Field(None, max_length=20)
    cpf: str | None = Field(None, max_length=14)
    telefone: str | None = Field(None, max_length=15)
    celular: str | None = Field(None, max_length=15)
    endereco: str | None = Field(None, max_length=300)
    numero_km: str | None = Field(None, max_length=20)
    bairro: str | None = Field(None, max_length=100)
    ponto_referencia: str | None = Field(None, max_length=200)
    cep: str | None = Field(None, max_length=10)
    email: str | None = Field(None, max_length=200)
    caixa_postal: str | None = Field(None, max_length=20)
    cidade: str | None = Field(None, max_length=100)
    estado: str | None = Field(None, max_length=2)
    data_cadastro: date | None = None

    @field_validator("cnpj")
    @classmethod
    def validate_cnpj(cls, v: str | None) -> str | None:
        if v and not validar_cnpj(v):
            raise ValueError("CNPJ invalido")
        return v

    @field_validator("cpf")
    @classmethod
    def validate_cpf(cls, v: str | None) -> str | None:
        if v and not validar_cpf(v):
            raise ValueError("CPF invalido")
        return v


class FazendaResponse(FazendaBase):
    id: uuid.UUID
    id_sistema: int
    data_cadastro: date
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FazendaResumoItem(BaseModel):
    id: str
    nome_fantasia: str
    cidade: str | None
    estado: str | None
    total_animais: int
    total_lotes: int


class FazendaListItem(BaseModel):
    id: uuid.UUID
    id_sistema: int
    razao_social: str
    nome_fantasia: str
    cnpj: str | None
    cidade: str | None
    estado: str | None
    data_cadastro: date

    model_config = ConfigDict(from_attributes=True)
