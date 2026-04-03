from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Date, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin


class HistoricoSanitario(Base, UUIDMixin):
    __tablename__ = "historico_sanitario"
    __table_args__ = (
        Index("idx_hist_sanitario_animal_id", "animal_id"),
    )

    animal_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("animal.id", ondelete="CASCADE"),
    )
    vacina: Mapped[str] = mapped_column(String(100))
    data_aplicacao: Mapped[date] = mapped_column(Date)
    observacao: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        default=func.now(),
        server_default=func.now(),
    )

    animal: Mapped[Animal] = relationship(back_populates="historicos")
