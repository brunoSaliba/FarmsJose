"""add_fabrica_unidade_and_improvements

Revision ID: e4a1b2c3d4f5
Revises: d3080672ca81
Create Date: 2026-04-02 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e4a1b2c3d4f5'
down_revision: Union[str, None] = 'd3080672ca81'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create fabrica_unidade table
    op.create_table(
        'fabrica_unidade',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('nome', sa.String(200), nullable=False),
        sa.Column('email_pedido', sa.String(254), nullable=True),
        sa.Column('ativo', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='RESTRICT'),
        if_not_exists=True,
    )
    op.create_index('ix_fabrica_unidade_user_id', 'fabrica_unidade', ['user_id'], if_not_exists=True)

    # 2. Add sku and fabrica_id to produto
    with op.batch_alter_table('produto') as batch_op:
        batch_op.add_column(sa.Column('sku', sa.String(50), nullable=True))
        batch_op.add_column(sa.Column('fabrica_id', sa.Uuid(), nullable=True))
        batch_op.create_foreign_key('fk_produto_fabrica_id', 'fabrica_unidade', ['fabrica_id'], ['id'], ondelete='SET NULL')
        batch_op.create_index('ix_produto_fabrica_id', ['fabrica_id'])

    # 3. Add new enum values to status_pedido_enum
    op.execute("ALTER TYPE status_pedido_enum ADD VALUE IF NOT EXISTS 'em_processamento'")
    op.execute("ALTER TYPE status_pedido_enum ADD VALUE IF NOT EXISTS 'finalizado'")

    # 4. Add fabrica_id, nome_cliente, subtotal, desconto to pedido
    with op.batch_alter_table('pedido') as batch_op:
        batch_op.add_column(sa.Column('fabrica_id', sa.Uuid(), nullable=True))
        batch_op.add_column(sa.Column('nome_cliente', sa.String(150), nullable=True))
        batch_op.add_column(sa.Column('subtotal', sa.Numeric(12, 2), server_default='0', nullable=False))
        batch_op.add_column(sa.Column('desconto', sa.Numeric(5, 2), server_default='0', nullable=False))
        batch_op.create_foreign_key('fk_pedido_fabrica_id', 'fabrica_unidade', ['fabrica_id'], ['id'], ondelete='SET NULL')
        batch_op.create_index('ix_pedido_fabrica_id', ['fabrica_id'])

    # Backfill subtotal with existing valor_total for old pedidos
    op.execute("UPDATE pedido SET subtotal = valor_total WHERE subtotal = 0 AND valor_total > 0")

    # 5. Add produto_id, produto_nome, desconto to item_pedido
    with op.batch_alter_table('item_pedido') as batch_op:
        batch_op.add_column(sa.Column('produto_id', sa.Uuid(), nullable=True))
        batch_op.add_column(sa.Column('produto_nome', sa.String(200), nullable=True))
        batch_op.add_column(sa.Column('desconto', sa.Numeric(5, 2), server_default='0', nullable=False))
        batch_op.create_foreign_key('fk_item_pedido_produto_id', 'produto', ['produto_id'], ['id'], ondelete='SET NULL')
        batch_op.create_index('ix_item_pedido_produto_id', ['produto_id'])


def downgrade() -> None:
    # 5. Remove item_pedido additions
    with op.batch_alter_table('item_pedido') as batch_op:
        batch_op.drop_constraint('fk_item_pedido_produto_id', type_='foreignkey')
        batch_op.drop_index('ix_item_pedido_produto_id')
        batch_op.drop_column('desconto')
        batch_op.drop_column('produto_nome')
        batch_op.drop_column('produto_id')

    # 4. Remove pedido additions
    with op.batch_alter_table('pedido') as batch_op:
        batch_op.drop_constraint('fk_pedido_fabrica_id', type_='foreignkey')
        batch_op.drop_index('ix_pedido_fabrica_id')
        batch_op.drop_column('desconto')
        batch_op.drop_column('subtotal')
        batch_op.drop_column('nome_cliente')
        batch_op.drop_column('fabrica_id')

    # 3. Cannot remove enum values in PostgreSQL without dropping and recreating the type

    # 2. Remove produto additions
    with op.batch_alter_table('produto') as batch_op:
        batch_op.drop_constraint('fk_produto_fabrica_id', type_='foreignkey')
        batch_op.drop_index('ix_produto_fabrica_id')
        batch_op.drop_column('fabrica_id')
        batch_op.drop_column('sku')

    # 1. Drop fabrica_unidade
    op.drop_index('ix_fabrica_unidade_user_id', table_name='fabrica_unidade')
    op.drop_table('fabrica_unidade')
