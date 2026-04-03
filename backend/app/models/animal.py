from __future__ import annotations

import enum
import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import Boolean, Date, Enum, ForeignKey, Index, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class SexoEnum(str, enum.Enum):
    M = "M"
    F = "F"


class Animal(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "animal"
    __table_args__ = (
        Index("idx_animal_fazenda_id", "fazenda_id"),
        Index("idx_animal_lote", "fazenda_id", "lote_numero"),
    )

    fazenda_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("fazenda.id", ondelete="RESTRICT"),
    )
    lote_numero: Mapped[int] = mapped_column(Integer)
    tipo_identificacao: Mapped[str | None] = mapped_column(String(50), nullable=True)
    codigo_identificacao: Mapped[str | None] = mapped_column(String(50), nullable=True)
    sexo: Mapped[SexoEnum] = mapped_column(Enum(SexoEnum, name="sexo_enum"))
    is_vaca: Mapped[bool] = mapped_column(Boolean, default=False)
    is_touro: Mapped[bool] = mapped_column(Boolean, default=False)
    is_cria: Mapped[bool] = mapped_column(Boolean, default=False)
    is_recria: Mapped[bool] = mapped_column(Boolean, default=False)
    is_engorda: Mapped[bool] = mapped_column(Boolean, default=False)
    idade_meses: Mapped[int | None] = mapped_column(Integer, nullable=True)
    peso_inicial_kg: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), nullable=True)
    preco_compra: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    origem: Mapped[str | None] = mapped_column(String(100), nullable=True)
    historico_sanitario: Mapped[str | None] = mapped_column(String(500), nullable=True)
    data_primeira_pesagem: Mapped[date | None] = mapped_column(Date, nullable=True)
    data_cadastro: Mapped[date] = mapped_column(Date, default=date.today)

    fazenda: Mapped[Fazenda] = relationship(back_populates="animais")
    historicos: Mapped[list[HistoricoSanitario]] = relationship(
        back_populates="animal",
        cascade="all, delete-orphan",
    )
