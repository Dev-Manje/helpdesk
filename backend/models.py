from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timedelta
from enum import Enum

class UserRole(str, Enum):
    CLIENT = "client"
    AGENT = "agent"
    MANAGER = "manager"
    ADMIN = "admin"

class AgentLevel(int, Enum):
    URGENT = 1      # Level 1 - Urgent/Critical issues
    MODERATE = 2    # Level 2 - Moderate issues
    MILD = 3        # Level 3 - Mild/General support

class TicketUrgency(int, Enum):
    URGENT = 1      # Critical - 2 hours SLA
    MODERATE = 2    # Moderate - 8 hours SLA
    MILD = 3        # Mild - 24 hours SLA

class TicketStatus(str, Enum):
    OPEN = "open"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    PENDING_CLIENT = "pending_client"
    ESCALATED = "escalated"
    RESOLVED = "resolved"
    CLOSED = "closed"

class NotificationType(str, Enum):
    TICKET_ASSIGNED = "ticket_assigned"
    TICKET_UPDATED = "ticket_updated"
    COMMENT_ADDED = "comment_added"
    TICKET_ESCALATED = "ticket_escalated"
    SLA_WARNING = "sla_warning"
    TICKET_RESOLVED = "ticket_resolved"

class Department(BaseModel):
    id: Optional[str] = Field(alias="_id")
    name: str
    description: str
    manager_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)

class User(BaseModel):
    id: Optional[str] = Field(alias="_id")
    name: str
    email: str
    role: UserRole
    department_id: Optional[str] = None
    agent_level: Optional[AgentLevel] = None
    skills: List[str] = []  # e.g., ["network", "hardware", "software"]
    categories: List[str] = []  # Categories this agent can handle
    is_available: bool = True
    max_concurrent_tickets: int = 10
    current_ticket_count: int = 0  # Track current workload for load balancing
    last_assigned_at: Optional[datetime] = None  # Track when last assigned for round robin
    created_at: datetime = Field(default_factory=datetime.now)
    last_active: Optional[datetime] = None

class UserInDB(BaseModel):
    id: str = Field(alias="_id")
    name: str
    email: str
    role: str
    department: Optional[str] = None
    hashed_password: str

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str
    department: Optional[str] = None

class Request(BaseModel):
    id: Optional[str] = Field(alias="_id")
    user_id: str
    title: str
    description: str
    category: str
    priority: str  # low, medium, high, urgent
    urgency_level: TicketUrgency = TicketUrgency.MILD
    status: TicketStatus = TicketStatus.OPEN
    assigned_agent: Optional[str] = None
    department_id: Optional[str] = None
    required_skills: List[str] = []  # Skills needed to resolve this ticket
    attachments: List[dict] = []
    sla_due_date: Optional[datetime] = None
    sla_breached: bool = False
    escalation_count: int = 0
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    escalated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None

class RequestCreate(BaseModel):
    title: str
    description: str
    category: str
    priority: str
    urgency_level: Optional[TicketUrgency] = TicketUrgency.MILD
    required_skills: List[str] = []

class Comment(BaseModel):
    id: Optional[str] = Field(alias="_id")
    ticket_id: str
    user_id: str
    content: str
    comment_type: str = "comment"  # comment, request, resolution, internal
    is_internal: bool = False  # Only visible to agents/managers
    attachments: List[dict] = []
    created_at: datetime = Field(default_factory=datetime.now)

class Notification(BaseModel):
    id: Optional[str] = Field(alias="_id")
    user_id: str
    ticket_id: Optional[str] = None
    type: NotificationType
    title: str
    message: str
    is_read: bool = False
    metadata: dict = {}
    created_at: datetime = Field(default_factory=datetime.now)

class Timeline(BaseModel):
    id: Optional[str] = Field(alias="_id")
    ticket_id: str
    user_id: str
    action_type: str  # created, assigned, commented, escalated, resolved, etc.
    description: str
    metadata: dict = {}  # Additional data like old/new values
    created_at: datetime = Field(default_factory=datetime.now)

class SLARule(BaseModel):
    id: Optional[str] = Field(alias="_id")
    urgency_level: TicketUrgency
    response_time_hours: int  # Time to first response
    resolution_time_hours: int  # Time to resolution
    escalation_time_hours: int  # Time before auto-escalation
    warning_time_hours: int  # Time before SLA warning

class Agent(BaseModel):
    id: Optional[str] = Field(alias="_id")
    user_id: str
    available: bool = True

class KnowledgeBase(BaseModel):
    id: Optional[str] = Field(alias="_id")
    title: str
    content: str  # Rich text content (HTML/Markdown)
    summary: str  # Short description for search
    category: str
    tags: List[str] = []
    attachments: List[dict] = []  # List of file attachments
    links: List[dict] = []  # List of hyperlinks
    author: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    views: int = 0
    helpful_votes: int = 0
    status: str = "published"  # draft, published, archived

class EscalationRule(BaseModel):
    id: Optional[str] = Field(alias="_id")
    priority: str
    time_threshold_hours: int
    escalate_to: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class ChatbotInteraction(BaseModel):
    id: Optional[str] = Field(alias="_id")
    user_id: str
    user_query: str
    kb_article_id: Optional[str] = None  # ID of the knowledge base article shown
    kb_article_title: Optional[str] = None  # Title of the article for reporting
    user_feedback: str  # 'helpful', 'not_helpful', 'ticket_created', 'try_again'
    resolved_by_chatbot: bool = False  # True if user marked as helpful
    ticket_created: bool = False  # True if user chose to create a ticket
    created_at: datetime = Field(default_factory=datetime.now)
    session_id: Optional[str] = None  # For grouping interactions in a conversation