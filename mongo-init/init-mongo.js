// MongoDB initialization script for HelpDesk
db = db.getSiblingDB('helpdesk');

// Create collections
db.createCollection('users');
db.createCollection('requests');
db.createCollection('comments');
db.createCollection('notifications');
db.createCollection('timeline');
db.createCollection('knowledgebase');
db.createCollection('categories');
db.createCollection('departments');
db.createCollection('sla_rules');
db.createCollection('chatbot_interactions');

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "role": 1 });
db.users.createIndex({ "department_id": 1 });
db.users.createIndex({ "status": 1 });
db.users.createIndex({ "categories": 1 });
db.users.createIndex({ "current_ticket_count": 1 });
db.users.createIndex({ "last_assigned_at": 1 });

db.requests.createIndex({ "user_id": 1 });
db.requests.createIndex({ "assigned_agent": 1 });
db.requests.createIndex({ "status": 1 });
db.requests.createIndex({ "category": 1 });
db.requests.createIndex({ "created_at": 1 });
db.requests.createIndex({ "updated_at": 1 });
db.requests.createIndex({ "escalated": 1 });
db.requests.createIndex({ "sla_breached": 1 });

db.comments.createIndex({ "ticket_id": 1 });
db.comments.createIndex({ "user_id": 1 });
db.comments.createIndex({ "created_at": 1 });

db.notifications.createIndex({ "user_id": 1 });
db.notifications.createIndex({ "created_at": 1 });
db.notifications.createIndex({ "is_read": 1 });

db.timeline.createIndex({ "ticket_id": 1 });
db.timeline.createIndex({ "user_id": 1 });
db.timeline.createIndex({ "created_at": 1 });

db.knowledgebase.createIndex({ "title": "text", "content": "text", "summary": "text", "tags": "text" });
db.knowledgebase.createIndex({ "category": 1 });
db.knowledgebase.createIndex({ "status": 1 });
db.knowledgebase.createIndex({ "created_at": 1 });

db.chatbot_interactions.createIndex({ "created_at": 1 });
db.chatbot_interactions.createIndex({ "resolved_by_chatbot": 1 });
db.chatbot_interactions.createIndex({ "ticket_created": 1 });

// Create default categories
db.categories.insertMany([
    { name: "Hardware Issues" },
    { name: "Software Issues" },
    { name: "Network Problems" },
    { name: "Account Access" },
    { name: "Password Reset" },
    { name: "General Inquiry" }
]);

// Create default departments
db.departments.insertMany([
    { name: "IT Support", description: "Information Technology Support" },
    { name: "HR", description: "Human Resources" },
    { name: "Finance", description: "Finance Department" },
    { name: "Operations", description: "Operations Team" }
]);

// Create default SLA rules
db.sla_rules.insertMany([
    {
        name: "Urgent Tickets",
        priority: "urgent",
        response_time_hours: 2,
        resolution_time_hours: 4,
        escalation_time_hours: 1,
        active: true
    },
    {
        name: "High Priority Tickets",
        priority: "high",
        response_time_hours: 4,
        resolution_time_hours: 24,
        escalation_time_hours: 2,
        active: true
    },
    {
        name: "Normal Priority Tickets",
        priority: "medium",
        response_time_hours: 8,
        resolution_time_hours: 72,
        escalation_time_hours: 4,
        active: true
    },
    {
        name: "Low Priority Tickets",
        priority: "low",
        response_time_hours: 24,
        resolution_time_hours: 168,
        escalation_time_hours: 12,
        active: true
    }
]);

print("HelpDesk database initialized successfully!");