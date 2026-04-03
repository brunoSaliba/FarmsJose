import re

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_admin_user
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["Admin"])

# Block any statement that mutates data or schema
_BLOCKED = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|GRANT|REVOKE|EXECUTE|EXEC|CALL|COPY|VACUUM|ANALYZE|LOCK|SET|RESET|COMMENT|SECURITY|DO)\b",
    re.IGNORECASE,
)

_MAX_ROWS = 500


class QueryRequest(BaseModel):
    sql: str


class QueryResponse(BaseModel):
    columns: list[str]
    rows: list[list]
    row_count: int
    truncated: bool


@router.post("/query", response_model=QueryResponse)
async def run_query(
    body: QueryRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
) -> QueryResponse:
    sql = body.sql.strip().rstrip(";")

    if not sql:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Query vazia")

    # Must start with SELECT (after stripping leading comments/whitespace)
    first_word = re.split(r"\s+", re.sub(r"--[^\n]*|/\*.*?\*/", "", sql, flags=re.DOTALL).strip())[0].upper()
    if first_word != "SELECT":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Apenas SELECT e permitido")

    if _BLOCKED.search(sql):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Apenas SELECT e permitido")

    try:
        result = await db.execute(text(sql))
        columns: list[str] = list(result.keys())
        all_rows = result.fetchall()
        truncated = len(all_rows) > _MAX_ROWS
        rows = [[str(v) if v is not None else None for v in row] for row in all_rows[:_MAX_ROWS]]
        return QueryResponse(columns=columns, rows=rows, row_count=len(all_rows), truncated=truncated)
    except Exception as exc:
        # Expose the DB error message to the admin user — safe since admin-only
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
