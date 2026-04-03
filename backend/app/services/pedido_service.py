from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import FabricaAccessContext
from app.models.fabrica_unidade import PapelFabrica
from app.models.pedido import ItemPedido, StatusPedido
from app.repositories.cliente_repo import ClienteRepository
from app.repositories.pedido_repo import PedidoRepository
from app.repositories.produto_repo import ProdutoRepository
from app.schemas.pedido import ItemPedidoCreate, PedidoCreate, PedidoUpdate


def _calc_item_total(item: ItemPedidoCreate) -> Decimal:
    """Calculate item total applying item-level discount percentage."""
    raw = item.quantidade * item.valor_unitario
    if item.desconto:
        raw = raw * (Decimal(1) - item.desconto / Decimal(100))
    return raw.quantize(Decimal("0.01"))


class PedidoService:
    def __init__(self, session: AsyncSession):
        self.repo = PedidoRepository(session)
        self.cliente_repo = ClienteRepository(session)
        self.produto_repo = ProdutoRepository(session)
        self.session = session

    async def list_pedidos(
        self,
        *,
        ctx: FabricaAccessContext,
        cliente_id: UUID | None = None,
        status_filter: StatusPedido | None = None,
        data_inicio: date | None = None,
        data_fim: date | None = None,
        page: int = 1,
        limit: int = 20,
    ):
        skip = (page - 1) * limit
        # Sellers only see their own pedidos
        seller_user_id = None
        if ctx.vinculo and ctx.vinculo.papel == PapelFabrica.SELLER:
            seller_user_id = ctx.user.id
        items, total = await self.repo.search(
            cliente_id=cliente_id,
            status=status_filter,
            data_inicio=data_inicio,
            data_fim=data_fim,
            fabrica_id=ctx.fabrica.id,
            user_id=seller_user_id,
            skip=skip,
            limit=limit,
        )
        pages = (total + limit - 1) // limit if limit else 1
        return {
            "items": [
                {
                    "id": p.id,
                    "numero": p.numero,
                    "cliente_id": p.cliente_id,
                    "fabrica_id": p.fabrica_id,
                    "nome_cliente": p.nome_cliente,
                    "status": p.status,
                    "observacoes": p.observacoes,
                    "subtotal": p.subtotal,
                    "desconto": p.desconto,
                    "valor_total": p.valor_total,
                    "created_at": p.created_at,
                    "updated_at": p.updated_at,
                    "user_nome": p.user.nome if p.user else None,
                }
                for p in items
            ],
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages,
        }

    async def get_pedido(self, pedido_id: UUID, ctx: FabricaAccessContext):
        """Read-only access. Sellers can only view their own pedidos."""
        pedido = await self.repo.get_with_itens(pedido_id)
        if not pedido or pedido.fabrica_id != ctx.fabrica.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pedido nao encontrado",
            )
        if ctx.vinculo and ctx.vinculo.papel == PapelFabrica.SELLER:
            if pedido.user_id != ctx.user.id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Pedido nao encontrado",
                )
        return pedido

    async def _get_owned_pedido(self, pedido_id: UUID, ctx: FabricaAccessContext):
        """Write access. Sellers can only modify their own pedidos."""
        pedido = await self.repo.get_with_itens(pedido_id)
        if not pedido or pedido.fabrica_id != ctx.fabrica.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pedido nao encontrado",
            )
        if ctx.vinculo and ctx.vinculo.papel == PapelFabrica.SELLER:
            if pedido.user_id != ctx.user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Voce nao pode modificar pedidos de outros usuarios",
                )
        return pedido

    async def create_pedido(self, data: PedidoCreate, ctx: FabricaAccessContext):
        cliente = await self.cliente_repo.get_by_id(data.cliente_id)
        if not cliente or cliente.deletado or cliente.fabrica_id != ctx.fabrica.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cliente nao encontrado",
            )
        if not cliente.ativo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cliente inativo",
            )

        subtotal = Decimal(0)
        items_to_create: list[dict] = []

        for item_data in data.itens:
            produto_nome: str | None = None
            valor_unitario = item_data.valor_unitario
            descricao = item_data.descricao

            # Snapshot product data if produto_id provided
            if item_data.produto_id:
                produto = await self.produto_repo.get_by_id(item_data.produto_id)
                if not produto or produto.deletado or produto.fabrica_id != ctx.fabrica.id:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Produto nao encontrado na fabrica informada",
                    )
                if not produto.ativo:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Produto inativo",
                    )
                produto_nome = produto.nome
                valor_unitario = produto.preco
                if not descricao or descricao == "":
                    descricao = produto.nome

            item_total = _calc_item_total(ItemPedidoCreate(
                produto_id=item_data.produto_id,
                descricao=descricao,
                quantidade=item_data.quantidade,
                valor_unitario=valor_unitario,
                desconto=item_data.desconto,
            ))
            subtotal += item_total
            items_to_create.append({
                "produto_id": item_data.produto_id,
                "descricao": descricao,
                "produto_nome": produto_nome,
                "quantidade": item_data.quantidade,
                "valor_unitario": valor_unitario,
                "desconto": item_data.desconto,
                "valor_total": item_total,
            })

        desconto_pedido = data.desconto or Decimal(0)
        valor_total = subtotal * (Decimal(1) - desconto_pedido / Decimal(100))
        valor_total = valor_total.quantize(Decimal("0.01"))

        pedido = await self.repo.create({
            "user_id": ctx.user.id,
            "fabrica_id": ctx.fabrica.id,
            "cliente_id": data.cliente_id,
            "nome_cliente": cliente.nome,
            "observacoes": data.observacoes,
            "subtotal": subtotal,
            "desconto": desconto_pedido,
            "valor_total": valor_total,
            "status": StatusPedido.RASCUNHO,
        })

        for item_dict in items_to_create:
            item = ItemPedido(pedido_id=pedido.id, **item_dict)
            self.session.add(item)

        await self.session.flush()
        return await self.repo.get_with_itens(pedido.id)

    async def update_pedido(self, pedido_id: UUID, data: PedidoUpdate, ctx: FabricaAccessContext):
        pedido = await self._get_owned_pedido(pedido_id, ctx)
        if pedido.status != StatusPedido.RASCUNHO:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Somente pedidos em rascunho podem ser editados",
            )

        if data.observacoes is not None:
            pedido.observacoes = data.observacoes

        if data.desconto is not None:
            pedido.desconto = data.desconto

        if data.itens is not None:
            await self.repo.delete_itens(pedido_id)
            subtotal = Decimal(0)
            for item_data in data.itens:
                produto_nome: str | None = None
                valor_unitario = item_data.valor_unitario
                descricao = item_data.descricao

                if item_data.produto_id:
                    produto = await self.produto_repo.get_by_id(item_data.produto_id)
                    if not produto or produto.deletado or produto.fabrica_id != ctx.fabrica.id:
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail="Produto nao encontrado na fabrica informada",
                        )
                    if not produto.ativo:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Produto inativo",
                        )
                    produto_nome = produto.nome
                    valor_unitario = produto.preco
                    if not descricao or descricao == "":
                        descricao = produto.nome

                item_total = _calc_item_total(ItemPedidoCreate(
                    produto_id=item_data.produto_id,
                    descricao=descricao,
                    quantidade=item_data.quantidade,
                    valor_unitario=valor_unitario,
                    desconto=item_data.desconto,
                ))
                subtotal += item_total
                item = ItemPedido(
                    pedido_id=pedido.id,
                    produto_id=item_data.produto_id,
                    descricao=descricao,
                    produto_nome=produto_nome,
                    quantidade=item_data.quantidade,
                    valor_unitario=valor_unitario,
                    desconto=item_data.desconto,
                    valor_total=item_total,
                )
                self.session.add(item)

            pedido.subtotal = subtotal
            desconto_pedido = data.desconto if data.desconto is not None else pedido.desconto
            pedido.valor_total = (subtotal * (Decimal(1) - desconto_pedido / Decimal(100))).quantize(Decimal("0.01"))

        elif data.desconto is not None:
            # Recalculate total if only discount changed
            pedido.valor_total = (pedido.subtotal * (Decimal(1) - data.desconto / Decimal(100))).quantize(Decimal("0.01"))

        await self.session.flush()
        return await self.repo.get_with_itens(pedido.id)

    async def confirmar_pedido(self, pedido_id: UUID, ctx: FabricaAccessContext):
        pedido = await self._get_owned_pedido(pedido_id, ctx)
        if pedido.status != StatusPedido.RASCUNHO:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Somente pedidos em rascunho podem ser confirmados",
            )
        if not pedido.itens:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Pedido deve ter pelo menos um item",
            )
        pedido.status = StatusPedido.CONFIRMADO
        await self.session.flush()
        return await self.repo.get_with_itens(pedido.id)

    async def cancelar_pedido(self, pedido_id: UUID, ctx: FabricaAccessContext):
        pedido = await self._get_owned_pedido(pedido_id, ctx)
        if pedido.status == StatusPedido.CANCELADO:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Pedido ja esta cancelado",
            )
        pedido.status = StatusPedido.CANCELADO
        await self.session.flush()
        return await self.repo.get_with_itens(pedido.id)

    async def duplicar_pedido(self, pedido_id: UUID, ctx: FabricaAccessContext):
        pedido = await self.get_pedido(pedido_id, ctx)

        subtotal = Decimal(0)
        items_data: list[dict] = []
        for item in pedido.itens:
            items_data.append({
                "produto_id": item.produto_id,
                "descricao": item.descricao,
                "produto_nome": item.produto_nome,
                "quantidade": item.quantidade,
                "valor_unitario": item.valor_unitario,
                "desconto": item.desconto or Decimal(0),
                "valor_total": item.valor_total,
            })
            subtotal += item.valor_total

        desconto_pedido = pedido.desconto or Decimal(0)
        valor_total = (subtotal * (Decimal(1) - desconto_pedido / Decimal(100))).quantize(Decimal("0.01"))

        novo_pedido = await self.repo.create({
            "user_id": ctx.user.id,
            "fabrica_id": pedido.fabrica_id,
            "cliente_id": pedido.cliente_id,
            "nome_cliente": pedido.nome_cliente,
            "observacoes": pedido.observacoes,
            "subtotal": subtotal,
            "desconto": desconto_pedido,
            "valor_total": valor_total,
            "status": StatusPedido.RASCUNHO,
        })

        for item_dict in items_data:
            novo_item = ItemPedido(pedido_id=novo_pedido.id, **item_dict)
            self.session.add(novo_item)

        await self.session.flush()
        return await self.repo.get_with_itens(novo_pedido.id)
