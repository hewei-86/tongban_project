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


class EvaluationCreateRequest(BaseModel):
    family_id: int = 1
    evaluator_id: int = 1
    target_id: int = 2
    direction: str
    item: str = Field(min_length=1, max_length=100)
    score: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=500)
