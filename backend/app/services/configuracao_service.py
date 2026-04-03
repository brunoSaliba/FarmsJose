from dataclasses import dataclass
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import FabricaAccessContext
from app.models.configuracao import Configuracao
from app.repositories.configuracao_repo import ConfiguracaoRepository

# Keys whose values must never be returned in plaintext
SENSITIVE_KEYS: set[str] = {"smtp_password"}
# Sentinel returned to clients instead of the real value
MASKED_SENTINEL = "__SET__"


@dataclass
class ConfiguracaoMasked:
    """Wraps a Configuracao ORM object and masks sensitive values."""
    id: object
    chave: str
    valor: str
    updated_at: object


def _mask(cfg: Configuracao) -> ConfiguracaoMasked:
    valor = MASKED_SENTINEL if cfg.chave in SENSITIVE_KEYS and cfg.valor else cfg.valor
    return ConfiguracaoMasked(id=cfg.id, chave=cfg.chave, valor=valor, updated_at=cfg.updated_at)


class ConfiguracaoService:
    def __init__(self, session: AsyncSession):
        self.repo = ConfiguracaoRepository(session)

    async def get_all(self, ctx: FabricaAccessContext) -> list[ConfiguracaoMasked]:
        configs = await self.repo.get_all_by_fabrica(ctx.fabrica.id)
        return [_mask(c) for c in configs]

    async def upsert(self, ctx: FabricaAccessContext, chave: str, valor: str) -> ConfiguracaoMasked:
        # If the client sends back the sentinel, it means the field was not changed — skip update
        if chave in SENSITIVE_KEYS and valor == MASKED_SENTINEL:
            existing = await self.repo.get_by_chave(ctx.fabrica.id, chave)
            if existing:
                return _mask(existing)
        result = await self.repo.upsert(ctx.fabrica.id, chave, valor)
        return _mask(result)
