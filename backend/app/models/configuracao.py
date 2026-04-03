import uuid

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Configuracao(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "configuracao"
    __table_args__ = (
        UniqueConstraint("fabrica_id", "chave", name="uq_configuracao_fabrica_chave"),
    )

    fabrica_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("fabrica_unidade.id", ondelete="CASCADE"), index=True
    )
    chave: Mapped[str] = mapped_column(String(100))
    valor: Mapped[str] = mapped_column(String(500))

    fabrica_unidade: Mapped["FabricaUnidade"] = relationship(back_populates="configuracoes")
