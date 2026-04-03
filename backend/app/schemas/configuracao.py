import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ConfiguracaoUpsert(BaseModel):
    valor: str = Field(..., max_length=500)


class ConfiguracaoResponse(BaseModel):
    id: uuid.UUID
    chave: str
    valor: str
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
