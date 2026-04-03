from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.fabrica_unidade import FabricaUnidade, FabricaUsuario, PapelFabrica
from app.models.user import User
from app.repositories.fabrica_unidade_repo import FabricaUnidadeRepository
from app.repositories.fabrica_usuario_repo import FabricaUsuarioRepository
from app.repositories.user_repo import UserRepository

security_scheme = HTTPBearer()


@dataclass
class FabricaAccessContext:
    user: User
    fabrica: FabricaUnidade
    vinculo: FabricaUsuario | None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido")

    repo = UserRepository(db)
    user = await repo.get_by_id(UUID(user_id))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario nao encontrado ou inativo")
    return user


async def get_admin_user(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito a administradores")
    return user


def require_module(module_name: str):
    async def dependency(user: User = Depends(get_current_user)) -> User:
        if user.is_admin:
            return user
        if module_name not in (user.modulos or []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Sem acesso ao modulo '{module_name}'",
            )
        return user
    return dependency


def require_fabrica_access(
    module_name: str,
    *,
    roles: set[PapelFabrica] | None = None,
):
    async def dependency(
        x_fabrica_id: str | None = Header(None, alias="X-Fabrica-Id"),
        user: User = Depends(require_module(module_name)),
        db: AsyncSession = Depends(get_db),
    ) -> FabricaAccessContext:
        if not x_fabrica_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Informe o header X-Fabrica-Id",
            )

        try:
            fabrica_id = UUID(x_fabrica_id)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="X-Fabrica-Id invalido",
            ) from exc

        fabrica_repo = FabricaUnidadeRepository(db)
        fabrica = await fabrica_repo.get_by_id(fabrica_id)
        if not fabrica or fabrica.deletado:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Fabrica nao encontrada",
            )

        if user.is_admin:
            return FabricaAccessContext(user=user, fabrica=fabrica, vinculo=None)

        vinculo_repo = FabricaUsuarioRepository(db)
        vinculo = await vinculo_repo.get_by_user_and_fabrica(user.id, fabrica.id)
        if not vinculo or not vinculo.ativo:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuario sem acesso a esta fabrica",
            )
        if roles and vinculo.papel not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissao insuficiente para esta fabrica",
            )

        return FabricaAccessContext(user=user, fabrica=fabrica, vinculo=vinculo)

    return dependency
