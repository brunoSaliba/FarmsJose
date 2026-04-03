import math

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select


async def paginate(
    db: AsyncSession,
    query: Select,
    page: int,
    limit: int,
) -> dict:
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    offset = (page - 1) * limit
    items_query = query.offset(offset).limit(limit)
    result = await db.execute(items_query)
    items = list(result.scalars().all())

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": math.ceil(total / limit) if total > 0 else 1,
    }
