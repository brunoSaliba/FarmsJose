"""add_deletado_to_fabrica_entities

Revision ID: f6a1b2c3d4e5
Revises: e4a1b2c3d4f5
Create Date: 2026-04-02 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f6a1b2c3d4e5"
down_revision: Union[str, None] = "e4a1b2c3d4f5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("cliente", sa.Column("deletado", sa.Boolean(), nullable=False, server_default="false"))
    op.create_index("ix_cliente_deletado", "cliente", ["deletado"])

    op.add_column("produto", sa.Column("deletado", sa.Boolean(), nullable=False, server_default="false"))
    op.create_index("ix_produto_deletado", "produto", ["deletado"])

    op.add_column("fabrica_unidade", sa.Column("deletado", sa.Boolean(), nullable=False, server_default="false"))
    op.create_index("ix_fabrica_unidade_deletado", "fabrica_unidade", ["deletado"])


def downgrade() -> None:
    op.drop_index("ix_fabrica_unidade_deletado", table_name="fabrica_unidade")
    op.drop_column("fabrica_unidade", "deletado")

    op.drop_index("ix_produto_deletado", table_name="produto")
    op.drop_column("produto", "deletado")

    op.drop_index("ix_cliente_deletado", table_name="cliente")
    op.drop_column("cliente", "deletado")
