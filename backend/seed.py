import asyncio
from database import database
from auth import get_password_hash
from datetime import datetime, timedelta

async def seed_database():
    # Clear existing data
    await database.users.delete_many({})
    await database.requests.delete_many({})
    await database.agents.delete_many({})

    # Seed users
    users = [
        {
            "name": "John Doe",
            "email": "client@example.com",
            "role": "client",
            "hashed_password": get_password_hash("password")
        },
        {
            "name": "Agent Smith",
            "email": "agent1@example.com",
            "role": "agent",
            "department_id": "it_dept",
            "agent_level": 3,  # Mild/General support
            "skills": ["hardware", "software", "network"],
            "categories": ["Hardware Issues", "Software Issues", "Network & Connectivity"],
            "status": "active",
            "is_available": True,
            "current_ticket_count": 0,
            "max_concurrent_tickets": 5,
            "last_assigned_at": None,
            "hashed_password": get_password_hash("password")
        },
        {
            "name": "Agent Johnson",
            "email": "agent2@example.com",
            "role": "agent",
            "department_id": "it_dept",
            "agent_level": 2,  # Moderate support
            "skills": ["network", "security", "database"],
            "categories": ["Network & Connectivity", "Account & Security"],
            "status": "active",
            "is_available": True,
            "current_ticket_count": 0,
            "max_concurrent_tickets": 3,
            "last_assigned_at": None,
            "hashed_password": get_password_hash("password")
        },
        {
            "name": "Senior Agent Brown",
            "email": "agent3@example.com",
            "role": "agent",
            "department_id": "it_dept",
            "agent_level": 1,  # Urgent/Critical support
            "skills": ["security", "infrastructure", "emergency"],
            "categories": ["Account & Security", "Hardware Issues"],
            "status": "active",
            "is_available": True,
            "current_ticket_count": 0,
            "max_concurrent_tickets": 2,
            "last_assigned_at": None,
            "hashed_password": get_password_hash("password")
        },
        {
            "name": "Manager Jane",
            "email": "manager@example.com",
            "role": "manager",
            "department_id": "it_dept",
            "hashed_password": get_password_hash("password")
        },
        {
            "name": "System Admin",
            "email": "admin@example.com",
            "role": "admin",
            "hashed_password": get_password_hash("password")
        }
    ]

    user_results = await database.users.insert_many(users)
    user_ids = user_results.inserted_ids

    # Seed departments
    departments = [
        {
            "name": "IT Support",
            "description": "Information Technology Support Department",
            "manager_id": str(user_ids[4]),  # Manager Jane
            "created_at": datetime.now()
        },
        {
            "name": "HR",
            "description": "Human Resources Department",
            "created_at": datetime.now()
        },
        {
            "name": "Finance",
            "description": "Finance and Accounting Department",
            "created_at": datetime.now()
        }
    ]

    dept_results = await database.departments.insert_many(departments)
    dept_ids = dept_results.inserted_ids

    # Update user department references
    await database.users.update_many(
        {"department_id": "it_dept"},
        {"$set": {"department_id": str(dept_ids[0])}}
    )

    # Seed SLA rules
    sla_rules = [
        {
            "urgency_level": 1,  # Urgent
            "response_time_hours": 2,
            "resolution_time_hours": 4,
            "warning_time_hours": 1,
            "escalation_time_hours": 3
        },
        {
            "urgency_level": 2,  # Moderate
            "response_time_hours": 8,
            "resolution_time_hours": 16,
            "warning_time_hours": 4,
            "escalation_time_hours": 12
        },
        {
            "urgency_level": 3,  # Mild
            "response_time_hours": 24,
            "resolution_time_hours": 48,
            "warning_time_hours": 12,
            "escalation_time_hours": 36
        }
    ]

    await database.sla_rules.insert_many(sla_rules)

    # Seed sample requests (using dynamic categories from database)
    categories_cursor = await database.categories.find().to_list(None)
    category_names = [cat["name"] for cat in categories_cursor]

    # Use first available category or default if none exist
    hardware_category = category_names[0] if category_names else "General Support"
    network_category = category_names[1] if len(category_names) > 1 else "General Support"

    requests = [
        {
            "user_id": str(user_ids[0]),  # John Doe
            "title": "Computer not starting",
            "description": "My computer won't turn on after the Windows update. It shows a blue screen error.",
            "category": hardware_category,
            "priority": "urgent",
            "urgency_level": 1,  # Urgent
            "status": "open",
            "required_skills": ["hardware"],
            "created_at": datetime.now() - timedelta(hours=3),  # 3 hours ago
            "updated_at": datetime.now() - timedelta(hours=3),
            "sla_due_date": datetime.now() - timedelta(hours=1),  # Already breached
            "sla_breached": True,
            "escalation_count": 1
        },
        {
            "user_id": str(user_ids[0]),  # John Doe
            "title": "Cannot access shared drive",
            "description": "I'm getting access denied error when trying to open the company shared drive.",
            "category": network_category,
            "priority": "medium",
            "urgency_level": 2,  # Moderate
            "status": "assigned",
            "assigned_agent": str(user_ids[1]),  # Agent Smith
            "required_skills": ["network"],
            "created_at": datetime.now() - timedelta(hours=6),
            "updated_at": datetime.now() - timedelta(hours=6),
            "sla_due_date": datetime.now() + timedelta(hours=10)
        }
    ]

    request_results = await database.requests.insert_many(requests)
    request_ids = request_results.inserted_ids

    # Update agent availability
    await database.users.update_one(
        {"_id": user_ids[1]},
        {"$set": {"is_available": False}}
    )

    # Seed sample comments
    comments = [
        {
            "ticket_id": str(request_ids[1]),
            "user_id": str(user_ids[1]),  # Agent Smith
            "content": "I've checked the network permissions. Can you try accessing the drive from a different computer to confirm if it's user-specific or machine-specific?",
            "comment_type": "comment",
            "is_internal": False,
            "created_at": datetime.now() - timedelta(hours=5)
        }
    ]

    await database.comments.insert_many(comments)

    # Seed sample notifications
    notifications = [
        {
            "user_id": str(user_ids[1]),  # Agent Smith
            "ticket_id": str(request_ids[1]),
            "type": "ticket_assigned",
            "title": "New ticket assigned",
            "message": "You have been assigned a new ticket: Cannot access shared drive",
            "is_read": False,
            "created_at": datetime.now() - timedelta(hours=6)
        }
    ]

    await database.notifications.insert_many(notifications)

    # Seed sample timeline
    timeline = [
        {
            "ticket_id": str(request_ids[0]),
            "user_id": str(user_ids[0]),
            "action_type": "created",
            "description": "Ticket created",
            "created_at": datetime.now() - timedelta(hours=3)
        },
        {
            "ticket_id": str(request_ids[0]),
            "user_id": "system",
            "action_type": "escalated",
            "description": "Ticket escalated due to SLA breach (Level 1)",
            "metadata": {"sla_breached": True},
            "created_at": datetime.now() - timedelta(hours=1)
        },
        {
            "ticket_id": str(request_ids[1]),
            "user_id": str(user_ids[1]),
            "action_type": "assigned",
            "description": "Ticket assigned to agent",
            "created_at": datetime.now() - timedelta(hours=6)
        },
        {
            "ticket_id": str(request_ids[1]),
            "user_id": str(user_ids[1]),
            "action_type": "commented",
            "description": "Added a comment",
            "created_at": datetime.now() - timedelta(hours=5)
        }
    ]

    await database.timeline.insert_many(timeline)

    # Seed knowledge base with enhanced structure (using dynamic categories)
    categories_cursor = await database.categories.find().to_list(None)
    category_names = [cat["name"] for cat in categories_cursor]

    # Map to available categories or use defaults
    account_category = next((cat for cat in category_names if "account" in cat.lower()), category_names[0] if category_names else "General Support")
    network_category = next((cat for cat in category_names if "network" in cat.lower()), category_names[1] if len(category_names) > 1 else "General Support")
    software_category = next((cat for cat in category_names if "software" in cat.lower()), category_names[2] if len(category_names) > 2 else "General Support")

    knowledge = [
        {
            "title": "How to Reset Your Password",
            "content": """<h2>Password Reset Process</h2>
<p>Follow these steps to reset your password:</p>
<ol>
<li>Go to the login page</li>
<li>Click on 'Forgot Password' link</li>
<li>Enter your email address</li>
<li>Check your email for reset instructions</li>
<li>Click the reset link in the email</li>
<li>Create a new strong password</li>
</ol>
<p><strong>Note:</strong> The reset link expires in 24 hours.</p>""",
            "summary": "Step-by-step guide to reset your account password",
            "category": account_category,
            "tags": ["password", "reset", "login", "security"],
            "attachments": [],
            "links": [],
            "author": "admin@example.com",
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "views": 0,
            "helpful_votes": 0,
            "status": "published"
        },
        {
            "question": "Computer not starting",
            "answer": "Check power cable, try different outlet, contact IT support if issue persists.",
            "category": software_category
        },
        {
            "question": "How to connect to WiFi?",
            "answer": "1. Click the WiFi icon in system tray\n2. Select your network\n3. Enter password\n4. Click Connect\nIf issues persist, restart your computer and try again.",
            "category": network_category
        },
        {
            "question": "Outlook not receiving emails",
            "answer": "1. Check internet connection\n2. Verify email settings\n3. Check spam/junk folder\n4. Restart Outlook\n5. Contact IT if problem continues.",
            "category": software_category
        },
        {
            "question": "Computer running slow",
            "answer": "1. Restart your computer\n2. Close unnecessary programs\n3. Run disk cleanup\n4. Check for Windows updates\n5. Run antivirus scan\nIf still slow, contact IT support.",
            "category": software_category
        },
        {
            "question": "How to install software?",
            "answer": "1. Download from official website or company portal\n2. Right-click installer and 'Run as administrator'\n3. Follow installation wizard\n4. Restart if prompted\nNote: Some software requires IT approval.",
            "category": software_category
        },
        {
            "question": "Printer not working",
            "answer": "1. Check printer power and connections\n2. Ensure paper and ink/toner\n3. Clear any paper jams\n4. Restart printer and computer\n5. Check printer queue for stuck jobs\nContact IT if issues persist.",
            "category": software_category
        },
        {
            "question": "VPN connection issues",
            "answer": "1. Check internet connection\n2. Restart VPN client\n3. Try different VPN server\n4. Disable firewall temporarily\n5. Contact IT for VPN credentials verification.",
            "category": network_category
        },
        {
            "question": "Microsoft Teams not working",
            "answer": "1. Check internet connection\n2. Restart Teams application\n3. Clear Teams cache\n4. Update Teams to latest version\n5. Try Teams web version\nContact IT if problems continue.",
            "category": software_category
        },
        {
            "question": "Blue screen error (BSOD)",
            "answer": "1. Note the error code\n2. Restart computer\n3. Check for Windows updates\n4. Run memory diagnostic\n5. Contact IT immediately with error details for hardware check.",
            "category": software_category
        },
        {
            "question": "How to access shared drives?",
            "answer": "1. Open File Explorer\n2. Click 'Network' in sidebar\n3. Double-click server name\n4. Enter your credentials\n5. Navigate to shared folder\nContact IT if you don't have access permissions.",
            "category": network_category
        },
        {
            "question": "Excel file won't open",
            "answer": "1. Try opening Excel first, then the file\n2. Check if file is corrupted\n3. Try opening on different computer\n4. Restore from backup if available\n5. Contact IT for file recovery assistance.",
            "category": software_category
        },
        {
            "title": "WiFi Connection Setup Guide",
            "content": """<h2>Connecting to WiFi Network</h2>
<p>Follow these steps to connect to a WiFi network:</p>

<h3>Windows 10/11:</h3>
<ol>
<li>Click the WiFi icon in the system tray (bottom-right corner)</li>
<li>Select your network from the list</li>
<li>Click "Connect"</li>
<li>Enter the network password</li>
<li>Check "Connect automatically" for future connections</li>
</ol>

<h3>Troubleshooting WiFi Issues:</h3>
<ul>
<li><strong>Network not visible:</strong> Check if WiFi is enabled on your device</li>
<li><strong>Can't connect:</strong> Verify the password is correct</li>
<li><strong>Connected but no internet:</strong> Restart your router</li>
<li><strong>Slow connection:</strong> Move closer to the router</li>
</ul>

<p><em>For enterprise networks, you may need additional configuration. Contact IT support for assistance.</em></p>""",
            "summary": "Complete guide for connecting to WiFi networks and troubleshooting common issues",
            "category": network_category,
            "tags": ["wifi", "network", "connection", "internet", "troubleshooting"],
            "attachments": [],
            "links": [
                {
                    "title": "Windows Network Troubleshooter",
                    "url": "ms-settings:network-troubleshooter"
                }
            ],
            "author": "admin@example.com",
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "views": 0,
            "helpful_votes": 0,
            "status": "published"
        },
        {
            "title": "Microsoft Office Installation and Activation",
            "content": """<h2>Installing Microsoft Office</h2>
<p>This guide covers the installation and activation of Microsoft Office suite.</p>

<h3>Installation Steps:</h3>
<ol>
<li>Visit <a href="https://office.com">office.com</a></li>
<li>Sign in with your company account</li>
<li>Click "Install Office" > "Office 365 apps"</li>
<li>Run the downloaded installer</li>
<li>Follow the installation wizard</li>
</ol>

<h3>Activation:</h3>
<ul>
<li>Office should activate automatically with your company account</li>
<li>If prompted, sign in with your work email</li>
<li>Contact IT if activation fails</li>
</ul>

<h3>Common Issues:</h3>
<table border="1" style="border-collapse: collapse; width: 100%;">
<tr><th>Issue</th><th>Solution</th></tr>
<tr><td>Installation fails</td><td>Run as administrator, check disk space</td></tr>
<tr><td>Activation error</td><td>Check internet connection, verify account</td></tr>
<tr><td>Missing applications</td><td>Reinstall Office with full suite</td></tr>
</table>""",
            "summary": "Step-by-step guide for installing and activating Microsoft Office",
            "category": software_category,
            "tags": ["office", "microsoft", "installation", "activation", "software"],
            "attachments": [],
            "links": [
                {
                    "title": "Office Support",
                    "url": "https://support.microsoft.com/office"
                },
                {
                    "title": "Download Office",
                    "url": "https://office.com"
                }
            ],
            "author": "admin@example.com",
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "views": 0,
            "helpful_votes": 0,
            "status": "published"
        }
    ]

    await database.knowledgebase.insert_many(knowledge)

    print("Database seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_database())