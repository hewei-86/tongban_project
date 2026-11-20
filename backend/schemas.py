from pydantic import BaseModel, Field

class LearningSubmit(BaseModel):
    user_id: int
    question_id: int
    answer: str = Field(min_length=1, max_length=100)

class AiChatRequest(BaseModel):
    user_id: int
    grade: int = Field(ge=1, le=3)
    question: str = Field(min_length=1, max_length=1000)

class EvaluationCreate(BaseModel):
    family_id: int
    evaluator_id: int
    target_id: int
    direction: str
    item: str = Field(min_length=1, max_length=100)
    score: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=500)
