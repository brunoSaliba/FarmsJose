"""add_produto

Revision ID: d3080672ca81
Revises: f633c30b06da
Create Date: 2026-04-02 16:37:56.783913

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd3080672ca81'
down_revision: Union[str, None] = 'f633c30b06da'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('produto',
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('nome', sa.String(length=200), nullable=False),
        sa.Column('descricao', sa.String(length=500), nullable=True),
        sa.Column('unidade', sa.String(length=20), nullable=False),
        sa.Column('preco', sa.Numeric(precision=10, scale=2), server_default='0', nullable=False),
        sa.Column('ativo', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
        if_not_exists=True,
    )
    op.create_index(op.f('ix_produto_user_id'), 'produto', ['user_id'], unique=False, if_not_exists=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_produto_user_id'), table_name='produto')
    op.drop_table('produto')
