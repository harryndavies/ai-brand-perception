from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.core.auth import get_current_user
from app.core.database import get_session
from app.models.report import Report
from app.models.user import User

router = APIRouter(prefix="/api/reports", tags=["reports"])


class CreateReportRequest(BaseModel):
    brand: str
    competitors: list[str] = []


@router.get("")
def list_reports(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    reports = session.exec(
        select(Report).where(Report.user_id == user.id).order_by(Report.created_at.desc())
    ).all()
    return reports


@router.get("/{report_id}")
def get_report(
    report_id: str,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    report = session.exec(
        select(Report).where(Report.id == report_id, Report.user_id == user.id)
    ).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return report


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_report(
    body: CreateReportRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    report = Report(
        user_id=user.id,
        brand=body.brand,
        competitors=body.competitors[:3],
        status="pending",
    )
    session.add(report)
    session.commit()
    session.refresh(report)

    return report
