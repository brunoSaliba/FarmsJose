from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Cliente(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "cliente"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT"), index=True
    )
    fabrica_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("fabrica_unidade.id", ondelete="RESTRICT"), index=True
    )
    nome: Mapped[str] = mapped_column(String(150))
    email: Mapped[str] = mapped_column(String(254))
    telefone: Mapped[str] = mapped_column(String(20))
    cpf_cnpj: Mapped[str | None] = mapped_column(String(18), nullable=True)
    endereco: Mapped[str | None] = mapped_column(String(300), nullable=True)
    cidade: Mapped[str | None] = mapped_column(String(100), nullable=True)
    estado: Mapped[str | None] = mapped_column(String(2), nullable=True)
    cep: Mapped[str | None] = mapped_column(String(9), nullable=True)
    observacoes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    deletado: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", index=True)

    fabrica_unidade: Mapped["FabricaUnidade"] = relationship(back_populates="clientes")
    pedidos: Mapped[list[Pedido]] = relationship(
        back_populates="cliente",
        cascade="all, delete-orphan",
    )
