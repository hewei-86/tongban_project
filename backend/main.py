import json
import os
import random
import re
from datetime import datetime, timedelta
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import Base, engine, get_db, SessionLocal
from models import (
    User, Family, FamilyMember, ChildProfile, Question, LearningRecord, Evaluation, AiChat,
    CheckIn, DailyTask, UserTaskProgress, WrongQuestion, Achievement, UserAchievement,
    GrowthRecord, ParentGoal, TimeLimit, ChallengePlay,
)
from schemas import (
    CheckInRequest, TaskCompleteRequest, LearningSubmitRequest,
    AiChatRequest, GoalCreateRequest, TimeLimitRequest, PracticeGenerateRequest,
    EvaluationCreateRequest, WrongRetryRequest, ChallengeSubmitRequest,
)

load_dotenv(verbose=True)
app = FastAPI(title="童伴成长 API", version="1.0.0")

DASHSCOPE_API_KEY = os.environ.get("DASHSCOPE_API_KEY", "").strip()
QWEN_MODEL = os.environ.get("QWEN_MODEL", "qwen-turbo").strip() or "qwen-turbo"
QWEN_ENDPOINT = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"


def call_qwen(messages: list, temperature: float = 0.7) -> str | None:
    if not DASHSCOPE_API_KEY:
        return None
    try:
        resp = httpx.post(
            QWEN_ENDPOINT,
            headers={
                "Authorization": f"Bearer {DASHSCOPE_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": QWEN_MODEL,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": 1024,
            },
            timeout=15.0,
        )
        if resp.status_code == 200:
            data = resp.json()
            return data["choices"][0]["message"]["content"].strip()
        print(f"[qwen] HTTP {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        print(f"[qwen] call failed: {e}")
    return None

ALLOW_ORIGINS = [item.strip() for item in os.environ.get("ALLOW_ORIGINS", "*").split(",") if item.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS or ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

TODAY = lambda: datetime.now().strftime("%Y-%m-%d")
SUBJECT_MAP = {"math": "数学", "chinese": "语文", "english": "英语"}
SUBJECT_ALIASES = {"数学": "math", "语文": "chinese", "英语": "english"}


def calc_level(exp: int) -> int:
    level = 1
    need = 100
    while exp >= need:
        exp -= need
        level += 1
        need = int(need * 1.3 + 50)
    return level


def exp_to_next_level(level: int) -> int:
    need = 100
    for _ in range(level - 1):
        need = int(need * 1.3 + 50)
    return need


def add_growth_record(db: Session, user_id: int, exp=0, points=0, minutes=1, correct=0, total=1):
    today = TODAY()
    rec = db.query(GrowthRecord).filter(
        GrowthRecord.user_id == user_id, GrowthRecord.record_date == today
    ).first()
    if rec:
        rec.exp_gained += exp
        rec.points_gained += points
        rec.study_minutes += minutes
        rec.correct_count += correct
        rec.total_count += total
    else:
        rec = GrowthRecord(user_id=user_id, record_date=today, exp_gained=exp,
                           points_gained=points, study_minutes=minutes,
                           correct_count=correct, total_count=total)
        db.add(rec)


def check_achievements(db: Session, user_id: int):
    profile = db.query(ChildProfile).filter(ChildProfile.user_id == user_id).first()
    if not profile:
        return
    records = db.query(LearningRecord).filter(LearningRecord.user_id == user_id).all()
    correct_total = sum(1 for r in records if r.is_correct)
    wrong_count = db.query(WrongQuestion).filter(WrongQuestion.user_id == user_id, WrongQuestion.is_mastered == False).count()
    mastered_count = db.query(WrongQuestion).filter(WrongQuestion.user_id == user_id, WrongQuestion.is_mastered == True).count()
    checkins = db.query(CheckIn).filter(CheckIn.user_id == user_id).count()
    evals = db.query(Evaluation).filter(
        (Evaluation.evaluator_id == user_id) | (Evaluation.target_id == user_id)
    ).count()

    unlocked_ids = {a.achievement_id for a in db.query(UserAchievement).filter(UserAchievement.user_id == user_id).all()}
    all_ach = db.query(Achievement).all()
    newly = []
    for ach in all_ach:
        if ach.id in unlocked_ids:
            continue
        val = ach.condition_value
        ok = False
        if ach.condition_type == "first_practice" and len(records) >= val:
            ok = True
        elif ach.condition_type == "streak_checkin" and profile.streak_days >= val:
            ok = True
        elif ach.condition_type == "correct_count" and correct_total >= val:
            ok = True
        elif ach.condition_type == "master_wrong" and mastered_count >= val:
            ok = True
        elif ach.condition_type == "total_minutes" and profile.study_minutes_total >= val:
            ok = True
        elif ach.condition_type == "evaluations" and evals >= val:
            ok = True
        elif ach.condition_type == "reach_level" and profile.level >= val:
            ok = True
        elif ach.condition_type == "checkin_count" and checkins >= val:
            ok = True
        elif ach.condition_type == "challenge_best":
            best = db.query(func.max(ChallengePlay.score)).filter(
                ChallengePlay.user_id == user_id
            ).scalar() or 0
            ok = best >= val
        if ok:
            db.add(UserAchievement(user_id=user_id, achievement_id=ach.id))
            profile.points += ach.points_reward
            newly.append(ach)
    db.flush()
    return newly


def seed_data():
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            db.add_all([
                User(id=1, username="demo_parent", role="parent"),
                User(id=2, username="demo_child", role="child"),
            ])
            db.commit()

        if db.query(Family).count() == 0:
            db.add(Family(id=1, name="童伴示范家庭"))
            db.commit()

        if db.query(FamilyMember).count() == 0:
            db.add_all([
                FamilyMember(family_id=1, user_id=1, relation="parent"),
                FamilyMember(family_id=1, user_id=2, relation="child"),
            ])
            db.commit()

        if db.query(ChildProfile).count() == 0:
            db.add(ChildProfile(user_id=2, grade=3, points=20, exp=0, level=1, streak_days=0))
            db.commit()

        if db.query(TimeLimit).count() == 0:
            db.add(TimeLimit(child_user_id=2, daily_limit_minutes=60, warning_minutes=45))
            db.commit()

        if db.query(Question).count() == 0:
            seed_questions = [
                ("math", 1, "8 + 7 = ?", "15", "把 7 分成 2 和 5，8+2=10，10+5=15", None),
                ("math", 1, "16 - 9 = ?", "7", "16-10=6，再加回 1，所以是 7", None),
                ("math", 1, "下面哪个数最大？", "18", "18 比 15 和 12 都大", json.dumps(["12","18","15"], ensure_ascii=False)),
                ("math", 1, "9 + 6 = ?", "15", "把 6 分成 1 和 5，9+1=10，10+5=15", None),
                ("math", 1, "20 - 12 = ?", "8", "20-10=10，再减 2 等于 8", None),
                ("math", 2, "24 + 18 = ?", "42", "24+18=24+20-2=42", None),
                ("math", 2, "50 - 27 = ?", "23", "50-27=50-30+3=23", None),
                ("math", 2, "一个正方形有几条边？", "4", "正方形有 4 条相等的边", json.dumps(["3","4","5"], ensure_ascii=False)),
                ("math", 3, "36 / 4 = ?", "9", "36 / 4 = 9，因为 9 x 4 = 36", None),
                ("math", 3, "12 x 7 = ?", "84", "12x7=12x(5+2)=60+24=84", None),
                ("math", 3, "长方形的面积公式是？", "长x宽", "长方形面积 = 长 x 宽", json.dumps(["长+宽","长x宽","长/宽"], ensure_ascii=False)),
                ("math", 3, "99 - 45 + 30 = ?", "84", "99-45=54，54+30=84", None),
                ("chinese", 1, '"日"字加一横，可以变成哪个常用字？', "目", '"日"字中间加一横，变成"目"字', None),
                ("chinese", 1, '"春眠不觉晓"的下一句是？', "处处闻啼鸟", "这首诗是孟浩然的《春晓》", None),
                ("chinese", 2, '"锄禾日当午"的作者是？', "李绅", "出自唐代诗人李绅的《悯农》", None),
                ("chinese", 2, '"床前明月光"出自哪首诗？', "静夜思", "是李白的《静夜思》", None),
                ("chinese", 3, '"一寸光阴一寸金"的下一句是？', "寸金难买寸光阴", "告诉我们要珍惜时间", None),
                ("chinese", 3, "四大名著中《西游记》的作者是？", "吴承恩", "明代小说家吴承恩", None),
                ("english", 1, '"苹果"的英文是什么？', "apple", "apple 表示苹果", None),
                ("english", 1, "Hello 表示什么意思？", "你好", "Hello 是常见的问候语", None),
                ("english", 2, '"猫"的英文是什么？', "cat", "cat 表示小猫", None),
                ("english", 2, "What color is the sun?", "yellow", "太阳是黄色的", None),
                ("english", 3, 'How do you say "再见" in English?', "Goodbye", "Goodbye / Bye 都可以", None),
                ("english", 3, '"Water" 是什么意思？', "水", "water 是水", None),
            ]
            for s, g, c, a, e, o in seed_questions:
                db.add(Question(subject=s, grade=g, content=c, answer=a, explanation=e, options=o))
            db.commit()

        if db.query(Achievement).count() == 0:
            seed_ach = [
                ("初次练习", "完成第一次学习练习", "star", "first_practice", 1, 20),
                ("每日签到", "连续签到 3 天", "calendar", "streak_checkin", 3, 30),
                ("坚持不懈", "连续签到 7 天", "fire", "streak_checkin", 7, 50),
                ("学霸养成", "累计答对 50 道题", "trophy", "correct_count", 50, 80),
                ("错题克星", "掌握 10 道错题", "target", "master_wrong", 10, 50),
                ("学习小达人", "累计学习 120 分钟", "clock", "total_minutes", 120, 60),
                ("亲子互动", "完成 5 次亲子互评", "heart", "evaluations", 5, 40),
                ("等级晋升", "升到 3 级", "rocket", "reach_level", 3, 100),
                ("速算小能手", "速算挑战得分达到 10", "bolt", "challenge_best", 10, 30),
                ("速算达人", "速算挑战得分达到 20", "medal", "challenge_best", 20, 60),
            ]
            for n, d, i, c, v, p in seed_ach:
                db.add(Achievement(name=n, description=d, icon=i, condition_type=c, condition_value=v, points_reward=p))
            db.commit()

        if db.query(DailyTask).count() == 0:
            seed_tasks = [
                (1, "math", "数学小能手", "完成 5 道数学练习题", 5, 10),
                (1, "chinese", "语文小达人", "完成 3 道语文练习题", 3, 8),
                (1, "english", "英语小新星", "完成 3 道英语练习题", 3, 8),
                (3, "math", "数学进阶", "完成 8 道数学题", 8, 15),
                (3, "chinese", "语文阅读", "完成 5 道语文题", 5, 12),
                (3, "english", "英语提升", "完成 5 道英语题", 5, 12),
            ]
            for g, s, t, d, tc, pr in seed_tasks:
                db.add(DailyTask(grade=g, subject=s, title=t, description=d, target_count=tc, points_reward=pr))
            db.commit()

    except Exception:
        db.rollback()
    finally:
        db.close()


def _check_schema():
    from sqlalchemy import inspect
    insp = inspect(engine)
    need_rebuild = False
    for table_name, table in Base.metadata.tables.items():
        if insp.has_table(table_name):
            db_cols = {c["name"] for c in insp.get_columns(table_name)}
            model_cols = {c.name for c in table.columns}
            if not model_cols.issubset(db_cols):
                print(f"[schema] {table_name}: missing cols {model_cols - db_cols} -> rebuild needed")
                need_rebuild = True
        else:
            pass
    return need_rebuild


@app.on_event("startup")
def startup():
    if _check_schema():
        print("[schema] Dropping old tables and rebuilding...")
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_data()


@app.get("/api/health")
def health():
    return {"ok": True, "service": "tongban-api", "time": datetime.now().isoformat()}


@app.get("/api/dashboard")
def dashboard(user_id: int = Query(default=2), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "用户不存在")
    today = TODAY()
    today_records = db.query(LearningRecord).filter(
        LearningRecord.user_id == user_id,
        func.date(LearningRecord.created_at) == today
    ).all()
    profile = db.query(ChildProfile).filter(ChildProfile.user_id == user_id).first()
    checkin_today = db.query(CheckIn).filter(
        CheckIn.user_id == user_id, CheckIn.checkin_date == today
    ).first()
    exp_next = exp_to_next_level(profile.level if profile else 1)
    return {
        "user_id": user_id,
        "role": user.role,
        "study_minutes": sum(r.minutes for r in today_records),
        "points": profile.points if profile else 0,
        "exp": profile.exp if profile else 0,
        "exp_next": exp_next,
        "level": profile.level if profile else 1,
        "streak_days": profile.streak_days if profile else 0,
        "total_study_minutes": profile.study_minutes_total if profile else 0,
        "checkin_today": bool(checkin_today),
    }


@app.get("/api/questions")
def questions(subject: str = "math", grade: int = 1, db: Session = Depends(get_db)):
    subject = SUBJECT_ALIASES.get(subject, subject)
    if subject not in {"math", "chinese", "english"}:
        raise HTTPException(400, "不支持的学科 (math/chinese/english)")
    rows = db.query(Question).filter(Question.subject == subject, Question.grade == grade).all()
    return [{
        "id": q.id,
        "subject": q.subject,
        "subject_label": SUBJECT_MAP.get(q.subject, q.subject),
        "grade": q.grade,
        "content": q.content,
        "answer": q.answer,
        "explanation": q.explanation,
        "options": json.loads(q.options) if q.options else [],
    } for q in rows]


@app.post("/api/learning/submit")
def submit_learning(data: LearningSubmitRequest, db: Session = Depends(get_db)):
    question = db.get(Question, data.question_id)
    user = db.get(User, data.user_id)
    if not question or not user:
        raise HTTPException(404, "题目或用户不存在")
    is_correct = data.answer.strip().lower() == question.answer.strip().lower()
    minutes = max(1, data.time_spent // 60)
    record = LearningRecord(user_id=data.user_id, question_id=data.question_id,
                            answer=data.answer, is_correct=is_correct, minutes=minutes)
    db.add(record)
    profile = db.query(ChildProfile).filter(ChildProfile.user_id == data.user_id).first()
    points_added = exp_added = 0
    new_level = None
    level_up = False
    newly = []
    if profile:
        profile.study_minutes_total += minutes
        if is_correct:
            profile.points += 2
            profile.exp += 5
            points_added = 2
            exp_added = 5
            new_level = calc_level(profile.exp)
            if new_level != profile.level:
                profile.level = new_level
                level_up = True
                points_added += 20
                profile.points += 20
        else:
            wq = db.query(WrongQuestion).filter(
                WrongQuestion.user_id == data.user_id, WrongQuestion.question_id == question.id
            ).first()
            if wq:
                wq.wrong_count += 1
                wq.is_mastered = False
            else:
                db.add(WrongQuestion(user_id=data.user_id, question_id=question.id,
                                     wrong_answer=data.answer, wrong_count=1))
        add_growth_record(db, data.user_id, exp=exp_added, points=points_added,
                          minutes=minutes, correct=1 if is_correct else 0, total=1)
        newly = check_achievements(db, data.user_id) or []
    db.commit()
    return {
        "is_correct": is_correct,
        "answer": question.answer,
        "explanation": question.explanation,
        "points_added": points_added,
        "exp_added": exp_added,
        "level": profile.level if profile else 1,
        "level_up": level_up,
        "new_achievements": [
            {"id": a.id, "name": a.name, "icon": a.icon, "points_reward": a.points_reward}
            for a in newly
        ],
    }


@app.get("/api/tasks/daily")
def daily_tasks(
    grade: int = Query(default=1),
    user_id: int = Query(default=2),
    db: Session = Depends(get_db),
):
    today = TODAY()
    rows = db.query(DailyTask).filter(DailyTask.grade <= grade).order_by(DailyTask.grade).all()
    picked = {}
    for t in rows:
        if t.subject not in picked or t.grade > picked[t.subject].grade:
            picked[t.subject] = t
    tasks = list(picked.values())
    for t in tasks:
        prog = db.query(UserTaskProgress).filter(
            UserTaskProgress.task_id == t.id,
            UserTaskProgress.user_id == user_id,
            UserTaskProgress.task_date == today,
        ).first()
        if not prog:
            db.add(UserTaskProgress(task_id=t.id, user_id=user_id, task_date=today,
                                    completed_count=0, is_completed=False))
    db.commit()
    result = []
    for t in tasks:
        prog = db.query(UserTaskProgress).filter(
            UserTaskProgress.task_id == t.id,
            UserTaskProgress.user_id == user_id,
            UserTaskProgress.task_date == today,
        ).first()
        result.append({
            "id": t.id,
            "subject": t.subject,
            "subject_label": SUBJECT_MAP.get(t.subject, t.subject),
            "title": t.title,
            "description": t.description,
            "target_count": t.target_count,
            "points_reward": t.points_reward,
            "completed_count": prog.completed_count if prog else 0,
            "is_completed": prog.is_completed if prog else False,
        })
    return result


@app.post("/api/tasks/complete")
def complete_task(data: TaskCompleteRequest, db: Session = Depends(get_db)):
    today = TODAY()
    task = db.get(DailyTask, data.task_id)
    if not task:
        raise HTTPException(404, "任务不存在")
    prog = db.query(UserTaskProgress).filter(
        UserTaskProgress.task_id == data.task_id,
        UserTaskProgress.user_id == data.user_id,
        UserTaskProgress.task_date == today,
    ).first()
    if not prog:
        prog = UserTaskProgress(task_id=data.task_id, user_id=data.user_id,
                                task_date=today, completed_count=0)
        db.add(prog)
    prog.completed_count += data.count
    reward = 0
    if prog.completed_count >= task.target_count and not prog.is_completed:
        prog.is_completed = True
        reward = task.points_reward
        profile = db.query(ChildProfile).filter(ChildProfile.user_id == data.user_id).first()
        if profile:
            profile.points += reward
            profile.exp += 10
        newly = check_achievements(db, data.user_id) or []
    db.commit()
    return {"completed": prog.completed_count >= task.target_count,
            "count": prog.completed_count, "reward": reward}


@app.post("/api/checkin")
def do_checkin(data: CheckInRequest, db: Session = Depends(get_db)):
    user = db.get(User, data.user_id)
    if not user:
        raise HTTPException(404, "用户不存在")
    profile = db.query(ChildProfile).filter(ChildProfile.user_id == data.user_id).first()
    if not profile:
        raise HTTPException(404, "用户档案不存在 (需要 child 角色)")
    today = TODAY()
    existing = db.query(CheckIn).filter(
        CheckIn.user_id == data.user_id, CheckIn.checkin_date == today
    ).first()
    if existing:
        return {
            "ok": True,
            "already": True,
            "message": "今天已经签过到啦，明天见！",
            "streak_days": profile.streak_days,
            "points_earned": 0,
            "new_achievements": [],
        }
    yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    prev = db.query(CheckIn).filter(CheckIn.user_id == data.user_id, CheckIn.checkin_date == yesterday).first()
    profile.streak_days = (profile.streak_days + 1) if prev else 1
    points_earned = 5 + min(profile.streak_days, 7)
    db.add(CheckIn(user_id=data.user_id, checkin_date=today, points_earned=points_earned))
    profile.points += points_earned
    profile.last_checkin_date = today
    add_growth_record(db, data.user_id, points=points_earned)
    newly = check_achievements(db, data.user_id) or []
    db.commit()
    return {
        "ok": True,
        "already": False,
        "message": f"签到成功！连续 {profile.streak_days} 天，积分 +{points_earned}",
        "streak_days": profile.streak_days,
        "points_earned": points_earned,
        "new_achievements": [
            {"id": a.id, "name": a.name, "icon": a.icon, "points_reward": a.points_reward}
            for a in newly
        ],
    }


@app.get("/api/checkin/streak")
def get_streak(user_id: int, db: Session = Depends(get_db)):
    today = TODAY()
    profile = db.query(ChildProfile).filter(ChildProfile.user_id == user_id).first()
    if not profile:
        return {"streak_days": 0, "last_checkin_date": None, "checkin_today": False}
    checkin_today = db.query(CheckIn).filter(
        CheckIn.user_id == user_id, CheckIn.checkin_date == today
    ).first()
    return {"streak_days": profile.streak_days, "last_checkin_date": profile.last_checkin_date,
            "checkin_today": bool(checkin_today)}


@app.get("/api/wrong-book")
def wrong_book(user_id: int = Query(default=2), db: Session = Depends(get_db)):
    rows = db.query(WrongQuestion).filter(WrongQuestion.user_id == user_id).all()
    result = []
    for w in rows:
        q = db.get(Question, w.question_id)
        content = q.content if q else "未知题目"
        subject = q.subject if q else "unknown"
        correct_answer = q.answer if q else ""
        result.append({
            "id": w.id,
            "question_id": w.question_id,
            "content": content,
            "question_text": content,
            "subject": subject,
            "subject_label": SUBJECT_MAP.get(subject, subject),
            "grade": q.grade if q else 0,
            "wrong_answer": w.wrong_answer,
            "user_answer": w.wrong_answer,
            "answer": correct_answer,
            "correct_answer": correct_answer,
            "wrong_count": w.wrong_count,
            "is_mastered": w.is_mastered,
            "created_at": w.created_at.strftime("%Y-%m-%d"),
        })
    return result


@app.post("/api/wrong-book/retry/{wrong_id}")
def retry_wrong(wrong_id: int, data: WrongRetryRequest, db: Session = Depends(get_db)):
    w = db.get(WrongQuestion, wrong_id)
    if not w:
        raise HTTPException(404, "错题不存在")
    q = db.get(Question, w.question_id)
    if not q:
        raise HTTPException(404, "题目不存在")

    is_correct = data.answer.strip().lower() == q.answer.strip().lower()
    profile = db.query(ChildProfile).filter(ChildProfile.user_id == w.user_id).first()
    if is_correct:
        w.is_mastered = True
        w.last_reviewed_at = datetime.now()
        if profile:
            profile.points += 3
            profile.exp += 6
            profile.level = calc_level(profile.exp)
    else:
        w.wrong_count += 1
        w.is_mastered = False

    db.add(LearningRecord(user_id=w.user_id, question_id=q.id, answer=data.answer,
                          is_correct=is_correct, minutes=1))
    if profile:
        profile.study_minutes_total += 1
    add_growth_record(db, w.user_id, exp=6 if is_correct else 0, points=3 if is_correct else 0,
                      minutes=1, correct=1 if is_correct else 0, total=1)
    newly = check_achievements(db, w.user_id) or []
    db.commit()
    return {
        "is_correct": is_correct,
        "answer": q.answer,
        "explanation": q.explanation,
        "is_mastered": w.is_mastered,
        "new_achievements": [
            {"id": a.id, "name": a.name, "icon": a.icon, "points_reward": a.points_reward}
            for a in newly
        ],
    }


@app.post("/api/wrong-book/master/{wrong_id}")
def mark_mastered(wrong_id: int, db: Session = Depends(get_db)):
    w = db.get(WrongQuestion, wrong_id)
    if not w:
        raise HTTPException(404, "错题不存在")
    w.is_mastered = True
    w.last_reviewed_at = datetime.now()
    newly = check_achievements(db, w.user_id) or []
    db.commit()
    return {"ok": True}


@app.delete("/api/wrong-book/{wrong_id}")
def remove_wrong(wrong_id: int, db: Session = Depends(get_db)):
    w = db.get(WrongQuestion, wrong_id)
    if not w:
        raise HTTPException(404, "错题不存在")
    db.delete(w)
    db.commit()
    return {"ok": True}


def ai_reply(message: str, grade: int) -> tuple[str, bool]:
    msg = message.strip()
    system_prompt = (
        f"你是「童伴」APP 里的 AI 小老师，正在给 {grade} 年级的小朋友上课。"
        "请用孩子能听懂的、活泼亲切的语气回答问题。"
        "讲数学题要一步步拆解思路，鼓励小朋友思考。"
        "回答控制在 200 字以内，结尾可以加一句鼓励的话。"
    )
    result = call_qwen([
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": msg},
    ])
    if result:
        return result, False

    try:
        if "+" in msg or "-" in msg or "*" in msg or "/" in msg:
            tokens = re.split(r'[+\-*/=等于]', msg)
            nums = [float(t) for t in tokens if t.strip() and any(c.isdigit() for c in t)]
            op = next((ch for ch in "+-*/" if ch in msg), None)
            if len(nums) >= 2 and op:
                a, b = nums[0], nums[1]
                ans = {"+": a + b, "-": a - b, "*": a * b}.get(op, a / b if b != 0 else None)
                if ans is not None:
                    if ans == int(ans): ans = int(ans)
                    return f"好问题！{a} {op} {b} = {ans}。讲解：{grade}年级的小朋友可以这样想——先算 {a} {op} {b}，答案是 {ans}。要不要再练一道类似的？", True
    except Exception:
        pass
    greet = ["你好！我是你的 AI 小老师。有什么不懂的尽管问我呀～",
             "好的好的！让我想想怎么给你讲清楚。",
             "嘿嘿，这个问题我来帮你！"]
    sub_hint = ""
    if any(k in msg for k in ("数", "计算", "加", "减", "乘", "除")):
        sub_hint = "\n提示：你可以直接告诉我算式，比如 23+45等于几，我来帮你算～"
    elif any(k in msg for k in ("字", "词", "诗", "成语")):
        sub_hint = "\n提示：这是语文问题，你可以说说具体是哪个字或哪首诗？"
    elif any(k in msg for k in ("英文", "英语", "单词")):
        sub_hint = "\n提示：你可以告诉我想查哪个单词，我来帮你翻译～"
    return random.choice(greet) + sub_hint + f"\n\n(当前讲解难度：{grade}年级)", True


@app.post("/api/ai/chat")
def ai_chat(data: AiChatRequest, db: Session = Depends(get_db)):
    user = db.get(User, data.user_id)
    if not user:
        raise HTTPException(404, "用户不存在")
    text = data.message or data.question
    reply, demo = ai_reply(text, data.grade)
    db.add(AiChat(user_id=data.user_id, question=text, answer=reply))
    db.commit()
    return {"answer": reply, "demo": demo, "ai_enabled": bool(DASHSCOPE_API_KEY)}


@app.post("/api/practice/generate")
def generate_practice(data: PracticeGenerateRequest, db: Session = Depends(get_db)):
    subject = SUBJECT_ALIASES.get(data.subject, data.subject)
    if subject not in ("math", "chinese", "english"):
        subject = "math"
    grade = data.grade
    count = min(data.count, 10)
    subject_label = SUBJECT_MAP.get(subject, subject)

    ai_json = call_qwen([{
        "role": "system", "content": (
            f"你是一位{grade}年级{subject_label}老师。"
            f"请生成 {count} 道{subject_label}练习题，适合{grade}年级学生。"
            "只返回严格的 JSON 数组，不要任何解释文字或 markdown 代码块。"
            f'格式：[{{"content": "题目内容", "answer": "正确答案", "explanation": "解题思路", "options": ["A", "B", "C", "D"]}}]'
            "options 数组放 4 个选项（如果是选择题），填空题或计算题 options 设为 []。"
        ),
        "role": "user", "content": f"请出 {count} 道 {grade} 年级 {subject_label} 练习题。"
    }], temperature=0.8)

    ai_questions = []
    if ai_json:
        try:
            cleaned = ai_json.strip()
            if cleaned.startswith("```"):
                cleaned = re.sub(r'^```[a-z]*\n|\n```$', '', cleaned, flags=re.MULTILINE)
            start = cleaned.find('[')
            end = cleaned.rfind(']') + 1
            if start >= 0 and end > start:
                parsed = json.loads(cleaned[start:end])
                for item in parsed[:count]:
                    opt = item.get("options") or []
                    if opt and isinstance(opt, list):
                        pass
                    else:
                        opt = []
                    ai_questions.append({
                        "content": str(item.get("content", "")).strip(),
                        "answer": str(item.get("answer", "")).strip(),
                        "explanation": str(item.get("explanation", "")).strip(),
                        "options": opt,
                        "grade": grade,
                    })
        except Exception:
            ai_questions = []

    if ai_questions:
        created = []
        for item in ai_questions:
            row = Question(
                subject=subject,
                grade=grade,
                content=item["content"],
                answer=item["answer"],
                explanation=item["explanation"],
                options=json.dumps(item["options"], ensure_ascii=False) if item["options"] else None,
            )
            db.add(row)
            db.flush()
            created.append({
                "id": row.id,
                "subject": subject,
                "subject_label": subject_label,
                "grade": grade,
                "content": row.content,
                "options": item["options"],
                "ai_generated": True,
            })
        db.commit()
        return {"questions": created, "demo": False}

    pool = db.query(Question).filter(Question.subject == subject, Question.grade <= grade).all()
    if len(pool) < count:
        pool = db.query(Question).filter(Question.subject == subject).all()
    if not pool:
        return {"questions": [], "demo": True}
    picks = random.sample(pool, min(count, len(pool)))
    return {"questions": [{
        "id": q.id, "subject": q.subject,
        "subject_label": SUBJECT_MAP.get(q.subject, q.subject),
        "grade": q.grade, "content": q.content,
        "options": json.loads(q.options) if q.options else [],
        "ai_generated": False,
    } for q in picks], "demo": True}


@app.get("/api/parent/dashboard")
def parent_dashboard(family_id: int = Query(default=1), child_id: int = Query(default=None), db: Session = Depends(get_db)):
    if child_id:
        children_list = [db.get(User, child_id)]
    else:
        members = db.query(FamilyMember).filter(FamilyMember.family_id == family_id, FamilyMember.relation == "child").all()
        children_list = [db.get(User, m.user_id) for m in members]
        if not children_list:
            children_list = [db.get(User, 2)]
    today = TODAY()
    week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    children_out = []
    total_today_minutes = 0
    total_today_count = 0
    total_today_correct = 0
    total_week_minutes = 0
    for child in children_list:
        if not child:
            continue
        profile = db.query(ChildProfile).filter(ChildProfile.user_id == child.id).first()
        today_records = db.query(LearningRecord).filter(
            LearningRecord.user_id == child.id,
            func.date(LearningRecord.created_at) == today
        ).all()
        week_records = db.query(LearningRecord).filter(
            LearningRecord.user_id == child.id,
            func.date(LearningRecord.created_at) >= week_ago
        ).all()
        child_week_correct = sum(1 for r in week_records if r.is_correct)
        child_week_total = len(week_records)
        child_accuracy_week = round(child_week_correct / child_week_total * 100, 1) if child_week_total else 0
        child_wrong_count = db.query(WrongQuestion).filter(
            WrongQuestion.user_id == child.id, WrongQuestion.is_mastered == False
        ).count()
        c_today_min = sum(r.minutes for r in today_records)
        c_today_cnt = len(today_records)
        c_today_correct = sum(1 for r in today_records if r.is_correct)
        c_week_min = sum(r.minutes for r in week_records)
        total_today_minutes += c_today_min
        total_today_count += c_today_cnt
        total_today_correct += c_today_correct
        total_week_minutes += c_week_min
        children_out.append({
            "user_id": child.id,
            "username": child.username,
            "grade": profile.grade if profile else 1,
            "level": profile.level if profile else 1,
            "points": profile.points if profile else 0,
            "streak_days": profile.streak_days if profile else 0,
            "today_minutes": c_today_min,
            "today_correct": c_today_correct,
            "today_total": c_today_cnt,
            "accuracy_week": child_accuracy_week,
            "wrong_count": child_wrong_count,
            "week_minutes": c_week_min,
            "week_count": child_week_total,
        })
    goals = db.query(ParentGoal).filter(ParentGoal.is_completed == False).all()
    tl = db.query(TimeLimit).all()
    checkins = db.query(CheckIn).order_by(CheckIn.checkin_date.desc()).limit(7).all()
    return {
        "children": children_out,
        "today_study_minutes": total_today_minutes,
        "today_count": total_today_count,
        "today_correct": total_today_correct,
        "week_minutes": total_week_minutes,
        "week_count": sum(c["week_count"] for c in children_out),
        "total_study_minutes": sum(
            (db.query(ChildProfile).filter(ChildProfile.user_id == c["user_id"]).first().study_minutes_total if db.query(ChildProfile).filter(ChildProfile.user_id == c["user_id"]).first() else 0)
            for c in children_out
        ),
        "active_goals": [{
            "id": g.id, "title": g.title, "description": g.description,
            "target_minutes": g.target_minutes, "target_date": g.target_date,
            "is_completed": g.is_completed,
        } for g in goals],
        "time_limits": [{
            "user_id": t.child_user_id,
            "child_user_id": t.child_user_id,
            "daily_limit_minutes": t.daily_limit_minutes,
            "warning_minutes": t.warning_minutes,
        } for t in tl] or [{
            "user_id": children_out[0]["user_id"] if children_out else 2,
            "child_user_id": children_out[0]["user_id"] if children_out else 2,
            "daily_limit_minutes": 60,
            "warning_minutes": 45,
        }],
        "recent_checkins": [c.checkin_date for c in checkins],
    }


@app.post("/api/time-limit")
def set_time_limit(data: TimeLimitRequest, db: Session = Depends(get_db)):
    tl = db.query(TimeLimit).filter(TimeLimit.child_user_id == data.child_user_id).first()
    if not tl:
        tl = TimeLimit(child_user_id=data.child_user_id)
        db.add(tl)
    tl.daily_limit_minutes = data.daily_limit_minutes
    tl.warning_minutes = data.warning_minutes
    db.commit()
    return {"ok": True, "daily_limit_minutes": tl.daily_limit_minutes,
            "warning_minutes": tl.warning_minutes}


@app.get("/api/time-limit")
def get_time_limit(child_user_id: int = Query(default=2), db: Session = Depends(get_db)):
    tl = db.query(TimeLimit).filter(TimeLimit.child_user_id == child_user_id).first()
    if not tl:
        return {"child_user_id": child_user_id, "daily_limit_minutes": 60, "warning_minutes": 45}
    return {
        "child_user_id": tl.child_user_id,
        "daily_limit_minutes": tl.daily_limit_minutes,
        "warning_minutes": tl.warning_minutes,
    }


@app.post("/api/goals")
def create_goal(data: GoalCreateRequest, db: Session = Depends(get_db)):
    goal = ParentGoal(
        family_id=data.family_id, child_user_id=data.child_user_id, parent_user_id=data.parent_user_id,
        title=data.title, description="",
        target_minutes=data.target_minutes, target_date=data.target_date or (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
    )
    db.add(goal)
    db.commit()
    return {"id": goal.id, "ok": True, "message": "目标已设置"}


@app.get("/api/goals")
def list_goals(child_id: int = Query(default=2), db: Session = Depends(get_db)):
    rows = db.query(ParentGoal).filter(ParentGoal.child_user_id == child_id).all()
    return [{
        "id": g.id, "title": g.title, "description": g.description,
        "target_minutes": g.target_minutes, "target_date": g.target_date,
        "is_completed": g.is_completed, "created_at": g.created_at.strftime("%Y-%m-%d %H:%M"),
    } for g in rows]


@app.post("/api/goals/{goal_id}/complete")
def complete_goal(goal_id: int, db: Session = Depends(get_db)):
    g = db.get(ParentGoal, goal_id)
    if not g:
        raise HTTPException(404, "目标不存在")
    g.is_completed = True
    db.commit()
    return {"ok": True}


@app.get("/api/reports/weekly")
def weekly_report(child_id: int = Query(default=2), db: Session = Depends(get_db)):
    week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    records = db.query(LearningRecord).filter(
        LearningRecord.user_id == child_id,
        func.date(LearningRecord.created_at) >= week_ago,
    ).all()
    growth = db.query(GrowthRecord).filter(
        GrowthRecord.user_id == child_id, GrowthRecord.record_date >= week_ago,
    ).all()
    checkins = db.query(CheckIn).filter(
        CheckIn.user_id == child_id, CheckIn.checkin_date >= week_ago,
    ).count()
    evaluations = db.query(Evaluation).filter(
        func.date(Evaluation.created_at) >= week_ago,
        ((Evaluation.evaluator_id == child_id) | (Evaluation.target_id == child_id)),
    ).count()
    dates = {g.record_date for g in growth}
    total_records = len(records)
    total_minutes = sum(r.minutes for r in records)
    correct_count = sum(1 for r in records if r.is_correct)
    return {
        "study_days": len(dates),
        "total_records": total_records,
        "total_minutes": total_minutes,
        "completed_count": correct_count,
        "accuracy": round(correct_count / total_records * 100, 1) if total_records else 0,
        "exp_gain": sum(g.exp_gained for g in growth),
        "points_gain": sum(g.points_gained for g in growth),
        "checkin_count": checkins,
        "evaluation_count": evaluations,
    }


@app.get("/api/reports/monthly")
def monthly_report(child_id: int = Query(default=2), db: Session = Depends(get_db)):
    month_ago = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    records = db.query(LearningRecord).filter(
        LearningRecord.user_id == child_id,
        func.date(LearningRecord.created_at) >= month_ago,
    ).all()
    checkins = db.query(CheckIn).filter(
        CheckIn.user_id == child_id, CheckIn.checkin_date >= month_ago,
    ).count()
    evaluations = db.query(Evaluation).filter(
        func.date(Evaluation.created_at) >= month_ago,
        ((Evaluation.evaluator_id == child_id) | (Evaluation.target_id == child_id)),
    ).count()
    profile = db.query(ChildProfile).filter(ChildProfile.user_id == child_id).first()
    total_count = len(records)
    correct_count = sum(1 for r in records if r.is_correct)
    return {
        "total_minutes": sum(r.minutes for r in records),
        "total_count": total_count,
        "correct_count": correct_count,
        "accuracy": round(correct_count / total_count * 100, 1) if total_count else 0,
        "evaluation_count": evaluations,
        "checkin_count": checkins,
        "streak_days": profile.streak_days if profile else 0,
        "children": [{
            "user_id": child_id,
            "level": profile.level if profile else 1,
            "points": profile.points if profile else 0,
            "total_study_minutes": profile.study_minutes_total if profile else 0,
        }],
    }


@app.post("/api/evaluations")
def create_evaluation(data: EvaluationCreateRequest, db: Session = Depends(get_db)):
    family = db.get(Family, data.family_id)
    if not family:
        raise HTTPException(404, "家庭不存在")
    pid = 1
    cid = 2
    if data.direction == "parent_to_child":
        evaluator_id, target_id = pid, cid
    elif data.direction == "child_to_parent":
        evaluator_id, target_id = cid, pid
    else:
        evaluator_id, target_id = pid, cid
    ev = Evaluation(family_id=data.family_id, evaluator_id=evaluator_id, target_id=target_id,
                    direction=data.direction, item=data.item, score=data.score, comment=data.comment)
    db.add(ev)
    check_achievements(db, cid)
    db.commit()
    return {"id": ev.id, "ok": True}


@app.get("/api/evaluations/list")
def list_evaluations(family_id: int = 1, db: Session = Depends(get_db)):
    rows = db.query(Evaluation).filter(Evaluation.family_id == family_id).order_by(Evaluation.created_at.desc()).limit(50).all()
    direction_map = {"parent_to_child": "家长给孩子", "child_to_parent": "孩子给家长"}
    result = []
    for r in rows:
        evaluator = db.get(User, r.evaluator_id)
        target = db.get(User, r.target_id)
        result.append({
            "id": r.id, "direction": r.direction,
            "direction_label": direction_map.get(r.direction, r.direction),
            "evaluator_name": evaluator.username if evaluator else "未知",
            "target_name": target.username if target else "未知",
            "item": r.item, "score": r.score, "comment": r.comment,
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M"),
        })
    return result


@app.get("/api/parent/evaluations")
def parent_view_evaluations(family_id: int = 1, db: Session = Depends(get_db)):
    rows = db.query(Evaluation).filter(Evaluation.family_id == family_id).order_by(Evaluation.created_at.desc()).limit(50).all()
    direction_map = {"parent_to_child": "家长对孩子", "child_to_parent": "孩子对家长"}
    return [{
        "id": r.id, "direction_label": direction_map.get(r.direction, r.direction),
        "item": r.item, "score": r.score, "comment": r.comment,
        "created_at": r.created_at.strftime("%Y-%m-%d %H:%M"),
    } for r in rows]


@app.get("/api/family/harmony")
def family_harmony(family_id: int = 1, db: Session = Depends(get_db)):
    rows = db.query(Evaluation).filter(Evaluation.family_id == family_id).all()
    if not rows:
        return {"harmony_score": 0, "avg_scores": {}, "count": 0}
    parent_to_child = [r.score for r in rows if r.direction == "parent_to_child"]
    child_to_parent = [r.score for r in rows if r.direction == "child_to_parent"]
    avg_p2c = sum(parent_to_child) / len(parent_to_child) if parent_to_child else 0
    avg_c2p = sum(child_to_parent) / len(child_to_parent) if child_to_parent else 0
    harmony = round((avg_p2c + avg_c2p) / 2 * 20, 1)
    return {
        "harmony_score": harmony,
        "avg_scores": {"parent_to_child": round(avg_p2c, 2), "child_to_parent": round(avg_c2p, 2)},
        "count": len(rows),
    }


@app.get("/api/achievements")
def list_achievements(child_id: int = Query(default=2), db: Session = Depends(get_db)):
    unlocked_ids = {a.achievement_id for a in
                    db.query(UserAchievement).filter(UserAchievement.user_id == child_id).all()}
    all_ach = db.query(Achievement).all()
    return [{
        "id": a.id, "name": a.name, "description": a.description,
        "icon": a.icon, "condition_type": a.condition_type,
        "points_reward": a.points_reward, "unlocked": a.id in unlocked_ids,
        "unlocked_at": next((u.unlocked_at.strftime("%Y-%m-%d")
                              for u in db.query(UserAchievement).filter(
                                  UserAchievement.user_id == child_id,
                                  UserAchievement.achievement_id == a.id).all()), None),
    } for a in all_ach]


@app.get("/api/growth")
def user_growth(child_id: int = Query(default=2), db: Session = Depends(get_db)):
    profile = db.query(ChildProfile).filter(ChildProfile.user_id == child_id).first()
    if not profile:
        raise HTTPException(404, "孩子档案不存在")
    exp_next = exp_to_next_level(profile.level)
    newly = check_achievements(db, child_id) or []
    db.commit()
    return {
        "level": profile.level, "exp": profile.exp, "exp_next": exp_next,
        "progress_pct": round(profile.exp / exp_next * 100, 1),
        "points": profile.points, "streak_days": profile.streak_days,
        "total_minutes": profile.study_minutes_total,
        "grade": profile.grade,
    }


@app.get("/api/growth-curve")
def growth_curve(child_id: int = Query(default=2), days: int = Query(default=14), db: Session = Depends(get_db)):
    start = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    rows = db.query(GrowthRecord).filter(
        GrowthRecord.user_id == child_id, GrowthRecord.record_date >= start,
    ).order_by(GrowthRecord.record_date).all()
    result = []
    for i in range(days - 1, -1, -1):
        d = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        rec = next((r for r in rows if r.record_date == d), None)
        result.append({
            "date": d,
            "study_minutes": rec.study_minutes if rec else 0,
            "correct_count": rec.correct_count if rec else 0,
            "total_count": rec.total_count if rec else 0,
            "accuracy": round(rec.correct_count / rec.total_count * 100, 1) if rec and rec.total_count else 0,
        })
    return result


@app.get("/api/leaderboard")
def family_leaderboard(family_id: int = 1, db: Session = Depends(get_db)):
    members = db.query(FamilyMember).filter(FamilyMember.family_id == family_id).all()
    result = []
    for m in members:
        u = db.get(User, m.user_id)
        if not u: continue
        p = db.query(ChildProfile).filter(ChildProfile.user_id == u.id).first()
        result.append({
            "user_id": u.id, "username": u.username, "role": u.role,
            "level": p.level if p else 0, "exp": p.exp if p else 0,
            "points": p.points if p else 0,
            "total_minutes": p.study_minutes_total if p else 0,
        })
    result.sort(key=lambda x: (x["level"], x["exp"], x["points"]), reverse=True)
    for i, r in enumerate(result):
        r["rank"] = i + 1
    return result


@app.post("/api/challenge/submit")
def submit_challenge(data: ChallengeSubmitRequest, db: Session = Depends(get_db)):
    profile = db.query(ChildProfile).filter(ChildProfile.user_id == data.user_id).first()
    if not profile:
        raise HTTPException(404, "孩子档案不存在")

    best_before = db.query(func.max(ChallengePlay.score)).filter(
        ChallengePlay.user_id == data.user_id
    ).scalar() or 0
    db.add(ChallengePlay(
        user_id=data.user_id, score=data.score, correct=data.correct,
        total=data.total, seconds=data.seconds,
    ))
    is_new_best = data.score > best_before
    points = data.correct * 2 + (5 if is_new_best else 0)
    exp = data.correct * 3
    profile.points += points
    profile.exp += exp
    profile.level = calc_level(profile.exp)
    add_growth_record(
        db, data.user_id, exp=exp, points=points,
        minutes=max(1, round(data.seconds / 60)),
        correct=data.correct, total=data.total,
    )
    newly = check_achievements(db, data.user_id) or []
    db.commit()
    return {
        "best": max(best_before, data.score),
        "is_new_best": is_new_best,
        "points_earned": points,
        "exp_earned": exp,
        "new_achievements": [
            {"id": a.id, "name": a.name, "icon": a.icon, "points_reward": a.points_reward}
            for a in newly
        ],
    }


@app.get("/api/challenge/best")
def challenge_best(user_id: int = Query(default=2), db: Session = Depends(get_db)):
    rows = db.query(ChallengePlay).filter(
        ChallengePlay.user_id == user_id
    ).order_by(ChallengePlay.score.desc(), ChallengePlay.created_at.desc()).limit(8).all()
    best = db.query(func.max(ChallengePlay.score)).filter(
        ChallengePlay.user_id == user_id
    ).scalar() or 0
    total_plays = db.query(ChallengePlay).filter(ChallengePlay.user_id == user_id).count()
    return {
        "best": best,
        "total_plays": total_plays,
        "plays": [{
            "date": row.created_at.strftime("%Y-%m-%d"),
            "score": row.score,
            "correct": row.correct,
            "total": row.total,
        } for row in rows],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
