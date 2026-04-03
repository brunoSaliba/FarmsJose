from __future__ import annotations

import enum
import uuid
from decimal import Decimal

from sqlalchemy import Enum, ForeignKey, Integer, Numeric, Sequence, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

pedido_numero_seq = Sequence("pedido_numero_seq")


class StatusPedido(str, enum.Enum):
    RASCUNHO = "rascunho"
    CONFIRMADO = "confirmado"
    ENVIADO = "enviado"
    EM_PROCESSAMENTO = "em_processamento"
    FINALIZADO = "finalizado"
    CANCELADO = "cancelado"


class Pedido(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "pedido"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT"), index=True
    )
    fabrica_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("fabrica_unidade.id", ondelete="RESTRICT"), index=True
    )
    numero: Mapped[int] = mapped_column(
        Integer,
        pedido_numero_seq,
        server_default=pedido_numero_seq.next_value(),
        unique=True,
    )
    cliente_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("cliente.id", ondelete="RESTRICT"), index=True
    )
    nome_cliente: Mapped[str | None] = mapped_column(String(150), nullable=True)
    status: Mapped[StatusPedido] = mapped_column(
        Enum(StatusPedido, values_callable=lambda e: [x.value for x in e], name="status_pedido_enum", create_constraint=False),
        default=StatusPedido.RASCUNHO,
        server_default="rascunho",
    )
    observacoes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=0, server_default="0"
    )
    desconto: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=0, server_default="0"
    )
    valor_total: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=0, server_default="0"
    )

    cliente: Mapped["Cliente"] = relationship(back_populates="pedidos")
    fabrica_unidade: Mapped["FabricaUnidade"] = relationship(back_populates="pedidos")
    user: Mapped["User"] = relationship()
    itens: Mapped[list[ItemPedido]] = relationship(
        back_populates="pedido",
        cascade="all, delete-orphan",
    )
    email_logs: Mapped[list["EmailLog"]] = relationship(back_populates="pedido")


class ItemPedido(Base, UUIDMixin):
    __tablename__ = "item_pedido"

    pedido_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("pedido.id", ondelete="CASCADE"), index=True
    )
    produto_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("produto.id", ondelete="SET NULL"), index=True, nullable=True
    )
    descricao: Mapped[str] = mapped_column(String(200))
    produto_nome: Mapped[str | None] = mapped_column(String(200), nullable=True)
    quantidade: Mapped[int] = mapped_column(Integer)
    valor_unitario: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    desconto: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=0, server_default="0"
    )
    valor_total: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    pedido: Mapped[Pedido] = relationship(back_populates="itens")
