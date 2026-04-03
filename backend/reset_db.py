import asyncio
from sqlalchemy import text
from app.database import engine


async def reset():
    async with engine.begin() as conn:
        tables = [
            'item_pedido', 'email_log', 'pedido',
            'configuracao', 'produto', 'cliente',
            'fabrica_usuario', 'fabrica_unidade',
            'custo_fazenda', 'historico_sanitario', 'animal', 'fazenda',
            'user'
        ]
        await conn.execute(text('SET session_replication_role = replica'))
        for t in tables:
            await conn.execute(text(f'TRUNCATE TABLE "{t}" CASCADE'))
        await conn.execute(text('SET session_replication_role = DEFAULT'))
        await conn.execute(text('ALTER SEQUENCE IF EXISTS fazenda_id_sistema_seq RESTART WITH 1'))
        await conn.execute(text('ALTER SEQUENCE IF EXISTS pedido_numero_seq RESTART WITH 1'))
    print('DB cleared')

asyncio.run(reset())
