"""会员套餐、权益与 AI 额度。"""

from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from models import AiUsage, Membership

PLANS = {
    "free": {
        "key": "free",
        "name": "免费版",
        "price_fen": 0,
        "days": 0,
        "ai_daily_quota": 5,
        "features": ["每日练习", "基础成长记录", "每天 5 次 AI 解析 / 出题 / 讲解"],
    },
    "pro": {
        "key": "pro",
        "name": "家庭会员",
        "price_fen": 9900,
        "days": 365,
        "ai_daily_quota": 100,
        "features": [
            "每天 100 次 AI 解析 / 出题 / 讲解",
            "AI 次数是免费版的 20 倍",
            "新功能优先体验",
            "支持童伴持续开发"
        ],
    },
}


def get_active_membership(db: Session, user_id: int) -> Membership | None:
    row = db.get(Membership, user_id)
    if not row or not row.expires_at:
        return None
    if row.plan not in PLANS or row.plan == "free":
        return None
    if row.expires_at <= datetime.now():
        return None
    return row


def membership_plan(db: Session, user_id: int) -> str:
    row = get_active_membership(db, user_id)
    return row.plan if row else "free"


def ai_used_today(db: Session, user_id: int) -> int:
    row = (
        db.query(AiUsage)
        .filter(AiUsage.user_id == user_id, AiUsage.usage_date == date.today())
        .first()
    )
    return row.count if row else 0


def record_ai_use(db: Session, user_id: int) -> int:
    row = (
        db.query(AiUsage)
        .filter(AiUsage.user_id == user_id, AiUsage.usage_date == date.today())
        .first()
    )
    if row:
        row.count += 1
    else:
        row = AiUsage(user_id=user_id, usage_date=date.today(), count=1)
        db.add(row)
    db.commit()
    return row.count


def grant_membership(
    db: Session,
    user_id: int,
    days: int = 365,
    plan: str = "pro",
    source: str = "admin",
) -> Membership:
    plan = plan if plan in PLANS and plan != "free" else "pro"
    days = max(1, min(3650, int(days)))
    now = datetime.now()
    row = db.get(Membership, user_id)
    if row is None:
        row = Membership(user_id=user_id, started_at=now)
        db.add(row)
    base = row.expires_at if row.expires_at and row.expires_at > now else now
    row.plan = plan
    row.expires_at = base + timedelta(days=days)
    row.source = source
    row.updated_at = now
    db.commit()
    db.refresh(row)
    return row


def membership_payload(db: Session, user_id: int) -> dict:
    row = get_active_membership(db, user_id)
    plan = row.plan if row else "free"
    quota = PLANS[plan]["ai_daily_quota"]
    used = ai_used_today(db, user_id)
    expires_at = row.expires_at if row else None
    days_left = max(0, (expires_at.date() - date.today()).days) if expires_at else 0
    return {
        "plan": plan,
        "plan_name": PLANS[plan]["name"],
        "is_member": plan != "free",
        "expires_at": expires_at.isoformat() if expires_at else None,
        "days_left": days_left,
        "ai_quota": quota,
        "ai_used_today": used,
        "ai_left_today": max(0, quota - used),
        "features": PLANS[plan]["features"],
    }
