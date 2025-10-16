from datetime import datetime, timedelta
from database import database
from models import TicketUrgency, NotificationType
from bson import ObjectId

class SLAService:
    def __init__(self):
        # SLA rules in hours
        self.sla_rules = {
            TicketUrgency.URGENT: {
                "response_time": 2,
                "resolution_time": 2,
                "warning_time": 1,  # Warn 1 hour before breach
                "escalation_levels": [1, 2, 3]  # Agent levels for escalation
            },
            TicketUrgency.MODERATE: {
                "response_time": 8,
                "resolution_time": 8,
                "warning_time": 4,
                "escalation_levels": [2, 3, 1]  # Start with level 2, escalate to 3, then 1
            },
            TicketUrgency.MILD: {
                "response_time": 24,
                "resolution_time": 24,
                "warning_time": 12,
                "escalation_levels": [3, 2, 1]
            }
        }

    async def check_sla_breaches(self):
        """Check for SLA breaches and send warnings/escalate tickets"""
        now = datetime.utcnow()

        # Find tickets that are not resolved/closed and past SLA
        overdue_tickets = await database.requests.find({
            "status": {"$nin": ["resolved", "closed"]},
            "sla_due_date": {"$lt": now},
            "sla_breached": False
        }).to_list(None)

        for ticket in overdue_tickets:
            await self._handle_sla_breach(ticket)

        # Find tickets approaching SLA breach for warnings
        warning_threshold = now + timedelta(hours=1)  # Warn 1 hour before
        warning_tickets = await database.requests.find({
            "status": {"$nin": ["resolved", "closed"]},
            "sla_due_date": {"$lte": warning_threshold, "$gt": now},
            "sla_breached": False
        }).to_list(None)

        for ticket in warning_tickets:
            await self._send_sla_warning(ticket)

    async def _handle_sla_breach(self, ticket: dict):
        """Handle SLA breach by escalating the ticket"""
        ticket_id = str(ticket["_id"])
        urgency = ticket.get("urgency_level", TicketUrgency.MILD)
        current_level = ticket.get("escalation_count", 0)

        # Mark as breached
        await database.requests.update_one(
            {"_id": ObjectId(ticket_id)},
            {
                "$set": {
                    "sla_breached": True,
                    "status": "escalated",
                    "escalated_at": datetime.utcnow()
                },
                "$inc": {"escalation_count": 1}
            }
        )

        # Find next agent level to escalate to
        escalation_levels = self.sla_rules[urgency]["escalation_levels"]
        if current_level < len(escalation_levels):
            next_level = escalation_levels[current_level]
            await self._escalate_to_agent_level(ticket, next_level)
        else:
            # Escalate to manager
            await self._escalate_to_manager(ticket)

        # Create timeline entry
        timeline_data = {
            "ticket_id": ticket_id,
            "user_id": "system",  # System-generated
            "action_type": "escalated",
            "description": f"Ticket escalated due to SLA breach (Level {current_level + 1})",
            "metadata": {"sla_breached": True},
            "created_at": datetime.utcnow()
        }
        await database.timeline.insert_one(timeline_data)

    async def _escalate_to_agent_level(self, ticket: dict, agent_level: int):
        """Escalate ticket to agents of specific level"""
        ticket_id = str(ticket["_id"])

        # Find available agents of the required level
        agents = await database.users.find({
            "role": "agent",
            "agent_level": agent_level,
            "is_available": True
        }).to_list(None)

        if agents:
            # Assign to first available agent
            new_agent = agents[0]
            await database.requests.update_one(
                {"_id": ObjectId(ticket_id)},
                {"$set": {"assigned_agent": str(new_agent["_id"])}}
            )

            # Update agent availability
            await database.users.update_one(
                {"_id": new_agent["_id"]},
                {"$set": {"is_available": False}}
            )

            # Create notification
            notification_data = {
                "user_id": str(new_agent["_id"]),
                "ticket_id": ticket_id,
                "type": NotificationType.TICKET_ESCALATED,
                "title": "Escalated ticket assigned",
                "message": f"Urgent ticket #{ticket_id[:8]} has been escalated to you",
                "created_at": datetime.utcnow()
            }
            await database.notifications.insert_one(notification_data)

    async def _escalate_to_manager(self, ticket: dict):
        """Escalate ticket to manager"""
        ticket_id = str(ticket["_id"])

        # Find manager
        manager = await database.users.find_one({"role": "manager"})
        if manager:
            await database.requests.update_one(
                {"_id": ObjectId(ticket_id)},
                {"$set": {"assigned_agent": str(manager["_id"])}}
            )

            # Create notification for manager
            notification_data = {
                "user_id": str(manager["_id"]),
                "ticket_id": ticket_id,
                "type": NotificationType.TICKET_ESCALATED,
                "title": "Critical ticket escalated",
                "message": f"Ticket #{ticket_id[:8]} has breached SLA and been escalated to management",
                "created_at": datetime.utcnow()
            }
            await database.notifications.insert_one(notification_data)

    async def _send_sla_warning(self, ticket: dict):
        """Send SLA warning notification"""
        ticket_id = str(ticket["_id"])
        assigned_agent = ticket.get("assigned_agent")

        if assigned_agent:
            # Check if warning already sent
            existing_warning = await database.notifications.find_one({
                "user_id": assigned_agent,
                "ticket_id": ticket_id,
                "type": NotificationType.SLA_WARNING
            })

            if not existing_warning:
                notification_data = {
                    "user_id": assigned_agent,
                    "ticket_id": ticket_id,
                    "type": NotificationType.SLA_WARNING,
                    "title": "SLA Warning",
                    "message": f"Ticket #{ticket_id[:8]} is approaching SLA breach",
                    "created_at": datetime.utcnow()
                }
                await database.notifications.insert_one(notification_data)

    async def manual_escalate(self, ticket_id: str, current_user_id: str):
        """Manually escalate a ticket"""
        ticket = await database.requests.find_one({"_id": ObjectId(ticket_id)})
        if not ticket:
            return False

        # Increment escalation count
        new_count = ticket.get("escalation_count", 0) + 1

        await database.requests.update_one(
            {"_id": ObjectId(ticket_id)},
            {
                "$set": {
                    "status": "escalated",
                    "escalated_at": datetime.utcnow()
                },
                "$inc": {"escalation_count": 1}
            }
        )

        # Determine next escalation level
        urgency = ticket.get("urgency_level", TicketUrgency.MILD)
        escalation_levels = self.sla_rules[urgency]["escalation_levels"]

        if new_count <= len(escalation_levels):
            next_level = escalation_levels[new_count - 1]
            await self._escalate_to_agent_level(ticket, next_level)
        else:
            await self._escalate_to_manager(ticket)

        # Create timeline entry
        timeline_data = {
            "ticket_id": ticket_id,
            "user_id": current_user_id,
            "action_type": "escalated",
            "description": f"Ticket manually escalated (Level {new_count})",
            "metadata": {"manual_escalation": True},
            "created_at": datetime.utcnow()
        }
        await database.timeline.insert_one(timeline_data)

        return True

# Global SLA service instance
sla_service = SLAService()
