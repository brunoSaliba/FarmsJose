from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType

from app.config import settings
from app.models.configuracao import Configuracao


def build_connection_config(configs: dict[str, str]) -> ConnectionConfig:
    return ConnectionConfig(
        MAIL_USERNAME=configs.get("smtp_user", settings.SMTP_USER),
        MAIL_PASSWORD=configs.get("smtp_password", settings.SMTP_PASSWORD),
        MAIL_FROM=configs.get("smtp_user", settings.SMTP_USER),
        MAIL_PORT=int(configs.get("smtp_port", str(settings.SMTP_PORT))),
        MAIL_SERVER=configs.get("smtp_host", settings.SMTP_HOST),
        MAIL_FROM_NAME=configs.get("email_empresa", settings.EMAIL_FROM_NAME),
        MAIL_STARTTLS=configs.get("smtp_tls", str(settings.SMTP_TLS)).lower() in ("true", "1"),
        MAIL_SSL_TLS=False,
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True,
    )


def configs_to_dict(configs: list[Configuracao]) -> dict[str, str]:
    return {c.chave: c.valor for c in configs}


async def send_email(
    *,
    configs: dict[str, str],
    destinatario: str,
    assunto: str,
    corpo_html: str,
) -> None:
    conf = build_connection_config(configs)
    message = MessageSchema(
        subject=assunto,
        recipients=[destinatario],
        body=corpo_html,
        subtype=MessageType.html,
    )
    fm = FastMail(conf)
    await fm.send_message(message)
