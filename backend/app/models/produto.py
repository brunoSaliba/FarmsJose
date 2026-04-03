from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import Boolean, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Produto(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "produto"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT"), index=True
    )
    fabrica_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("fabrica_unidade.id", ondelete="SET NULL"), index=True, nullable=True
    )
    nome: Mapped[str] = mapped_column(String(200))
    descricao: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sku: Mapped[str | None] = mapped_column(String(50), nullable=True)
    unidade: Mapped[str] = mapped_column(String(20), default="un")
    preco: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0, server_default="0")
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    deletado: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", index=True)

    fabrica_unidade: Mapped["FabricaUnidade"] = relationship(back_populates="produtos")
