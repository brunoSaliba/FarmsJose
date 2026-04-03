import uuid
from decimal import Decimal

from pydantic import BaseModel, Field


class CustoFazendaUpdate(BaseModel):
    custo_mensal: Decimal = Field(ge=0)
    custo_total_animal: Decimal = Field(ge=0)
    preco_venda: Decimal = Field(ge=0)


class ResumoFazendaResponse(BaseModel):
    fazenda_id: uuid.UUID
    id_sistema: int
    nome_fantasia: str
    custo_total_lote: Decimal
    total_animais: int
    preco_animal: Decimal
    custo_mensal: Decimal
    custo_diario: Decimal
    custo_total_animal: Decimal
    preco_venda: Decimal
    lucro: Decimal
