"""add_fabrica_usuario

Revision ID: a7b8c9d0e1f2
Revises: f6a1b2c3d4e5
Create Date: 2026-04-02 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7b8c9d0e1f2'
down_revision: Union[str, None] = 'f6a1b2c3d4e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the papelfabrica enum type (safe, won't fail if it already exists)
    op.execute("DO $$ BEGIN CREATE TYPE papelfabrica AS ENUM ('admin', 'seller'); EXCEPTION WHEN duplicate_object THEN null; END $$;")

    # Create fabrica_usuario table
    op.create_table(
        'fabrica_usuario',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('fabrica_id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('papel', sa.Enum('admin', 'seller', name='papelfabrica'), server_default='seller', nullable=False),
        sa.Column('ativo', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['fabrica_id'], ['fabrica_unidade.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        if_not_exists=True,
    )
    op.create_index('ix_fabrica_usuario_fabrica_id', 'fabrica_usuario', ['fabrica_id'], if_not_exists=True)
    op.create_index('ix_fabrica_usuario_user_id', 'fabrica_usuario', ['user_id'], if_not_exists=True)


def downgrade() -> None:
    op.drop_index('ix_fabrica_usuario_user_id', table_name='fabrica_usuario')
    op.drop_index('ix_fabrica_usuario_fabrica_id', table_name='fabrica_usuario')
    op.drop_table('fabrica_usuario')
    sa.Enum(name='papelfabrica').drop(op.get_bind(), checkfirst=True)
