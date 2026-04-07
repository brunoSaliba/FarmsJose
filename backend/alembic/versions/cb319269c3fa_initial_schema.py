"""initial_schema

Revision ID: cb319269c3fa
Revises: 
Create Date: 2026-04-01 15:30:48.040735

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'cb319269c3fa'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- user ---
    op.create_table(
        'user',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('nome', sa.String(200), nullable=False),
        sa.Column('email', sa.String(200), nullable=False),
        sa.Column('hashed_password', sa.String(200), nullable=False),
        sa.Column('is_admin', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('modulos', postgresql.ARRAY(sa.String()), server_default='{}', nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
    )
    op.create_index('ix_user_email', 'user', ['email'], unique=True)

    # --- fazenda (without user_id — added in next migration) ---
    op.execute("CREATE SEQUENCE IF NOT EXISTS fazenda_id_sistema_seq")
    op.create_table(
        'fazenda',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('id_sistema', sa.Integer(), server_default=sa.text("nextval('fazenda_id_sistema_seq')"), nullable=False),
        sa.Column('razao_social', sa.String(200), nullable=False),
        sa.Column('nome_fantasia', sa.String(200), nullable=False),
        sa.Column('cnpj', sa.String(18), nullable=True),
        sa.Column('inscricao_estadual', sa.String(20), nullable=True),
        sa.Column('rg', sa.String(20), nullable=True),
        sa.Column('cpf', sa.String(14), nullable=True),
        sa.Column('telefone', sa.String(15), nullable=True),
        sa.Column('celular', sa.String(15), nullable=True),
        sa.Column('endereco', sa.String(300), nullable=True),
        sa.Column('numero_km', sa.String(20), nullable=True),
        sa.Column('bairro', sa.String(100), nullable=True),
        sa.Column('ponto_referencia', sa.String(200), nullable=True),
        sa.Column('cep', sa.String(10), nullable=True),
        sa.Column('email', sa.String(200), nullable=True),
        sa.Column('caixa_postal', sa.String(20), nullable=True),
        sa.Column('cidade', sa.String(100), nullable=True),
        sa.Column('estado', sa.String(2), nullable=True),
        sa.Column('data_cadastro', sa.Date(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('id_sistema'),
        sa.UniqueConstraint('cnpj'),
        sa.UniqueConstraint('cpf'),
    )

    # --- animal ---
    sexo_enum = sa.Enum('M', 'F', name='sexo_enum')
    sexo_enum.create(op.get_bind(), checkfirst=True)
    op.create_table(
        'animal',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('fazenda_id', sa.UUID(), nullable=False),
        sa.Column('lote_numero', sa.Integer(), nullable=False),
        sa.Column('tipo_identificacao', sa.String(50), nullable=True),
        sa.Column('codigo_identificacao', sa.String(50), nullable=True),
        sa.Column('sexo', sa.Enum('M', 'F', name='sexo_enum', create_type=False), nullable=False),
        sa.Column('is_vaca', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('is_touro', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('is_cria', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('is_recria', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('is_engorda', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('idade_meses', sa.Integer(), nullable=True),
        sa.Column('peso_inicial_kg', sa.Numeric(8, 2), nullable=True),
        sa.Column('preco_compra', sa.Numeric(12, 2), server_default='0', nullable=False),
        sa.Column('origem', sa.String(100), nullable=True),
        sa.Column('historico_sanitario', sa.String(500), nullable=True),
        sa.Column('data_primeira_pesagem', sa.Date(), nullable=True),
        sa.Column('data_cadastro', sa.Date(), nullable=False),
        sa.ForeignKeyConstraint(['fazenda_id'], ['fazenda.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_animal_fazenda_id', 'animal', ['fazenda_id'])
    op.create_index('idx_animal_lote', 'animal', ['fazenda_id', 'lote_numero'])

    # --- historico_sanitario ---
    op.create_table(
        'historico_sanitario',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('animal_id', sa.UUID(), nullable=False),
        sa.Column('vacina', sa.String(100), nullable=False),
        sa.Column('data_aplicacao', sa.Date(), nullable=False),
        sa.Column('observacao', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['animal_id'], ['animal.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_hist_sanitario_animal_id', 'historico_sanitario', ['animal_id'])

    # --- custo_fazenda ---
    op.create_table(
        'custo_fazenda',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('fazenda_id', sa.UUID(), nullable=False),
        sa.Column('custo_total_lote', sa.Numeric(12, 2), server_default='0', nullable=False),
        sa.Column('custo_mensal', sa.Numeric(12, 2), server_default='0', nullable=False),
        sa.Column('custo_diario', sa.Numeric(12, 2), server_default='0', nullable=False),
        sa.Column('custo_total_animal', sa.Numeric(12, 2), server_default='0', nullable=False),
        sa.Column('preco_venda', sa.Numeric(12, 2), server_default='0', nullable=False),
        sa.ForeignKeyConstraint(['fazenda_id'], ['fazenda.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('fazenda_id'),
    )


def downgrade() -> None:
    op.drop_table('custo_fazenda')
    op.drop_index('idx_hist_sanitario_animal_id', table_name='historico_sanitario')
    op.drop_table('historico_sanitario')
    op.drop_index('idx_animal_lote', table_name='animal')
    op.drop_index('idx_animal_fazenda_id', table_name='animal')
    op.drop_table('animal')
    sa.Enum(name='sexo_enum').drop(op.get_bind(), checkfirst=True)
    op.drop_table('fazenda')
    op.execute("DROP SEQUENCE IF EXISTS fazenda_id_sistema_seq")
    op.drop_index('ix_user_email', table_name='user')
    op.drop_table('user')
