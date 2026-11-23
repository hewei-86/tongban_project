from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, Boolean, Date, UniqueConstraint, JSON
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    nickname: Mapped[str] = mapped_column(String(50), default="")
    password_hash: Mapped[str] = mapped_column(String(255), default="")
    role: Mapped[str] = mapped_column(String(20), default="child")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class UserState(Base):
    """每个账号的完整学习数据快照（MySQL JSON 列），用于多端同步。"""

    __tablename__ = "user_states"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    version: Mapped[int] = mapped_column(Integer, default=0)
    data: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)



class Family(Base):
    __tablename__ = "families"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), default="我的家庭")


class FamilyMember(Base):
    __tablename__ = "family_members"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    family_id: Mapped[int] = mapped_column(ForeignKey("families.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    relation: Mapped[str] = mapped_column(String(20))


class ChildProfile(Base):
    __tablename__ = "child_profiles"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    grade: Mapped[int] = mapped_column(Integer, default=1)
    points: Mapped[int] = mapped_column(Integer, default=0)
    exp: Mapped[int] = mapped_column(Integer, default=0)
    level: Mapped[int] = mapped_column(Integer, default=1)
    study_minutes_total: Mapped[int] = mapped_column(Integer, default=0)
    streak_days: Mapped[int] = mapped_column(Integer, default=0)
    last_checkin_date: Mapped[str | None] = mapped_column(String(20), nullable=True)


class Question(Base):
    __tablename__ = "questions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    subject: Mapped[str] = mapped_column(String(20), index=True)
    grade: Mapped[int] = mapped_column(Integer, default=1)
    content: Mapped[str] = mapped_column(String(500))
    answer: Mapped[str] = mapped_column(String(100))
    explanation: Mapped[str] = mapped_column(String(1000))
    options: Mapped[str | None] = mapped_column(String(500), nullable=True)


class LearningRecord(Base):
    __tablename__ = "learning_records"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id"))
    answer: Mapped[str] = mapped_column(String(100))
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    minutes: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class Evaluation(Base):
    __tablename__ = "evaluations"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    family_id: Mapped[int] = mapped_column(ForeignKey("families.id"))
    evaluator_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    target_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    direction: Mapped[str] = mapped_column(String(30))
    item: Mapped[str] = mapped_column(String(100))
    score: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class AiChat(Base):
    __tablename__ = "ai_chats"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    question: Mapped[str] = mapped_column(Text)
    answer: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class CheckIn(Base):
    __tablename__ = "checkins"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    checkin_date: Mapped[str] = mapped_column(String(20))
    points_earned: Mapped[int] = mapped_column(Integer, default=5)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    __table_args__ = (UniqueConstraint("user_id", "checkin_date", name="uq_checkin_user_date"),)


class DailyTask(Base):
    __tablename__ = "daily_tasks"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    grade: Mapped[int] = mapped_column(Integer, default=1)
    subject: Mapped[str] = mapped_column(String(20))
    title: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(String(300))
    target_count: Mapped[int] = mapped_column(Integer, default=5)
    points_reward: Mapped[int] = mapped_column(Integer, default=10)


class UserTaskProgress(Base):
    __tablename__ = "user_task_progress"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    task_id: Mapped[int] = mapped_column(ForeignKey("daily_tasks.id"))
    task_date: Mapped[str] = mapped_column(String(20))
    completed_count: Mapped[int] = mapped_column(Integer, default=0)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    points_awarded: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class WrongQuestion(Base):
    __tablename__ = "wrong_questions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id"))
    wrong_answer: Mapped[str] = mapped_column(String(100))
    wrong_count: Mapped[int] = mapped_column(Integer, default=1)
    is_mastered: Mapped[bool] = mapped_column(Boolean, default=False)
    last_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class Achievement(Base):
    __tablename__ = "achievements"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(String(500))
    icon: Mapped[str] = mapped_column(String(20))
    condition_type: Mapped[str] = mapped_column(String(50))
    condition_value: Mapped[int] = mapped_column(Integer, default=0)
    points_reward: Mapped[int] = mapped_column(Integer, default=20)


class UserAchievement(Base):
    __tablename__ = "user_achievements"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    achievement_id: Mapped[int] = mapped_column(ForeignKey("achievements.id"))
    unlocked_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class GrowthRecord(Base):
    __tablename__ = "growth_records"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    record_date: Mapped[str] = mapped_column(String(20))
    exp_gained: Mapped[int] = mapped_column(Integer, default=0)
    points_gained: Mapped[int] = mapped_column(Integer, default=0)
    study_minutes: Mapped[int] = mapped_column(Integer, default=0)
    correct_count: Mapped[int] = mapped_column(Integer, default=0)
    total_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class ParentGoal(Base):
    __tablename__ = "parent_goals"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    family_id: Mapped[int] = mapped_column(ForeignKey("families.id"))
    child_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    parent_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(String(500), default="")
    target_minutes: Mapped[int] = mapped_column(Integer, default=30)
    target_date: Mapped[str] = mapped_column(String(20))
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class TimeLimit(Base):
    __tablename__ = "time_limits"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    child_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    daily_limit_minutes: Mapped[int] = mapped_column(Integer, default=60)
    warning_minutes: Mapped[int] = mapped_column(Integer, default=45)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)


class ChallengePlay(Base):
    __tablename__ = "challenge_plays"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    score: Mapped[int] = mapped_column(Integer, default=0)
    correct: Mapped[int] = mapped_column(Integer, default=0)
    total: Mapped[int] = mapped_column(Integer, default=0)
    seconds: Mapped[int] = mapped_column(Integer, default=60)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
