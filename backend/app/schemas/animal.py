import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class AnimalBase(BaseModel):
    lote_numero: int = Field(..., gt=0)
    tipo_identificacao: str | None = Field(None, max_length=50)
    codigo_identificacao: str | None = Field(None, max_length=50)
    sexo: Literal["M", "F"]
    is_vaca: bool = False
    is_touro: bool = False
    is_cria: bool = False
    is_recria: bool = False
    is_engorda: bool = False
    idade_meses: int | None = Field(None, ge=0)
    peso_inicial_kg: Decimal | None = Field(None, ge=0)
    preco_compra: Decimal = Field(default=0, ge=0)
    origem: str | None = Field(None, max_length=100)
    historico_sanitario: str | None = Field(None, max_length=500)
    data_primeira_pesagem: date | None = None

    @model_validator(mode="after")
    def validate_categoria_sexo(self) -> "AnimalBase":
        if self.sexo == "M" and self.is_vaca:
            raise ValueError("Animal macho nao pode ser categorizado como Vaca")
        if self.sexo == "F" and self.is_touro:
            raise ValueError("Animal femea nao pode ser categorizado como Touro")
        return self


class AnimalCreate(AnimalBase):
    fazenda_id: uuid.UUID
    data_cadastro: date = Field(default_factory=date.today)


class AnimalUpdate(BaseModel):
    lote_numero: int | None = Field(None, gt=0)
    tipo_identificacao: str | None = Field(None, max_length=50)
    codigo_identificacao: str | None = Field(None, max_length=50)
    sexo: Literal["M", "F"] | None = None
    is_vaca: bool | None = None
    is_touro: bool | None = None
    is_cria: bool | None = None
    is_recria: bool | None = None
    is_engorda: bool | None = None
    idade_meses: int | None = Field(None, ge=0)
    peso_inicial_kg: Decimal | None = Field(None, ge=0)
    preco_compra: Decimal | None = Field(None, ge=0)
    origem: str | None = Field(None, max_length=100)
    historico_sanitario: str | None = Field(None, max_length=500)
    data_primeira_pesagem: date | None = None
    data_cadastro: date | None = None


class AnimalResponse(AnimalBase):
    id: uuid.UUID
    fazenda_id: uuid.UUID
    data_cadastro: date
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TotalizadoresResponse(BaseModel):
    total_animais: int
    total_machos: int
    total_femeas: int
    total_vaca: int
    total_touro: int
    total_cria: int
    total_recria: int
    total_engorda: int
    custo_total_lote: Decimal
