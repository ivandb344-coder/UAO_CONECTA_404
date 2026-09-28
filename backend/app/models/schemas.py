from pydantic import BaseModel, EmailStr
from typing import Optional, List

class Register(BaseModel):
    name: str
    username: str
    email: EmailStr
    password: str
    role: str = "student"
    program: str
    semester: Optional[int] = None

class Login(BaseModel):
    email: EmailStr
    password: str

class QuestionCreate(BaseModel):
    title: str
    description: str
    subject: str
    tags: List[str] = []
    anonymous: bool = False

class AnswerCreate(BaseModel):
    body: str

class BookingCreate(BaseModel):
    advisory_id: str
    note: str = ""

class BookingStatus(BaseModel):
    status: str  # Aceptada | Rechazada | Cancelada | Completada | No asistió

class AdvisoryCreate(BaseModel):
    subject: str
    topic: str
    date: str
    time: str
    mode: str = "Virtual"
    slots: int = 4
    place: str = ""
    link: str = ""
    active: bool = True

class AdvisoryPatch(BaseModel):
    subject: Optional[str] = None
    topic: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    mode: Optional[str] = None
    slots: Optional[int] = None
    place: Optional[str] = None
    link: Optional[str] = None
    active: Optional[bool] = None

class ChatMessage(BaseModel):
    body: str
    room: str = "general"

class AIQuestion(BaseModel):
    message: str
    history: List[dict] = []

class TaskCreate(BaseModel):
    title: str
    description: str
    due_date: str
    due_time: str = "23:59"
    materials: List[str] = []

class SubmissionCreate(BaseModel):
    text: str = ""
    link: str = ""
    file_id: str = ""

class FeedbackCreate(BaseModel):
    feedback: str
    grade: Optional[float] = None
    status: str = "Revisada"

class AnswerRatingCreate(BaseModel):
    rating: int
    comment: str = ""

class SubjectCreate(BaseModel):
    name: str
    code: str
    description: str = ""
    program: str
    semester: int
    schedule: str = ""
    additional_info: str = ""
    color: str = "teal"

class SubjectJoin(BaseModel):
    code: str

class GoogleAuth(BaseModel):
    session_id: str

class ProfilePatch(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    role: Optional[str] = None
    program: Optional[str] = None
    semester: Optional[int] = None
    bio: Optional[str] = None
    picture: Optional[str] = None
    phone: Optional[str] = None
    contact_info: Optional[str] = None
    academic_info: Optional[str] = None

class LinkCreate(BaseModel):
    platform: str
    url: str
    label: Optional[str] = None
    icon: Optional[str] = None
    visible: bool = True

class LinkPatch(BaseModel):
    platform: Optional[str] = None
    url: Optional[str] = None
    label: Optional[str] = None
    icon: Optional[str] = None
    visible: Optional[bool] = None

class AccessibilityPrefs(BaseModel):
    contrast: Optional[str] = None
    text_size: Optional[str] = None
    animations: Optional[bool] = None
    reduced_motion: Optional[bool] = None
    focus_visible: Optional[bool] = None
    large_controls: Optional[bool] = None

class ResourceCreate(BaseModel):
    title: str
    description: str = ""
    kind: str  # 'file' | 'link'
    url: Optional[str] = None
    storage_path: Optional[str] = None
    name: Optional[str] = None
    content_type: Optional[str] = None
    size: Optional[int] = None
