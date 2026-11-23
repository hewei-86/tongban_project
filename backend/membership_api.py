"""会员中心 API。"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from membership import PLANS, grant_membership, membership_payload
from models import RedeemCode, User
from schemas import RedeemRequest
from security import get_current_user

router = APIRouter(prefix="/api/membership", tags=["membership"])


@router.get("/plans")
def plans():
    return {
        "items": [
            {
                "key": plan["key"],
                "name": plan["name"],
                "price_fen": plan["price_fen"],
                "days": plan["days"],
                "ai_daily_quota": plan["ai_daily_quota"],
                "features": plan["features"],
            }
            for plan in PLANS.values()
        ]
    }


@router.get("/status")
def status(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return membership_payload(db, user.id)


@router.post("/redeem")
def redeem(
    data: RedeemRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    code = data.code.strip().upper()
    row = (
        db.query(RedeemCode)
        .filter(RedeemCode.code == code)
        .with_for_update()
        .first()
    )
    if not row:
        raise HTTPException(404, "兑换码不存在")
    if row.revoked:
        raise HTTPException(400, "这个兑换码已作废")
    if row.used_by:
        raise HTTPException(400, "这个兑换码已经被使用")
    if row.plan not in PLANS or row.plan == "free":
        raise HTTPException(400, "兑换码套餐无效")

    row.used_by = user.id
    row.used_at = datetime.now()
    db.commit()
    grant_membership(db, user.id, days=row.days, plan=row.plan, source="redeem")
    return {"ok": True, "membership": membership_payload(db, user.id)}
