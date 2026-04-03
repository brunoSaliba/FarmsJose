from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, Sequence, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

id_sistema_seq = Sequence("fazenda_id_sistema_seq")


class Fazenda(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "fazenda"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT"), index=True
    )
    id_sistema: Mapped[int] = mapped_column(
        Integer,
        id_sistema_seq,
        server_default=id_sistema_seq.next_value(),
        unique=True,
    )
    razao_social: Mapped[str] = mapped_column(String(200))
    nome_fantasia: Mapped[str] = mapped_column(String(200))
    cnpj: Mapped[str | None] = mapped_column(String(18), unique=True, nullable=True)
    inscricao_estadual: Mapped[str | None] = mapped_column(String(20), nullable=True)
    rg: Mapped[str | None] = mapped_column(String(20), nullable=True)
    cpf: Mapped[str | None] = mapped_column(String(14), unique=True, nullable=True)
    telefone: Mapped[str | None] = mapped_column(String(15), nullable=True)
    celular: Mapped[str | None] = mapped_column(String(15), nullable=True)
    endereco: Mapped[str | None] = mapped_column(String(300), nullable=True)
    numero_km: Mapped[str | None] = mapped_column(String(20), nullable=True)
    bairro: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ponto_referencia: Mapped[str | None] = mapped_column(String(200), nullable=True)
    cep: Mapped[str | None] = mapped_column(String(10), nullable=True)
    email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    caixa_postal: Mapped[str | None] = mapped_column(String(20), nullable=True)
    cidade: Mapped[str | None] = mapped_column(String(100), nullable=True)
    estado: Mapped[str | None] = mapped_column(String(2), nullable=True)
    data_cadastro: Mapped[date] = mapped_column(Date, default=date.today)

    animais: Mapped[list[Animal]] = relationship(
        back_populates="fazenda",
        cascade="all, delete-orphan",
    )
    custo: Mapped[CustoFazenda | None] = relationship(
        back_populates="fazenda",
        uselist=False,
    )
