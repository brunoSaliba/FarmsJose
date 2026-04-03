from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import FabricaAccessContext
from app.models.email_log import EmailLog, StatusEmail, TipoEmail
from app.models.pedido import Pedido, StatusPedido
from app.repositories.configuracao_repo import ConfiguracaoRepository
from app.repositories.email_log_repo import EmailLogRepository
from app.repositories.pedido_repo import PedidoRepository
from app.utils.email_sender import configs_to_dict, send_email


class EmailService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.pedido_repo = PedidoRepository(session)
        self.email_repo = EmailLogRepository(session)
        self.config_repo = ConfiguracaoRepository(session)

    async def _get_fabrica_configs(self, fabrica_id: UUID) -> dict[str, str]:
        configs = await self.config_repo.get_all_by_fabrica(fabrica_id)
        return configs_to_dict(configs)

    def _build_confirmacao_html(self, pedido: Pedido) -> str:
        itens_rows = ""
        for item in pedido.itens:
            desc_col = item.descricao
            if item.desconto and item.desconto > 0:
                desc_col += f" <small style='color:#6b7280'>(-{item.desconto:.0f}%)</small>"
            itens_rows += (
                f"<tr>"
                f"<td style='padding:8px;border:1px solid #ddd'>{desc_col}</td>"
                f"<td style='padding:8px;border:1px solid #ddd;text-align:center'>{item.quantidade}</td>"
                f"<td style='padding:8px;border:1px solid #ddd;text-align:right'>R$ {item.valor_unitario:.2f}</td>"
                f"<td style='padding:8px;border:1px solid #ddd;text-align:right'>R$ {item.valor_total:.2f}</td>"
                f"</tr>"
            )

        desconto_section = ""
        if pedido.desconto and pedido.desconto > 0:
            desconto_section = (
                f"<p><strong>Subtotal:</strong> R$ {pedido.subtotal:.2f}</p>"
                f"<p><strong>Desconto:</strong> {pedido.desconto:.0f}%</p>"
            )

        return f"""
        <html>
        <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#2563eb">Confirmacao de Pedido #{pedido.numero}</h2>
            <p><strong>Cliente:</strong> {pedido.nome_cliente or pedido.cliente.nome}</p>
            <p><strong>Data:</strong> {pedido.created_at.strftime('%d/%m/%Y')}</p>
            {f'<p><strong>Observacoes:</strong> {pedido.observacoes}</p>' if pedido.observacoes else ''}
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
                <thead>
                    <tr style="background:#f3f4f6">
                        <th style="padding:8px;border:1px solid #ddd;text-align:left">Descricao</th>
                        <th style="padding:8px;border:1px solid #ddd;text-align:center">Qtd</th>
                        <th style="padding:8px;border:1px solid #ddd;text-align:right">V. Unit.</th>
                        <th style="padding:8px;border:1px solid #ddd;text-align:right">Total</th>
                    </tr>
                </thead>
                <tbody>{itens_rows}</tbody>
            </table>
            {desconto_section}
            <p style="font-size:18px"><strong>Total: R$ {pedido.valor_total:.2f}</strong></p>
        </body>
        </html>
        """

    def _build_consolidado_html(self, pedidos: list[Pedido], data_inicio: date, data_fim: date) -> str:
        rows = ""
        total_geral = Decimal(0)
        for p in pedidos:
            rows += (
                f"<tr>"
                f"<td style='padding:8px;border:1px solid #ddd'>{p.numero}</td>"
                f"<td style='padding:8px;border:1px solid #ddd'>{p.cliente.nome}</td>"
                f"<td style='padding:8px;border:1px solid #ddd;text-align:center'>{p.status.value}</td>"
                f"<td style='padding:8px;border:1px solid #ddd;text-align:center'>{len(p.itens)}</td>"
                f"<td style='padding:8px;border:1px solid #ddd;text-align:right'>R$ {p.valor_total:.2f}</td>"
                f"</tr>"
            )
            total_geral += p.valor_total

        return f"""
        <html>
        <body style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto">
            <h2 style="color:#2563eb">Relatorio Consolidado de Pedidos</h2>
            <p><strong>Periodo:</strong> {data_inicio.strftime('%d/%m/%Y')} a {data_fim.strftime('%d/%m/%Y')}</p>
            <p><strong>Total de pedidos:</strong> {len(pedidos)}</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
                <thead>
                    <tr style="background:#f3f4f6">
                        <th style="padding:8px;border:1px solid #ddd;text-align:left">N.</th>
                        <th style="padding:8px;border:1px solid #ddd;text-align:left">Cliente</th>
                        <th style="padding:8px;border:1px solid #ddd;text-align:center">Status</th>
                        <th style="padding:8px;border:1px solid #ddd;text-align:center">Itens</th>
                        <th style="padding:8px;border:1px solid #ddd;text-align:right">Total</th>
                    </tr>
                </thead>
                <tbody>{rows}</tbody>
            </table>
            <p style="font-size:18px"><strong>Total Geral: R$ {total_geral:.2f}</strong></p>
        </body>
        </html>
        """

    async def enviar_confirmacao(self, pedido_id: UUID, ctx: FabricaAccessContext):
        pedido = await self.pedido_repo.get_with_itens(pedido_id)
        if not pedido or pedido.fabrica_id != ctx.fabrica.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pedido nao encontrado",
            )

        configs = await self._get_fabrica_configs(ctx.fabrica.id)
        assunto = f"Pedido #{pedido.numero} - Confirmacao"
        corpo = self._build_confirmacao_html(pedido)

        log = EmailLog(
            user_id=ctx.user.id,
            fabrica_id=ctx.fabrica.id,
            tipo=TipoEmail.CONFIRMACAO,
            destinatario=pedido.cliente.email,
            assunto=assunto,
            pedido_id=pedido.id,
            status=StatusEmail.PENDENTE,
        )
        self.session.add(log)
        await self.session.flush()

        try:
            await send_email(
                configs=configs,
                destinatario=pedido.cliente.email,
                assunto=assunto,
                corpo_html=corpo,
            )
            log.status = StatusEmail.ENVIADO
            pedido.status = StatusPedido.ENVIADO
        except Exception as e:
            log.status = StatusEmail.FALHA
            log.erro = str(e)[:500]

        await self.session.flush()
        await self.session.refresh(log)
        return log

    async def enviar_consolidado(self, data_inicio: date, data_fim: date, ctx: FabricaAccessContext):
        configs = await self._get_fabrica_configs(ctx.fabrica.id)
        email_empresa = ctx.fabrica.email_pedido or configs.get("email_empresa")
        if not email_empresa:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email da empresa nao configurado. Configure em Configuracoes.",
            )

        pedidos = await self.pedido_repo.get_by_periodo(
            data_inicio=data_inicio,
            data_fim=data_fim,
            fabrica_id=ctx.fabrica.id,
            statuses=[StatusPedido.CONFIRMADO, StatusPedido.ENVIADO],
        )

        if not pedidos:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nenhum pedido encontrado no periodo",
            )

        assunto = f"Relatorio Consolidado - {data_inicio.strftime('%d/%m/%Y')} a {data_fim.strftime('%d/%m/%Y')}"
        corpo = self._build_consolidado_html(list(pedidos), data_inicio, data_fim)

        log = EmailLog(
            user_id=ctx.user.id,
            fabrica_id=ctx.fabrica.id,
            tipo=TipoEmail.CONSOLIDADO,
            destinatario=email_empresa,
            assunto=assunto,
            status=StatusEmail.PENDENTE,
        )
        self.session.add(log)
        await self.session.flush()

        try:
            await send_email(
                configs=configs,
                destinatario=email_empresa,
                assunto=assunto,
                corpo_html=corpo,
            )
            log.status = StatusEmail.ENVIADO
        except Exception as e:
            log.status = StatusEmail.FALHA
            log.erro = str(e)[:500]

        await self.session.flush()
        await self.session.refresh(log)
        return log

    async def list_logs(self, ctx: FabricaAccessContext, page: int = 1, limit: int = 50):
        skip = (page - 1) * limit
        items, total = await self.email_repo.get_all(
            skip=skip,
            limit=limit,
            filters=[EmailLog.fabrica_id == ctx.fabrica.id],
            order_by=EmailLog.created_at.desc(),
        )
        pages = (total + limit - 1) // limit if limit else 1
        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages,
        }
