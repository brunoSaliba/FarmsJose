from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class CustoFazenda(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "custo_fazenda"

    fazenda_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("fazenda.id", ondelete="CASCADE"),
        unique=True,
    )
    custo_total_lote: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    custo_mensal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    custo_diario: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    custo_total_animal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    preco_venda: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)

    fazenda: Mapped[Fazenda] = relationship(back_populates="custo")
