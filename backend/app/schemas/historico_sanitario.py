import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class HistSanitarioCreate(BaseModel):
    vacina: str = Field(..., min_length=1, max_length=100)
    data_aplicacao: date
    observacao: str | None = None


class HistSanitarioResponse(BaseModel):
    id: uuid.UUID
    animal_id: uuid.UUID
    vacina: str
    data_aplicacao: date
    observacao: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
