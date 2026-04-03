from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, AsyncSessionLocal
from app.models.base import Base
from app.models import fazenda, animal, historico_sanitario, custo_fazenda, user  # noqa – registers models
from app.models import cliente, pedido, email_log, configuracao, produto, fabrica_unidade  # noqa – registers Modulo 2 models
from app.routers import fazendas, animais, historico_sanitario, custos, auth
from app.routers import clientes, pedidos, configuracoes, email as email_router
from app.routers import produtos as produtos_router
from app.routers import fabricas as fabricas_router
from app.routers import admin as admin_router
from app.repositories.user_repo import UserRepository
from app.utils.security import hash_password


async def seed_admin():
    async with AsyncSessionLocal() as session:
        repo = UserRepository(session)
        existing = await repo.get_by_email(settings.ADMIN_EMAIL)
        if not existing:
            await repo.create({
                "nome": "Admin",
                "email": settings.ADMIN_EMAIL,
                "hashed_password": hash_password(settings.ADMIN_PASSWORD),
                "is_admin": True,
                "is_active": True,
                "modulos": ["animais"],
            })
            await session.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_admin()
    yield
    await engine.dispose()


app = FastAPI(
    title="FarmsJose API",
    description="Sistema de Gestao de Fazendas e Animais",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(fazendas.router, prefix="/api/v1")
app.include_router(animais.router, prefix="/api/v1")
app.include_router(historico_sanitario.router, prefix="/api/v1")
app.include_router(custos.router, prefix="/api/v1")
app.include_router(clientes.router, prefix="/api/v1")
app.include_router(pedidos.router, prefix="/api/v1")
app.include_router(configuracoes.router, prefix="/api/v1")
app.include_router(email_router.router, prefix="/api/v1")
app.include_router(produtos_router.router, prefix="/api/v1")
app.include_router(fabricas_router.router, prefix="/api/v1")
app.include_router(admin_router.router, prefix="/api/v1")


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
