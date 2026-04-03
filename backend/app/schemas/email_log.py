import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.models.email_log import StatusEmail, TipoEmail


class EmailRelatorioRequest(BaseModel):
    data_inicio: date
    data_fim: date


class EmailLogResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    fabrica_id: uuid.UUID
    tipo: TipoEmail
    destinatario: str
    assunto: str
    status: StatusEmail
    erro: str | None
    pedido_id: uuid.UUID | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
