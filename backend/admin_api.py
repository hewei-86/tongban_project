"""后台管理 API（管理员专用）。"""

import json
import secrets
from datetime import date, datetime, time

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from membership import PLANS, grant_membership, membership_payload
from models import (
    AdminAudit,
    Membership,
    PkMatch,
    Question,
    RedeemCode,
    User,
    UserStatus,
)
from schemas import (
    LoginRequest,
    MembershipGrantRequest,
    QuestionInput,
    RedeemCodeCreateRequest,
    UserStatusRequest,
)
from security import create_access_token, get_admin_user, verify_password

router = APIRouter(prefix="/api/admin", tags=["admin"])

CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def audit(db: Session, admin_id: int, action: str, target: str = "", detail=None) -> None:
    db.add(
        AdminAudit(
            admin_id=admin_id,
            action=action,
            target=target,
            detail=json.dumps(detail, ensure_ascii=False) if detail is not None else "",
        )
    )
    db.commit()


def admin_payload(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "nickname": user.nickname,
        "role": user.role,
    }


def user_row(db: Session, user: User) -> dict:
    status = db.get(UserStatus, user.id)
    membership = membership_payload(db, user.id)
    return {
        "id": user.id,
        "username": user.username,
        "nickname": user.nickname,
        "role": user.role,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "active": status.is_active if status else True,
        "membership": membership,
    }


@router.post("/login")
def admin_login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username.strip().lower()).first()
    if not user or user.role != "admin" or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="管理员账号或密码不正确")
    return {"token": create_access_token(user.id), "user": admin_payload(user)}


