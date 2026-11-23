from pydantic import BaseModel, Field


class CheckInRequest(BaseModel):
    user_id: int


class TaskCompleteRequest(BaseModel):
    task_id: int
    user_id: int
    count: int = 1


class LearningSubmitRequest(BaseModel):
    user_id: int
    question_id: int
    answer: str = Field(min_length=1, max_length=200)
    time_spent: int = 30


class AiChatRequest(BaseModel):
    user_id: int
    grade: int = Field(default=3, ge=1, le=6)
    message: str = Field(default="", max_length=500)
    question: str = Field(default="", max_length=500)


class WrongBookSubmitRequest(BaseModel):
    child_id: int
    question_text: str = Field(min_length=1, max_length=500)
    subject: str = "math"
    user_answer: str = ""
    correct_answer: str = ""


class GoalCreateRequest(BaseModel):
    family_id: int = 1
    child_user_id: int
    parent_user_id: int = 1
    title: str = Field(default="每日学习目标", min_length=1, max_length=200)
    target_minutes: int = Field(default=20, ge=5, le=180)
    target_date: str = ""


class TimeLimitRequest(BaseModel):
    child_user_id: int
    daily_limit_minutes: int = Field(default=60, ge=10, le=300)
    warning_minutes: int = Field(default=45, ge=5, le=200)


class PracticeGenerateRequest(BaseModel):
    user_id: int
    subject: str = "math"
    grade: int = Field(default=3, ge=1, le=6)
    count: int = Field(default=5, ge=1, le=20)
    # 本机数据模式下，前端需要答案来本地判题；后端模式可保持 False
    include_answer: bool = False


class WrongRetryRequest(BaseModel):
    answer: str = Field(min_length=1, max_length=200)


class ChallengeSubmitRequest(BaseModel):
    user_id: int = 2
    score: int = Field(default=0, ge=0, le=10000)
    correct: int = Field(default=0, ge=0, le=500)
    total: int = Field(default=0, ge=0, le=500)
    seconds: int = Field(default=60, ge=0, le=600)


class EvaluationCreateRequest(BaseModel):
    family_id: int = 1
    evaluator_id: int = 1
    target_id: int = 2
    direction: str
    item: str = Field(min_length=1, max_length=100)
    score: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=500)


class RegisterRequest(BaseModel):
    username: str = Field(min_length=4, max_length=20, pattern=r"^[A-Za-z0-9_]+$")
    password: str = Field(min_length=6, max_length=64)
    nickname: str = Field(default="", max_length=12)


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=64)


class StateUpdateRequest(BaseModel):
    base_version: int = Field(default=0, ge=0)
    data: dict


class RedeemRequest(BaseModel):
    code: str = Field(min_length=4, max_length=32)


class MembershipGrantRequest(BaseModel):
    days: int = Field(default=365, ge=1, le=3650)
    plan: str = Field(default="pro", max_length=20)


class RedeemCodeCreateRequest(BaseModel):
    count: int = Field(default=10, ge=1, le=100)
    days: int = Field(default=365, ge=1, le=3650)
    plan: str = Field(default="pro", max_length=20)
    batch: str = Field(default="", max_length=50)


class UserStatusRequest(BaseModel):
    active: bool
    reason: str = Field(default="", max_length=200)


class QuestionInput(BaseModel):
    subject: str = Field(default="math", max_length=20)
    grade: int = Field(default=1, ge=1, le=6)
    content: str = Field(min_length=1, max_length=500)
    answer: str = Field(min_length=1, max_length=100)
    explanation: str = Field(default="", max_length=1000)
    options: list[str] = Field(default_factory=list, max_length=6)


