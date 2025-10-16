from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
from models import TicketUrgency, SLARule

MONGO_URL = "mongodb://localhost:27017"

client = AsyncIOMotorClient(MONGO_URL)
database = client.helpdesk

# Enhanced database collections
users = database.users
departments = database.departments
requests = database.requests
comments = database.comments
notifications = database.notifications
timeline = database.timeline
sla_rules = database.sla_rules
knowledgebase = database.knowledgebase

# Backward compatibility
agents = database.agents

class DatabaseManager:
    """Enhanced database manager with SLA and notification support"""
    
    def __init__(self):
        self.db = database
    
    async def initialize_sla_rules(self):
        """Initialize default SLA rules"""
        existing_rules = await sla_rules.count_documents({})
        if existing_rules == 0:
            default_rules = [
                {
                    "urgency_level": TicketUrgency.URGENT,
                    "response_time_hours": 1,
                    "resolution_time_hours": 2,
                    "escalation_time_hours": 2,
                    "warning_time_hours": 1
                },
                {
                    "urgency_level": TicketUrgency.MODERATE,
                    "response_time_hours": 4,
                    "resolution_time_hours": 8,
                    "escalation_time_hours": 8,
                    "warning_time_hours": 6
                },
                {
                    "urgency_level": TicketUrgency.MILD,
                    "response_time_hours": 8,
                    "resolution_time_hours": 24,
                    "escalation_time_hours": 24,
                    "warning_time_hours": 20
                }
            ]
            await sla_rules.insert_many(default_rules)
            print("✅ Default SLA rules initialized")
    
    async def get_sla_rule(self, urgency_level: TicketUrgency) -> dict:
        """Get SLA rule for urgency level"""
        rule = await sla_rules.find_one({"urgency_level": urgency_level})
        return rule
    
    async def calculate_sla_due_date(self, urgency_level: TicketUrgency, created_at: datetime) -> datetime:
        """Calculate SLA due date based on urgency level"""
        rule = await self.get_sla_rule(urgency_level)
        if rule:
            return created_at + timedelta(hours=rule["resolution_time_hours"])
        # Default fallback
        return created_at + timedelta(hours=24)
    
    async def get_tickets_needing_escalation(self):
        """Get tickets that need automatic escalation"""
        now = datetime.now()
        
        # Find tickets where SLA is breached and not yet escalated
        tickets = await requests.find({
            "status": {"$in": ["open", "assigned", "in_progress"]},
            "sla_due_date": {"$lt": now},
            "sla_breached": False
        }).to_list(None)
        
        return tickets
    
    async def get_tickets_needing_sla_warning(self):
        """Get tickets that need SLA warning notifications"""
        now = datetime.now()
        
        # Get all active tickets
        active_tickets = await requests.find({
            "status": {"$in": ["open", "assigned", "in_progress"]}
        }).to_list(None)
        
        warning_tickets = []
        for ticket in active_tickets:
            rule = await self.get_sla_rule(ticket.get("urgency_level", TicketUrgency.MILD))
            if rule:
                warning_time = ticket["created_at"] + timedelta(hours=rule["warning_time_hours"])
                if now >= warning_time and not ticket.get("sla_warning_sent", False):
                    warning_tickets.append(ticket)
        
        return warning_tickets
    
    async def find_best_agent(self, required_skills: list, urgency_level: TicketUrgency, department_id: str = None):
        """Find the best available agent based on skills, level, and workload"""
        query = {
            "role": "agent",
            "is_available": True,
            "agent_level": {"$lte": urgency_level}  # Agent level must be <= urgency level
        }
        
        # Add department filter if specified
        if department_id:
            query["$or"] = [
                {"department_id": department_id},
                {"department_id": None}  # Agents that can work across departments
            ]
        
        # Get all eligible agents
        agents = await users.find(query).to_list(None)
        
        if not agents:
            return None
        
        # Score agents based on skills match and current workload
        scored_agents = []
        for agent in agents:
            score = 0
            
            # Skill matching score
            agent_skills = agent.get("skills", [])
            if required_skills:
                skill_matches = len(set(required_skills) & set(agent_skills))
                score += skill_matches * 10
            
            # Current workload (lower is better)
            current_tickets = await requests.count_documents({
                "assigned_agent": str(agent["_id"]),
                "status": {"$in": ["assigned", "in_progress"]}
            })
            max_tickets = agent.get("max_concurrent_tickets", 10)
            workload_score = max(0, (max_tickets - current_tickets) * 5)
            score += workload_score
            
            # Agent level bonus (higher level agents get slight preference for complex issues)
            if urgency_level == TicketUrgency.URGENT and agent.get("agent_level") == 1:
                score += 5
            
            scored_agents.append((agent, score))
        
        # Sort by score (highest first) and return best agent
        scored_agents.sort(key=lambda x: x[1], reverse=True)
        return scored_agents[0][0] if scored_agents else None
    
    async def create_notification(self, user_id: str, notification_type: str, title: str, 
                                message: str, ticket_id: str = None, metadata: dict = None):
        """Create a new notification"""
        notification = {
            "user_id": user_id,
            "ticket_id": ticket_id,
            "type": notification_type,
            "title": title,
            "message": message,
            "is_read": False,
            "metadata": metadata or {},
            "created_at": datetime.now()
        }
        
        result = await notifications.insert_one(notification)
        return str(result.inserted_id)
    
    async def add_timeline_entry(self, ticket_id: str, user_id: str, action_type: str, 
                               description: str, metadata: dict = None):
        """Add entry to ticket timeline"""
        timeline_entry = {
            "ticket_id": ticket_id,
            "user_id": user_id,
            "action_type": action_type,
            "description": description,
            "metadata": metadata or {},
            "created_at": datetime.now()
        }
        
        result = await timeline.insert_one(timeline_entry)
        return str(result.inserted_id)

# Global database manager instance
db_manager = DatabaseManager()

# Initialize SLA rules on startup
async def initialize_database():
    """Initialize database with default data"""
    await db_manager.initialize_sla_rules()
    print("✅ Database initialized successfully")
