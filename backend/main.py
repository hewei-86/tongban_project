import json
import os
from datetime import datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import Base, engine, get_db, SessionLocal
from models import User, Family, FamilyMember, ChildProfile, Question, LearningRecord, Evaluation, AiChat
from schemas import LearningSubmit, AiChatRequest, EvaluationCreate

load_dotenv(verbose=True)
app = FastAPI(title="童伴成长 API", version="0.1.0", description="小学低年级 AI 学习与亲子成长助手")

origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if origins == ["*"] else origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def seed_data():
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            db.add_all([
                User(id=1, username="demo_parent", role="parent"),
                User(id=2, username="demo_child", role="child"),
            ])
            db.add(Family(id=1, name="童伴演示家庭"))
            db.flush()
            db.add_all([
                FamilyMember(family_id=1, user_id=1, relation="parent"),
                FamilyMember(family_id=1, user_id=2, relation="child"),
                ChildProfile(user_id=2, grade=1, points=20),
            ])
            db.add_all([
                Question(subject="math", grade=1, content="8 + 7 = ?", answer="15", explanation="把 7 分成 2 和 5。8+2=10，10+5=15。"),
                Question(subject="math", grade=1, content="16 - 9 = ?", answer="7", explanation="16-10=6，再加回 1，所以是 7。"),
                Question(subject="math", grade=1, content="下面哪个数最大？", answer="18", options=json.dumps(["12", "18", "15"], ensure_ascii=False), explanation="18 比 15 和 12 都大。"),
                Question(subject="chinese", grade=1, content="“日”字加一笔，可以变成哪个常见字？", answer="目", explanation="“日”字中间加一横，可以变成“目”。"),
                Question(subject="chinese", grade=1, content="“春眠不觉晓”的下一句是什么？", answer="处处闻啼鸟", explanation="这首诗是孟浩然的《春晓》。"),
                Question(subject="english", grade=1, content="“苹果”的英文是什么？", answer="apple", explanation="apple 表示苹果，可以跟读 a-pple。"),
                Question(subject="english", grade=1, content="Hello 表示什么意思？", answer="你好", explanation="Hello 是常见的问候语，意思是“你好”。"),
            ])
            db.commit()
    finally:
        db.close()

@app.on_event("startup")
def startup():
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
    today = datetime.now().date()
    records = db.query(LearningRecord).filter(
        LearningRecord.user_id == user_id,
        func.date(LearningRecord.created_at) == today
    ).all()
    profile = db.query(ChildProfile).filter(ChildProfile.user_id == user_id).first()
    return {
        "user_id": user_id,
        "role": user.role,
        "study_minutes": sum(x.minutes for x in records),
        "points": profile.points if profile else 0,
        "streak": 1 if records else 0,
    }

@app.get("/api/questions")
def questions(subject: str = "math", grade: int = 1, db: Session = Depends(get_db)):
    if subject not in {"math", "chinese", "english"}:
        raise HTTPException(400, "不支持的学科")
    rows = db.query(Question).filter(Question.subject == subject, Question.grade == grade).all()
    return [{
        "id": q.id,
        "subject": q.subject,
        "grade": q.grade,
        "content": q.content,
        "options": json.loads(q.options) if q.options else []
    } for q in rows]

@app.post("/api/learning/submit")
def submit_learning(data: LearningSubmit, db: Session = Depends(get_db)):
    question = db.get(Question, data.question_id)
    user = db.get(User, data.user_id)
    if not question or not user:
        raise HTTPException(404, "题目或用户不存在")
    is_correct = data.answer.strip().lower() == question.answer.strip().lower()
    record = LearningRecord(
        user_id=data.user_id,
        question_id=data.question_id,
        answer=data.answer,
        is_correct=is_correct,
        minutes=1
    )
    db.add(record)
    profile = db.query(ChildProfile).filter(ChildProfile.user_id == data.user_id).first()
    if is_correct and profile:
        profile.points += 2
    db.commit()
    return {
        "is_correct": is_correct,
        "explanation": ("回答正确！" if is_correct else f"正确答案是：{question.answer}。") + question.explanation,
        "points_added": 2 if is_correct else 0
    }

@app.post("/api/ai/chat")
def ai_chat(data: AiChatRequest, db: Session = Depends(get_db)):
    user = db.get(User, data.user_id)
    if not user:
        raise HTTPException(404, "用户不存在")
    api_key = os.getenv("DASHSCOPE_API_KEY", "").strip()
    answer = ""
    demo = False
    if api_key:
        try:
            from langchain_openai import ChatOpenAI
            model = ChatOpenAI(
                model=os.getenv("QWEN_MODEL", "qwen-plus"),
                api_key=os.getenv("DASHSCOPE_API_KEY"),
                base_url=os.getenv("DASHSCOPE_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1"),
                temperature=0.3,
            )
            system = (
                f"你是一位耐心、友善的小学{data.grade}年级学习辅导老师。"
                "用适合儿童理解的简短中文讲解，先鼓励，再分步骤解释。"
                "不要索取姓名、住址、学校、联系方式等个人信息。"
                "不确定时明确说明，不编造教材或考试标准答案。"
            )
            result = model.invoke([("system", system), ("human", data.question)])
            answer = str(result.content)
        except Exception:
            # 不把密钥、供应商内部错误暴露给儿童端
            raise HTTPException(502, "AI 老师暂时不可用，请稍后再试。")
    else:
        demo = True
        answer = (
            "我们一起来想一想吧！先把题目中的已知条件找出来，再一步一步思考。"
            "如果是数学题，可以试着画图、摆小棒或把数字拆开。"
            "当前还没有配置 Qwen API Key，所以这是演示回复，不是真实 AI 生成的答案。"
        )
    db.add(AiChat(user_id=data.user_id, question=data.question, answer=answer))
    db.commit()
    return {"answer": answer, "demo": demo}

@app.post("/api/evaluations")
def create_evaluation(data: EvaluationCreate, db: Session = Depends(get_db)):
    if data.evaluator_id == data.target_id:
        raise HTTPException(400, "不能评价自己")
    if not db.get(User, data.evaluator_id) or not db.get(User, data.target_id):
        raise HTTPException(404, "评价用户不存在")
    if data.direction not in {"parent_to_child", "child_to_parent"}:
        raise HTTPException(400, "评价方向不正确")
    row = Evaluation(**data.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "message": "评价已提交"}

@app.get("/api/reports/weekly")
def weekly_report(family_id: int = 1, db: Session = Depends(get_db)):
    since = datetime.now() - timedelta(days=7)
    member_ids = [m.user_id for m in db.query(FamilyMember).filter(FamilyMember.family_id == family_id).all()]
    if not member_ids:
        return {"total_records": 0, "total_minutes": 0, "completed_count": 0, "accuracy": 0, "evaluation_count": 0}
    records = db.query(LearningRecord).filter(
        LearningRecord.user_id.in_(member_ids),
        LearningRecord.created_at >= since
    ).all()
    completed = len(records)
    correct = sum(1 for r in records if r.is_correct)
    evaluations = db.query(Evaluation).filter(
        Evaluation.family_id == family_id,
        Evaluation.created_at >= since
    ).count()
    return {
        "total_records": completed,
        "total_minutes": sum(r.minutes for r in records),
        "completed_count": completed,
        "accuracy": round(correct / completed * 100) if completed else 0,
        "evaluation_count": evaluations
    }