@router.get("/dashboard")
def dashboard(admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    today_start = datetime.combine(date.today(), time.min)
    now = datetime.now()
    total_users = db.query(User).filter(User.role != "admin").count()
    today_users = (
        db.query(User)
        .filter(User.created_at >= today_start, User.role != "admin")
        .count()
    )
    active_members = (
        db.query(Membership)
        .filter(Membership.expires_at > now, Membership.plan != "free")
        .count()
    )
    unused_codes = (
        db.query(RedeemCode)
        .filter(RedeemCode.used_by.is_(None), RedeemCode.revoked.is_(False))
        .count()
    )
    pk_matches = db.query(PkMatch).count()
    recent = (
        db.query(User)
        .filter(User.role != "admin")
        .order_by(User.created_at.desc())
        .limit(8)
        .all()
    )
    return {
        "total_users": total_users,
        "today_users": today_users,
        "active_members": active_members,
        "unused_codes": unused_codes,
        "pk_matches": pk_matches,
        "recent_users": [user_row(db, item) for item in recent],
    }


@router.get("/users")
def users(
    search: str = Query(default="", max_length=50),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    query = db.query(User).filter(User.role != "admin")
    if search.strip():
        keyword = f"%{search.strip()}%"
        query = query.filter((User.username.like(keyword)) | (User.nickname.like(keyword)))
    total = query.count()
    rows = query.order_by(User.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return {"total": total, "page": page, "size": size, "items": [user_row(db, u) for u in rows]}


@router.post("/users/{user_id}/status")
def set_user_status(
    user_id: int,
    data: UserStatusRequest,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "用户不存在")
    if user.role == "admin":
        raise HTTPException(400, "不能停用管理员账号")
    status = db.get(UserStatus, user_id)
    if status is None:
        status = UserStatus(user_id=user_id)
        db.add(status)
    status.is_active = data.active
    status.reason = data.reason[:200]
    db.commit()
    audit(db, admin.id, "user.status", str(user_id), {"active": data.active, "reason": data.reason})
    return {"ok": True, "user": user_row(db, user)}


@router.post("/users/{user_id}/membership")
def grant_user_membership(
    user_id: int,
    data: MembershipGrantRequest,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "用户不存在")
    if data.plan not in PLANS or data.plan == "free":
        raise HTTPException(400, "套餐不存在")
    grant_membership(db, user_id, days=data.days, plan=data.plan, source="admin")
    audit(db, admin.id, "membership.grant", str(user_id), {"days": data.days, "plan": data.plan})
    return {"ok": True, "membership": membership_payload(db, user_id)}


@router.get("/memberships")
def list_memberships(admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    now = datetime.now()
    rows = (
        db.query(Membership)
        .filter(Membership.expires_at > now, Membership.plan != "free")
        .order_by(Membership.expires_at.asc())
        .limit(200)
        .all()
    )
    result = []
    for row in rows:
        user = db.get(User, row.user_id)
        result.append(
            {
                "user_id": row.user_id,
                "username": user.username if user else "",
                "nickname": user.nickname if user else "",
                "plan": row.plan,
                "expires_at": row.expires_at.isoformat() if row.expires_at else None,
                "source": row.source,
            }
        )
    return {"items": result}


def generate_code() -> str:
    part = lambda: "".join(secrets.choice(CODE_ALPHABET) for _ in range(4))
    return f"TB-{part()}-{part()}"


@router.post("/redeem-codes")
def create_codes(
    data: RedeemCodeCreateRequest,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    if data.plan not in PLANS or data.plan == "free":
        raise HTTPException(400, "套餐不存在")
    batch = data.batch.strip() or datetime.now().strftime("%Y%m%d")
    created = []
    for _ in range(data.count):
        for _attempt in range(8):
            code = generate_code()
            if not db.query(RedeemCode).filter(RedeemCode.code == code).first():
                break
        else:
            raise HTTPException(500, "兑换码生成失败，请重试")
        row = RedeemCode(code=code, plan=data.plan, days=data.days, batch=batch)
        db.add(row)
        created.append(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "兑换码冲突，请重试")
    audit(db, admin.id, "redeem.create", batch, {"count": data.count, "days": data.days})
    return {
        "items": [
            {"id": row.id, "code": row.code, "plan": row.plan, "days": row.days, "batch": row.batch}
            for row in created
        ]
    }


@router.get("/redeem-codes")
def list_codes(
    status: str = Query(default="all"),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    query = db.query(RedeemCode)
    if status == "unused":
        query = query.filter(RedeemCode.used_by.is_(None), RedeemCode.revoked.is_(False))
    elif status == "used":
        query = query.filter(RedeemCode.used_by.is_not(None))
    elif status == "revoked":
        query = query.filter(RedeemCode.revoked.is_(True))
    rows = query.order_by(RedeemCode.created_at.desc()).limit(200).all()
    user_ids = {row.used_by for row in rows if row.used_by}
    users_map = {u.id: u for u in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}
    return {
        "items": [
            {
                "id": row.id,
                "code": row.code,
                "plan": row.plan,
                "days": row.days,
                "batch": row.batch,
                "used_by": row.used_by,
                "used_by_name": (users_map.get(row.used_by).username if users_map.get(row.used_by) else ""),
                "used_at": row.used_at.isoformat() if row.used_at else None,
                "revoked": row.revoked,
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
            for row in rows
        ]
    }


@router.post("/redeem-codes/{code_id}/revoke")
def revoke_code(code_id: int, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    row = db.get(RedeemCode, code_id)
    if not row:
        raise HTTPException(404, "兑换码不存在")
    if row.used_by:
        raise HTTPException(400, "已使用的兑换码不能作废")
    row.revoked = True
    db.commit()
    audit(db, admin.id, "redeem.revoke", str(code_id))
    return {"ok": True}


@router.get("/questions")
def list_questions(
    subject: str = Query(default=""),
    grade: int = Query(default=0),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    query = db.query(Question)
    if subject:
        query = query.filter(Question.subject == subject)
    if grade:
        query = query.filter(Question.grade == grade)
    rows = query.order_by(Question.id.desc()).limit(300).all()
    return {
        "items": [
            {
                "id": row.id,
                "subject": row.subject,
                "grade": row.grade,
                "content": row.content,
                "answer": row.answer,
                "explanation": row.explanation,
                "options": json.loads(row.options) if row.options else [],
            }
            for row in rows
        ]
    }


@router.post("/questions")
def create_question(
    data: QuestionInput,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    row = Question(
        subject=data.subject,
        grade=data.grade,
        content=data.content,
        answer=data.answer,
        explanation=data.explanation,
        options=json.dumps(data.options, ensure_ascii=False) if data.options else None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    audit(db, admin.id, "question.create", str(row.id))
    return {"ok": True, "id": row.id}


@router.put("/questions/{question_id}")
def update_question(
    question_id: int,
    data: QuestionInput,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    row = db.get(Question, question_id)
    if not row:
        raise HTTPException(404, "题目不存在")
    row.subject = data.subject
    row.grade = data.grade
    row.content = data.content
    row.answer = data.answer
    row.explanation = data.explanation
    row.options = json.dumps(data.options, ensure_ascii=False) if data.options else None
    db.commit()
    audit(db, admin.id, "question.update", str(question_id))
    return {"ok": True}


@router.delete("/questions/{question_id}")
def delete_question(
    question_id: int,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    row = db.get(Question, question_id)
    if not row:
        raise HTTPException(404, "题目不存在")
    db.delete(row)
    db.commit()
    audit(db, admin.id, "question.delete", str(question_id))
    return {"ok": True}


@router.get("/pk/matches")
def pk_matches(admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    rows = db.query(PkMatch).order_by(PkMatch.created_at.desc()).limit(100).all()
    users_map = {
        u.id: u
        for u in db.query(User).filter(
            User.id.in_({row.player1_id for row in rows} | {row.player2_id for row in rows})
        ).all()
    } if rows else {}
    return {
        "items": [
            {
                "id": row.id,
                "player1": users_map.get(row.player1_id).username if users_map.get(row.player1_id) else row.player1_id,
                "player2": users_map.get(row.player2_id).username if users_map.get(row.player2_id) else row.player2_id,
                "player1_score": row.player1_score,
                "player2_score": row.player2_score,
                "winner_id": row.winner_id,
                "question_count": row.question_count,
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
            for row in rows
        ]
    }


@router.get("/audits")
def audits(admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    rows = db.query(AdminAudit).order_by(AdminAudit.created_at.desc()).limit(100).all()
    return {
        "items": [
            {
                "id": row.id,
                "admin_id": row.admin_id,
                "action": row.action,
                "target": row.target,
                "detail": row.detail,
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
            for row in rows
        ]
    }
