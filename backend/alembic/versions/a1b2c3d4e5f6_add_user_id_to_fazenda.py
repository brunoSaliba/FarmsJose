"""add_user_id_to_fazenda

Revision ID: a1b2c3d4e5f6
Revises: cb319269c3fa
Create Date: 2026-04-01 20:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'cb319269c3fa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('fazenda', sa.Column('user_id', sa.UUID(), nullable=True))
    op.create_foreign_key(
        'fk_fazenda_user_id',
        'fazenda', 'user',
        ['user_id'], ['id'],
        ondelete='RESTRICT',
    )
    op.create_index('ix_fazenda_user_id', 'fazenda', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_fazenda_user_id', 'fazenda')
    op.drop_constraint('fk_fazenda_user_id', 'fazenda', type_='foreignkey')
    op.drop_column('fazenda', 'user_id')
