from __future__ import annotations

import enum
import uuid

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class TipoEmail(str, enum.Enum):
    CONFIRMACAO = "confirmacao"
    CONSOLIDADO = "consolidado"


class StatusEmail(str, enum.Enum):
    PENDENTE = "pendente"
    ENVIADO = "enviado"
    FALHA = "falha"


class EmailLog(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "email_log"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT"), index=True
    )
    fabrica_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("fabrica_unidade.id", ondelete="RESTRICT"), index=True
    )
    tipo: Mapped[TipoEmail] = mapped_column(Enum(TipoEmail, values_callable=lambda e: [x.value for x in e], name="tipo_email_enum"))
    destinatario: Mapped[str] = mapped_column(String(254))
    assunto: Mapped[str] = mapped_column(String(300))
    status: Mapped[StatusEmail] = mapped_column(
        Enum(StatusEmail, values_callable=lambda e: [x.value for x in e], name="status_email_enum"),
        default=StatusEmail.PENDENTE,
        server_default="pendente",
    )
    erro: Mapped[str | None] = mapped_column(String(500), nullable=True)
    pedido_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("pedido.id", ondelete="SET NULL"), nullable=True
    )

    fabrica_unidade: Mapped["FabricaUnidade"] = relationship(back_populates="email_logs")
    pedido: Mapped[Pedido | None] = relationship(back_populates="email_logs")
