import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.pedido import StatusPedido
from app.schemas.cliente import ClienteResponse


class ItemPedidoCreate(BaseModel):
    produto_id: uuid.UUID | None = None
    descricao: str = Field(..., min_length=1, max_length=200)
    quantidade: int = Field(..., ge=1)
    valor_unitario: Decimal = Field(..., ge=0)
    desconto: Decimal = Field(0, ge=0, le=100)


class ItemPedidoResponse(BaseModel):
    id: uuid.UUID
    pedido_id: uuid.UUID
    produto_id: uuid.UUID | None
    descricao: str
    produto_nome: str | None
    quantidade: int
    valor_unitario: Decimal
    desconto: Decimal
    valor_total: Decimal

    model_config = ConfigDict(from_attributes=True)


class PedidoCreate(BaseModel):
    cliente_id: uuid.UUID
    observacoes: str | None = Field(None, max_length=500)
    desconto: Decimal = Field(0, ge=0, le=100)
    itens: list[ItemPedidoCreate] = Field(..., min_length=1)


class PedidoUpdate(BaseModel):
    observacoes: str | None = Field(None, max_length=500)
    desconto: Decimal | None = Field(None, ge=0, le=100)
    itens: list[ItemPedidoCreate] | None = None


class PedidoResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    fabrica_id: uuid.UUID
    numero: int
    cliente_id: uuid.UUID
    nome_cliente: str | None
    status: StatusPedido
    observacoes: str | None
    subtotal: Decimal
    desconto: Decimal
    valor_total: Decimal
    created_at: datetime
    updated_at: datetime
    itens: list[ItemPedidoResponse] = []
    cliente: ClienteResponse | None = None

    model_config = ConfigDict(from_attributes=True)


class PedidoListResponse(BaseModel):
    id: uuid.UUID
    numero: int
    cliente_id: uuid.UUID
    fabrica_id: uuid.UUID
    nome_cliente: str | None
    status: StatusPedido
    observacoes: str | None
    subtotal: Decimal
    desconto: Decimal
    valor_total: Decimal
    created_at: datetime
    updated_at: datetime
    user_nome: str | None = None

    model_config = ConfigDict(from_attributes=True)
