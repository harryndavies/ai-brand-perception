from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func

from app.core.auth import get_current_user
from app.core.database import get_session
from app.models.report import Report
from app.models.user import User

router = APIRouter(prefix="/api/usage", tags=["usage"])


@router.get("")
def get_usage(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    total = session.exec(
        select(func.count()).select_from(Report).where(Report.user_id == user.id)
    ).one()
    return {
        "credits_used": total,
        "credits_total": 100,
        "analyses_this_month": total,
    }
