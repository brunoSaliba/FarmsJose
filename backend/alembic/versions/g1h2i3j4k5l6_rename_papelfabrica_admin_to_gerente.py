"""rename_papelfabrica_admin_to_superusuario

Revision ID: g1h2i3j4k5l6
Revises: b7c8d9e0f1a2
Create Date: 2026-04-02 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "g1h2i3j4k5l6"
down_revision: Union[str, None] = "b7c8d9e0f1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE fabrica_usuario ALTER COLUMN papel DROP DEFAULT")
    op.execute("ALTER TABLE fabrica_usuario ALTER COLUMN papel TYPE VARCHAR(20)")
    op.execute("UPDATE fabrica_usuario SET papel = 'superusuario' WHERE papel = 'admin'")
    op.execute("DROP TYPE IF EXISTS papel_fabrica_enum")
    op.execute("CREATE TYPE papel_fabrica_enum AS ENUM ('superusuario', 'seller')")
    op.execute("ALTER TABLE fabrica_usuario ALTER COLUMN papel TYPE papel_fabrica_enum USING papel::papel_fabrica_enum")
    op.execute("ALTER TABLE fabrica_usuario ALTER COLUMN papel SET DEFAULT 'seller'")


def downgrade() -> None:
    op.execute("ALTER TABLE fabrica_usuario ALTER COLUMN papel DROP DEFAULT")
    op.execute("ALTER TABLE fabrica_usuario ALTER COLUMN papel TYPE VARCHAR(20)")
    op.execute("UPDATE fabrica_usuario SET papel = 'admin' WHERE papel = 'superusuario'")
    op.execute("DROP TYPE IF EXISTS papel_fabrica_enum")
    op.execute("CREATE TYPE papel_fabrica_enum AS ENUM ('admin', 'seller')")
    op.execute("ALTER TABLE fabrica_usuario ALTER COLUMN papel TYPE papel_fabrica_enum USING papel::papel_fabrica_enum")
    op.execute("ALTER TABLE fabrica_usuario ALTER COLUMN papel SET DEFAULT 'seller'")
