from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.fabrica_unidade import PapelFabrica
from app.models.user import User
from app.repositories.fabrica_unidade_repo import FabricaUnidadeRepository
from app.repositories.fabrica_usuario_repo import FabricaUsuarioRepository
from app.repositories.user_repo import UserRepository
from app.schemas.fabrica_unidade import FabricaCreateUser, FabricaUnidadeCreate, FabricaUnidadeUpdate
from app.schemas.fabrica_usuario import FabricaUsuarioCreate, FabricaUsuarioDetailResponse, FabricaUsuarioUpdate
from app.utils.security import hash_password


class FabricaUnidadeService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = FabricaUnidadeRepository(session)
        self.vinculo_repo = FabricaUsuarioRepository(session)

    async def list_fabricas(
        self,
        *,
        user: User,
        q: str | None = None,
        ativo: bool | None = None,
        page: int = 1,
        limit: int = 20,
    ):
        skip = (page - 1) * limit
        if user.is_admin:
            items, total = await self.repo.search(
                q=q, ativo=ativo, user_id=None, skip=skip, limit=limit
            )
        else:
            items, total = await self.repo.search_by_user_membership(
                user_id=user.id, q=q, ativo=ativo, skip=skip, limit=limit
            )
        pages = (total + limit - 1) // limit if limit else 1
        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages,
        }

    async def get_fabrica(self, fabrica_id: UUID, user: User):
        fabrica = await self.repo.get_by_id(fabrica_id)
        if not fabrica or fabrica.deletado:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Fabrica nao encontrada",
            )
        if not user.is_admin:
            vinculo = await self.vinculo_repo.get_by_user_and_fabrica(user.id, fabrica_id)
            if not vinculo or not vinculo.ativo:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Fabrica nao encontrada",
                )
        return fabrica

    async def _get_admin_fabrica(self, fabrica_id: UUID, user: User):
        fabrica = await self.get_fabrica(fabrica_id, user)
        if user.is_admin:
            return fabrica

        vinculo = await self.vinculo_repo.get_by_user_and_fabrica(user.id, fabrica_id)
        if not vinculo or not vinculo.ativo or vinculo.papel != PapelFabrica.SUPERUSUARIO:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Somente admin da fabrica pode alterar esta fabrica",
            )
        return fabrica

    async def create_fabrica(self, data: FabricaUnidadeCreate, user: User):
        user_repo = UserRepository(self.session)

        if user.is_admin:
            # System admin must provide credentials for the fabrica's admin account
            if not data.admin_email or not data.admin_password or not data.admin_nome:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Admin do sistema deve informar nome, email e senha para a fabrica",
                )
            existing = await user_repo.get_by_email(data.admin_email)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Email ja cadastrado",
                )
            fabrica_owner = await user_repo.create({
                "nome": data.admin_nome,
                "email": data.admin_email,
                "hashed_password": hash_password(data.admin_password),
                "modulos": ["fabrica"],
                "is_active": True,
                "is_admin": False,
            })
            owner_id = fabrica_owner.id
        else:
            owner_id = user.id

        data_dict = {
            "nome": data.nome,
            "email_pedido": data.email_pedido,
            "user_id": owner_id,
        }
        fabrica = await self.repo.create(data_dict)
        await self.vinculo_repo.create(
            {
                "fabrica_id": fabrica.id,
                "user_id": owner_id,
                "papel": PapelFabrica.SUPERUSUARIO,
                "ativo": True,
            }
        )
        return fabrica

    async def update_fabrica(self, fabrica_id: UUID, data: FabricaUnidadeUpdate, user: User):
        fabrica = await self._get_admin_fabrica(fabrica_id, user)
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return fabrica
        return await self.repo.update(fabrica, update_data)

    async def delete_fabrica(self, fabrica_id: UUID, user: User):
        fabrica = await self._get_admin_fabrica(fabrica_id, user)
        return await self.repo.update(fabrica, {"deletado": True})

    async def list_usuarios(self, fabrica_id: UUID, user: User):
        await self._get_admin_fabrica(fabrica_id, user)
        return await self.vinculo_repo.list_by_fabrica(fabrica_id)

    async def add_usuario(self, fabrica_id: UUID, data: FabricaUsuarioCreate, user: User):
        await self._get_admin_fabrica(fabrica_id, user)
        existing = await self.vinculo_repo.get_by_user_and_fabrica(data.user_id, fabrica_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Usuario ja vinculado a fabrica",
            )
        return await self.vinculo_repo.create(
            {
                "fabrica_id": fabrica_id,
                "user_id": data.user_id,
                "papel": data.papel,
                "ativo": True,
            }
        )

    async def update_usuario(
        self,
        fabrica_id: UUID,
        vinculo_id: UUID,
        data: FabricaUsuarioUpdate,
        user: User,
    ):
        await self._get_admin_fabrica(fabrica_id, user)
        vinculos = await self.vinculo_repo.list_by_fabrica(fabrica_id)
        vinculo = next((item for item in vinculos if item.id == vinculo_id), None)
        if not vinculo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vinculo nao encontrado",
            )
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return vinculo
        return await self.vinculo_repo.update(vinculo, update_data)

    async def list_usuarios_detail(self, fabrica_id: UUID, user: User) -> list[FabricaUsuarioDetailResponse]:
        await self._get_admin_fabrica(fabrica_id, user)
        vinculos = await self.vinculo_repo.list_by_fabrica(fabrica_id)
        return [FabricaUsuarioDetailResponse.from_vinculo(v) for v in vinculos]

    async def create_and_link_usuario(self, fabrica_id: UUID, data: FabricaCreateUser, requestor: User):
        await self._get_admin_fabrica(fabrica_id, requestor)
        user_repo = UserRepository(self.session)
        existing = await user_repo.get_by_email(data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email ja cadastrado",
            )
        new_user = await user_repo.create({
            "nome": data.nome,
            "email": data.email,
            "hashed_password": hash_password(data.password),
            "modulos": ["fabrica"],
            "is_active": True,
            "is_admin": False,
        })
        vinculo = await self.vinculo_repo.create({
            "fabrica_id": fabrica_id,
            "user_id": new_user.id,
            "papel": data.papel,
            "ativo": True,
        })
        # Reload with user relationship
        vinculos = await self.vinculo_repo.list_by_fabrica(fabrica_id)
        created = next((v for v in vinculos if v.id == vinculo.id), None)
        if not created:
            raise HTTPException(status_code=500, detail="Erro ao criar usuario")
        return FabricaUsuarioDetailResponse.from_vinculo(created)

    async def deactivate_usuario(self, fabrica_id: UUID, vinculo_id: UUID, requestor: User):
        await self._get_admin_fabrica(fabrica_id, requestor)
        vinculos = await self.vinculo_repo.list_by_fabrica(fabrica_id)
        vinculo = next((v for v in vinculos if v.id == vinculo_id), None)
        if not vinculo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vinculo nao encontrado",
            )
        # Prevent removing yourself
        if vinculo.user_id == requestor.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Voce nao pode remover seu proprio acesso",
            )
        await self.vinculo_repo.update(vinculo, {"ativo": False})

    async def get_meu_acesso(self, fabrica_id: UUID, user: User):
        fabrica = await self.repo.get_by_id(fabrica_id)
        if not fabrica or fabrica.deletado:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Fabrica nao encontrada",
            )
        if user.is_admin:
            return {"papel": PapelFabrica.SUPERUSUARIO, "ativo": True, "is_system_admin": True}
        vinculo = await self.vinculo_repo.get_by_user_and_fabrica(user.id, fabrica_id)
        if not vinculo or not vinculo.ativo:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sem acesso a esta fabrica",
            )
        return {"papel": vinculo.papel, "ativo": vinculo.ativo, "is_system_admin": False}

    async def get_conta(self, fabrica_id: UUID, user: User):
        await self._get_admin_fabrica(fabrica_id, user)
        fabrica = await self.repo.get_by_id(fabrica_id)
        if not fabrica or not fabrica.user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conta nao encontrada")
        user_repo = UserRepository(self.session)
        owner = await user_repo.get_by_id(fabrica.user_id)
        if not owner:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conta nao encontrada")
        return {"user_id": owner.id, "nome": owner.nome, "email": owner.email}

    async def update_conta(self, fabrica_id: UUID, data, user: User):
        await self._get_admin_fabrica(fabrica_id, user)
        fabrica = await self.repo.get_by_id(fabrica_id)
        if not fabrica or not fabrica.user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conta nao encontrada")
        user_repo = UserRepository(self.session)
        owner = await user_repo.get_by_id(fabrica.user_id)
        if not owner:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conta nao encontrada")
        update_data: dict = {}
        if data.nome is not None:
            update_data["nome"] = data.nome
        if data.email is not None:
            existing = await user_repo.get_by_email(data.email)
            if existing and existing.id != owner.id:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email ja cadastrado")
            update_data["email"] = data.email
        if data.password is not None:
            update_data["hashed_password"] = hash_password(data.password)
        if update_data:
            owner = await user_repo.update(owner, update_data)
        return {"user_id": owner.id, "nome": owner.nome, "email": owner.email}
