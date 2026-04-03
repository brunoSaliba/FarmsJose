from __future__ import annotations

import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class PapelFabrica(str, enum.Enum):
    SUPERUSUARIO = "superusuario"
    SELLER = "seller"


class FabricaUnidade(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "fabrica_unidade"

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="SET NULL"), index=True, nullable=True
    )
    nome: Mapped[str] = mapped_column(String(200))
    email_pedido: Mapped[str | None] = mapped_column(String(254), nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    deletado: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", index=True)

    usuarios: Mapped[list["FabricaUsuario"]] = relationship(
        back_populates="fabrica",
        cascade="all, delete-orphan",
    )
    produtos: Mapped[list["Produto"]] = relationship(back_populates="fabrica_unidade")
    pedidos: Mapped[list["Pedido"]] = relationship(back_populates="fabrica_unidade")
    clientes: Mapped[list["Cliente"]] = relationship(back_populates="fabrica_unidade")
    configuracoes: Mapped[list["Configuracao"]] = relationship(back_populates="fabrica_unidade")
    email_logs: Mapped[list["EmailLog"]] = relationship(back_populates="fabrica_unidade")


class FabricaUsuario(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "fabrica_usuario"

    fabrica_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("fabrica_unidade.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), index=True
    )
    papel: Mapped[PapelFabrica] = mapped_column(
        Enum(PapelFabrica, values_callable=lambda e: [x.value for x in e], name="papel_fabrica_enum"),
        default=PapelFabrica.SELLER,
        server_default="seller",
    )
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    fabrica: Mapped["FabricaUnidade"] = relationship(back_populates="usuarios")
    user: Mapped["User"] = relationship()
