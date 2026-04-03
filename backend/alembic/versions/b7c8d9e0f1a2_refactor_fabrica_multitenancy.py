"""refactor_fabrica_multitenancy

Revision ID: b7c8d9e0f1a2
Revises: f6a1b2c3d4e5
Create Date: 2026-04-02 21:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b7c8d9e0f1a2"
down_revision: Union[str, None] = "a7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'papelfabrica')
               AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'papel_fabrica_enum') THEN
                ALTER TYPE papelfabrica RENAME TO papel_fabrica_enum;
            END IF;
        END $$;
        """
    )
    op.create_unique_constraint("uq_fabrica_usuario", "fabrica_usuario", ["fabrica_id", "user_id"])

    op.add_column("cliente", sa.Column("fabrica_id", sa.Uuid(), nullable=True))
    op.create_foreign_key("fk_cliente_fabrica_id", "cliente", "fabrica_unidade", ["fabrica_id"], ["id"], ondelete="RESTRICT")
    op.create_index("ix_cliente_fabrica_id", "cliente", ["fabrica_id"])
    op.execute(
        """
        UPDATE cliente c
        SET fabrica_id = fu.id
        FROM fabrica_unidade fu
        WHERE fu.user_id = c.user_id
          AND c.fabrica_id IS NULL
        """
    )
    op.alter_column("cliente", "fabrica_id", nullable=False)

    op.add_column("email_log", sa.Column("fabrica_id", sa.Uuid(), nullable=True))
    op.create_foreign_key("fk_email_log_fabrica_id", "email_log", "fabrica_unidade", ["fabrica_id"], ["id"], ondelete="RESTRICT")
    op.create_index("ix_email_log_fabrica_id", "email_log", ["fabrica_id"])
    op.execute(
        """
        UPDATE email_log e
        SET fabrica_id = p.fabrica_id
        FROM pedido p
        WHERE p.id = e.pedido_id
          AND e.fabrica_id IS NULL
        """
    )
    op.execute(
        """
        UPDATE email_log e
        SET fabrica_id = fu.id
        FROM fabrica_unidade fu
        WHERE fu.user_id = e.user_id
          AND e.fabrica_id IS NULL
        """
    )
    op.alter_column("email_log", "fabrica_id", nullable=False)

    op.add_column("configuracao", sa.Column("fabrica_id", sa.Uuid(), nullable=True))
    op.create_foreign_key("fk_configuracao_fabrica_id", "configuracao", "fabrica_unidade", ["fabrica_id"], ["id"], ondelete="CASCADE")
    op.create_index("ix_configuracao_fabrica_id", "configuracao", ["fabrica_id"])
    op.execute(
        """
        UPDATE configuracao c
        SET fabrica_id = fu.id
        FROM fabrica_unidade fu
        WHERE fu.user_id = c.user_id
          AND c.fabrica_id IS NULL
        """
    )
    op.alter_column("configuracao", "fabrica_id", nullable=False)
    op.drop_constraint("uq_configuracao_user_chave", "configuracao", type_="unique")
    op.create_unique_constraint("uq_configuracao_fabrica_chave", "configuracao", ["fabrica_id", "chave"])

    op.execute(
        """
        UPDATE produto p
        SET fabrica_id = fu.id
        FROM fabrica_unidade fu
        WHERE fu.user_id = p.user_id
          AND p.fabrica_id IS NULL
        """
    )
    op.alter_column("produto", "fabrica_id", nullable=False)

    op.execute(
        """
        UPDATE pedido p
        SET fabrica_id = c.fabrica_id
        FROM cliente c
        WHERE c.id = p.cliente_id
          AND p.fabrica_id IS NULL
        """
    )
    op.execute(
        """
        UPDATE pedido p
        SET fabrica_id = fu.id
        FROM fabrica_unidade fu
        WHERE fu.user_id = p.user_id
          AND p.fabrica_id IS NULL
        """
    )
    op.alter_column("pedido", "fabrica_id", nullable=False)

    op.alter_column("fabrica_unidade", "user_id", nullable=True)


def downgrade() -> None:
    op.alter_column("fabrica_unidade", "user_id", nullable=False)
    op.alter_column("pedido", "fabrica_id", nullable=True)
    op.alter_column("produto", "fabrica_id", nullable=True)

    op.drop_constraint("uq_configuracao_fabrica_chave", "configuracao", type_="unique")
    op.create_unique_constraint("uq_configuracao_user_chave", "configuracao", ["user_id", "chave"])
    op.alter_column("configuracao", "fabrica_id", nullable=True)
    op.drop_index("ix_configuracao_fabrica_id", table_name="configuracao")
    op.drop_constraint("fk_configuracao_fabrica_id", "configuracao", type_="foreignkey")
    op.drop_column("configuracao", "fabrica_id")

    op.alter_column("email_log", "fabrica_id", nullable=True)
    op.drop_index("ix_email_log_fabrica_id", table_name="email_log")
    op.drop_constraint("fk_email_log_fabrica_id", "email_log", type_="foreignkey")
    op.drop_column("email_log", "fabrica_id")

    op.alter_column("cliente", "fabrica_id", nullable=True)
    op.drop_index("ix_cliente_fabrica_id", table_name="cliente")
    op.drop_constraint("fk_cliente_fabrica_id", "cliente", type_="foreignkey")
    op.drop_column("cliente", "fabrica_id")

    op.drop_constraint("uq_fabrica_usuario", "fabrica_usuario", type_="unique")
    op.execute("ALTER TYPE papel_fabrica_enum RENAME TO papelfabrica")
