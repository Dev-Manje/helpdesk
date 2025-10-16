from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from models import User, Request, RequestCreate, Token, KnowledgeBase, Comment, Notification, Timeline, Department, SLARule, UserCreate, UserInDB, ChatbotInteraction
from auth import get_current_user, authenticate_user, create_access_token
from database import database
from sla_service import sla_service
from bson import ObjectId
from typing import List, Optional
from datetime import datetime, timedelta
import os
import uuid
import shutil

app = FastAPI(title="HelpMate API", version="1.0.0")

# Create uploads directory if it doesn't exist
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mount static files for serving uploads
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Help Desk API is running"}

@app.post("/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    try:
        user = await authenticate_user(form_data.username, form_data.password)
        print(f"Login attempt for {form_data.username}: user found = {user is not None}")
        if not user:
            raise HTTPException(status_code=400, detail="Incorrect email or password")
        access_token = create_access_token(data={"sub": user.email})
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        print(f"Login error: {e}")
        raise

@app.get("/auth/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return {
        "id": str(current_user.id),
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "department_id": current_user.department_id,
        "agent_level": current_user.agent_level,
        "skills": current_user.skills
    }

@app.post("/auth/change-password")
async def change_password(
    current_password: str = Form(...),
    new_password: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    """Change user password"""
    try:
        # Verify current password
        user_data = await database.users.find_one({"_id": ObjectId(current_user.id)})
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")

        if not verify_password(current_password, user_data.get("hashed_password", "")):
            raise HTTPException(status_code=400, detail="Current password is incorrect")

        # Update password
        hashed_new_password = get_password_hash(new_password)
        await database.users.update_one(
            {"_id": ObjectId(current_user.id)},
            {"$set": {"hashed_password": hashed_new_password}}
        )

        return {"message": "Password changed successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to change password: {str(e)}")

@app.post("/requests", response_model=Request)
async def create_request(request: RequestCreate, current_user: User = Depends(get_current_user)):
    request_dict = request.dict()
    request_dict["user_id"] = str(current_user.id)
    request_dict["created_at"] = datetime.utcnow()
    request_dict["updated_at"] = datetime.utcnow()

    # Set SLA based on urgency
    from models import TicketUrgency
    urgency = request_dict.get("urgency_level", TicketUrgency.MILD)
    sla_hours = {TicketUrgency.URGENT: 2, TicketUrgency.MODERATE: 8, TicketUrgency.MILD: 24}
    request_dict["sla_due_date"] = datetime.utcnow() + timedelta(hours=sla_hours[urgency])

    result = await database.requests.insert_one(request_dict)
    request_dict["_id"] = str(result.inserted_id)

    # Skill-based agent assignment
    assigned_agent = await assign_agent_to_ticket(str(result.inserted_id), request_dict.get("required_skills", []), request_dict.get("category"))
    if assigned_agent:
        request_dict["assigned_agent"] = assigned_agent
        request_dict["status"] = "assigned"

        # Create timeline entry
        timeline_data = {
            "ticket_id": str(result.inserted_id),
            "user_id": assigned_agent,
            "action_type": "assigned",
            "description": "Ticket assigned to agent",
            "created_at": datetime.utcnow()
        }
        await database.timeline.insert_one(timeline_data)

        # Create notification for agent
        notification_data = {
            "user_id": assigned_agent,
            "ticket_id": str(result.inserted_id),
            "type": "ticket_assigned",
            "title": "New ticket assigned",
            "message": f"You have been assigned a new ticket: {request_dict.get('title', 'Untitled')}",
            "created_at": datetime.utcnow()
        }
        await database.notifications.insert_one(notification_data)

    return Request(**request_dict)

async def assign_agent_to_ticket(ticket_id: str, required_skills: List[str], ticket_category: Optional[str] = None) -> Optional[str]:
    """Assign agent to ticket using load-based round robin with category expertise and status filtering"""

    # Get ticket details for category matching
    ticket = await database.requests.find_one({"_id": ObjectId(ticket_id)})
    if not ticket:
        return None

    category = ticket_category or ticket.get("category")

    # Step 1: Try to find agents with matching category expertise
    category_query = {
        "role": "agent",
        "status": {"$in": ["active", "busy"]},  # Include busy agents for overflow
        "categories": category,  # Must have matching category
        "$expr": {"$lt": ["$current_ticket_count", "$max_concurrent_tickets"]}  # Under capacity
    }

    category_agents = await database.users.find(category_query).sort([
        ("current_ticket_count", 1),  # Lightest load first
        ("last_assigned_at", 1)       # Round robin for same load
    ]).to_list(None)

    selected_agent = None

    if category_agents:
        # Found category-specialized agent
        selected_agent = category_agents[0]
        print(f"Assigned to category specialist: {selected_agent['name']} for {category}")
    else:
        # Step 2: Fallback to general agents (agents with multiple categories or general expertise)
        general_query = {
            "role": "agent",
            "status": {"$in": ["active", "busy"]},  # Include busy agents for overflow
            "$expr": {"$lt": ["$current_ticket_count", "$max_concurrent_tickets"]}
        }

        general_agents = await database.users.find(general_query).sort([
            ("current_ticket_count", 1),
            ("last_assigned_at", 1)
        ]).to_list(None)

        if general_agents:
            selected_agent = general_agents[0]
            print(f"Assigned to general agent: {selected_agent['name']} (no category match for {category})")
        else:
            print(f"No available agents for ticket {ticket_id} (category: {category})")
            return None

    # Step 3: Assign the ticket
    agent_id = str(selected_agent["_id"])

    # Update ticket assignment
    await database.requests.update_one(
        {"_id": ObjectId(ticket_id)},
        {
            "$set": {
                "assigned_agent": agent_id,
                "status": "assigned"
            }
        }
    )

    # Update agent load and last assignment
    await database.users.update_one(
        {"_id": selected_agent["_id"]},
        {
            "$inc": {"current_ticket_count": 1},
            "$set": {"last_assigned_at": datetime.utcnow()}
        }
    )

    # Check if agent should be marked as busy after assignment
    updated_agent = await database.users.find_one({"_id": selected_agent["_id"]})
    if updated_agent and updated_agent.get("current_ticket_count", 0) >= updated_agent.get("max_concurrent_tickets", 5):
        # Mark as busy if at capacity
        await database.users.update_one(
            {"_id": selected_agent["_id"]},
            {"$set": {"status": "busy"}}
        )
        print(f"Agent {selected_agent['name']} marked as busy (at capacity)")

    # Create timeline entry
    timeline_data = {
        "ticket_id": ticket_id,
        "user_id": agent_id,
        "action_type": "assigned",
        "description": f"Ticket assigned to agent via load balancing",
        "metadata": {
            "assignment_method": "load_balanced",
            "category_match": category in (selected_agent.get("categories") or [])
        },
        "created_at": datetime.utcnow()
    }
    await database.timeline.insert_one(timeline_data)

    # Create notification for agent
    notification_data = {
        "user_id": agent_id,
        "ticket_id": ticket_id,
        "type": "ticket_assigned",
        "title": "New ticket assigned",
        "message": f"You have been assigned a new ticket: {ticket.get('title', 'Untitled')}",
        "created_at": datetime.utcnow()
    }
    await database.notifications.insert_one(notification_data)

    print(f"Successfully assigned ticket {ticket_id} to agent {selected_agent['name']}")
    return agent_id

@app.post("/requests/with-attachments")
async def create_request_with_attachments(
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    priority: str = Form("medium"),
    files: List[UploadFile] = File([]),
    current_user: User = Depends(get_current_user)
):
    """Create a new support request with file attachments"""
    try:
        # Handle file uploads
        attachments = []
        for file in files:
            if file.filename:
                # Generate unique filename
                file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
                unique_filename = f"{uuid.uuid4()}.{file_extension}" if file_extension else str(uuid.uuid4())
                file_path = os.path.join(UPLOAD_DIR, unique_filename)

                # Save file
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)

                # Add to attachments list
                attachments.append({
                    "filename": file.filename,
                    "stored_filename": unique_filename,
                    "size": os.path.getsize(file_path),
                    "content_type": file.content_type,
                    "url": f"/uploads/{unique_filename}"
                })

        # Create request
        request_data = {
            "user_id": str(current_user.id),
            "title": title,
            "description": description,
            "category": category,
            "priority": priority,
            "status": "open",
            "attachments": attachments,
            "created_at": datetime.utcnow()
        }

        result = await database.requests.insert_one(request_data)
        request_id = str(result.inserted_id)

        # Assign to agent round-robin
        agent = await database.agents.find_one({"available": True})
        if agent:
            await database.requests.update_one(
                {"_id": result.inserted_id},
                {"$set": {"assigned_agent": agent["user_id"], "status": "assigned"}}
            )
            await database.agents.update_one(
                {"_id": agent["_id"]},
                {"$set": {"available": False}}
            )
            request_data["assigned_agent"] = agent["user_id"]
            request_data["status"] = "assigned"

        request_data["_id"] = request_id
        request_data["id"] = request_id

        return {
            "message": "Ticket created successfully",
            "ticket_id": request_id,
            "status": request_data["status"],
            "attachments_count": len(attachments)
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create ticket: {str(e)}")

@app.get("/requests/categories")
async def get_ticket_categories(current_user: User = Depends(get_current_user)):
    """Get available ticket categories from database"""
    # Get categories from database
    categories_cursor = await database.categories.find().to_list(None)
    categories = [cat["name"] for cat in categories_cursor]

    # If no categories in database, return empty list (will be managed via admin interface)
    return {"categories": categories}

@app.get("/requests", response_model=List[Request])
async def get_requests(current_user: User = Depends(get_current_user)):
    """Get requests based on user role with appropriate filtering"""

    # Client/User: Only their own tickets
    if current_user.role in ["user", "client"]:
        query = {"user_id": str(current_user.id)}

    # Agent: Only tickets assigned to them
    elif current_user.role == "agent":
        query = {"assigned_agent": str(current_user.id)}

    # Manager: Tickets for their department + escalated tickets
    elif current_user.role == "manager":
        # Get all agents in the manager's department
        department_agents = await database.users.find(
            {"role": "agent", "department_id": current_user.department_id}
        ).to_list(None)
        agent_ids = [str(agent["_id"]) for agent in department_agents]

        query = {
            "$or": [
                {"assigned_agent": {"$in": agent_ids}},  # Team tickets
                {"escalated": True},  # Escalated tickets
                {"user_id": str(current_user.id)}  # Manager's own tickets
            ]
        }

    # Admin: All tickets
    else:  # admin or any other role
        query = {}

    requests = await database.requests.find(query).to_list(None)
    return [Request(**{**req, "_id": str(req["_id"])}) for req in requests]

@app.get("/requests/{request_id}", response_model=Request)
async def get_request(request_id: str, current_user: User = Depends(get_current_user)):
    request = await database.requests.find_one({"_id": ObjectId(request_id)})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    if current_user.role == "user" and request["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    return Request(**{**request, "_id": str(request["_id"])})

@app.put("/requests/{request_id}", response_model=Request)
async def update_request(request_id: str, update_data: dict, current_user: User = Depends(get_current_user)):
    # Simple update, in practice add validation
    if current_user.role == "user":
        raise HTTPException(status_code=403, detail="Not authorized")
    result = await database.requests.update_one({"_id": ObjectId(request_id)}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    request = await database.requests.find_one({"_id": ObjectId(request_id)})
    return Request(**{**request, "_id": str(request["_id"])})

@app.post("/escalate/{request_id}")
async def escalate_request(request_id: str, current_user: User = Depends(get_current_user)):
    request = await database.requests.find_one({"_id": ObjectId(request_id)})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    if current_user.role == "client" and request["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Use SLA service for escalation
    success = await sla_service.manual_escalate(request_id, str(current_user.id))
    if not success:
        raise HTTPException(status_code=400, detail="Failed to escalate request")

    return {"message": "Request escalated successfully"}

# Comment Management Endpoints

@app.post("/requests/{request_id}/comments")
async def add_comment(
    request_id: str,
    content: str = Form(None),
    comment_type: str = Form("comment"),
    is_internal: bool = Form(False),
    files: List[UploadFile] = File([]),
    current_user: User = Depends(get_current_user)
):
    """Add a comment to a ticket"""
    # Check if request exists and user has access
    request = await database.requests.find_one({"_id": ObjectId(request_id)})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    # Check permissions
    if current_user.role == "client" and request["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    if current_user.role not in ["agent", "manager", "admin"] and request["assigned_agent"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Handle file attachments
    attachments = []
    for file in files:
        if file.filename:
            file_extension = os.path.splitext(file.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = os.path.join(UPLOAD_DIR, unique_filename)

            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            attachments.append({
                "filename": file.filename,
                "stored_filename": unique_filename,
                "url": f"/uploads/{unique_filename}",
                "size": os.path.getsize(file_path),
                "content_type": file.content_type
            })

    # Create comment
    comment_data = {
        "ticket_id": request_id,
        "user_id": str(current_user.id),
        "content": content,
        "comment_type": comment_type,
        "is_internal": is_internal,
        "attachments": attachments,
        "created_at": datetime.utcnow()
    }

    result = await database.comments.insert_one(comment_data)
    comment_data["_id"] = str(result.inserted_id)

    # Update request updated_at
    await database.requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"updated_at": datetime.utcnow()}}
    )

    # Create timeline entry
    timeline_data = {
        "ticket_id": request_id,
        "user_id": str(current_user.id),
        "action_type": "commented",
        "description": f"Added a {comment_type} comment",
        "metadata": {"comment_id": str(result.inserted_id)},
        "created_at": datetime.utcnow()
    }
    await database.timeline.insert_one(timeline_data)

    # Create notification for the other party
    if current_user.role == "client":
        # Notify assigned agent
        if request.get("assigned_agent"):
            notification_data = {
                "user_id": request["assigned_agent"],
                "ticket_id": request_id,
                "type": "comment_added",
                "title": "New comment on your ticket",
                "message": f"Client added a comment to ticket #{request_id[:8]}",
                "metadata": {"comment_id": str(result.inserted_id)},
                "created_at": datetime.utcnow()
            }
            await database.notifications.insert_one(notification_data)
    else:
        # Notify client
        notification_data = {
            "user_id": request["user_id"],
            "ticket_id": request_id,
            "type": "comment_added",
            "title": "Agent responded to your ticket",
            "message": f"Agent added a comment to ticket #{request_id[:8]}",
            "metadata": {"comment_id": str(result.inserted_id)},
            "created_at": datetime.utcnow()
        }
        await database.notifications.insert_one(notification_data)

    return {"message": "Comment added successfully", "comment_id": str(result.inserted_id)}

@app.get("/requests/{request_id}/comments")
async def get_comments(request_id: str, page: int = 1, limit: int = 50, current_user: User = Depends(get_current_user)):
    """Get comments for a ticket with pagination"""
    # Check if request exists and user has access
    request = await database.requests.find_one({"_id": ObjectId(request_id)})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    # Check permissions
    if current_user.role == "client" and request["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    if current_user.role not in ["agent", "manager", "admin"] and request["assigned_agent"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Calculate skip for pagination
    skip = (page - 1) * limit

    # Get total count for pagination info
    total_count = await database.comments.count_documents({"ticket_id": request_id})

    # Get comments with pagination, sorted by created_at descending (most recent first)
    comments = await database.comments.find({"ticket_id": request_id}).sort("created_at", -1).skip(skip).limit(limit).to_list(None)

    # Filter internal comments for clients
    if current_user.role == "client":
        comments = [c for c in comments if not c.get("is_internal", False)]

    # Get user information for each comment
    enriched_comments = []
    for comment in comments:
        comment_dict = {"id": str(comment["_id"]), **{k: v for k, v in comment.items() if k != "_id"}}

        # Try to get user name for the comment author
        try:
            user = await database.users.find_one({"_id": ObjectId(comment.get("user_id"))})
            if user:
                comment_dict["user_name"] = user.get("name", "Unknown User")
                comment_dict["user_role"] = user.get("role", "unknown")
            else:
                comment_dict["user_name"] = "Unknown User"
                comment_dict["user_role"] = "unknown"
        except:
            comment_dict["user_name"] = "Unknown User"
            comment_dict["user_role"] = "unknown"

        enriched_comments.append(comment_dict)

    return {
        "comments": enriched_comments,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total_count,
            "pages": (total_count + limit - 1) // limit  # Ceiling division
        }
    }

# Notification Endpoints

@app.get("/notifications")
async def get_notifications(current_user: User = Depends(get_current_user)):
    """Get notifications for current user"""
    notifications = await database.notifications.find(
        {"user_id": str(current_user.id)}
    ).sort("created_at", -1).to_list(None)

    return [{"id": str(n["_id"]), **{k: v for k, v in n.items() if k != "_id"}} for n in notifications]

@app.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: User = Depends(get_current_user)):
    """Mark a notification as read"""
    result = await database.notifications.update_one(
        {"_id": ObjectId(notification_id), "user_id": str(current_user.id)},
        {"$set": {"is_read": True}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")

    return {"message": "Notification marked as read"}

# Timeline Endpoints

@app.get("/requests/{request_id}/timeline")
async def get_timeline(request_id: str, current_user: User = Depends(get_current_user)):
    """Get timeline for a ticket"""
    # Check if request exists and user has access
    request = await database.requests.find_one({"_id": ObjectId(request_id)})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    # Check permissions
    if current_user.role == "client" and request["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    if current_user.role not in ["agent", "manager", "admin"] and request["assigned_agent"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get timeline entries
    timeline = await database.timeline.find({"ticket_id": request_id}).sort("created_at", 1).to_list(None)

    # Get user information for each timeline event
    enriched_timeline = []
    for event in timeline:
        event_dict = {"id": str(event["_id"]), **{k: v for k, v in event.items() if k != "_id"}}

        # Try to get user name for the event author
        try:
            user = await database.users.find_one({"_id": ObjectId(event.get("user_id"))})
            if user:
                event_dict["user_name"] = user.get("name", "Unknown User")
                event_dict["user_role"] = user.get("role", "unknown")
            else:
                event_dict["user_name"] = "System"
                event_dict["user_role"] = "system"
        except:
            event_dict["user_name"] = "System"
            event_dict["user_role"] = "system"

        enriched_timeline.append(event_dict)

    return enriched_timeline

# Knowledge Base Management Endpoints

@app.get("/knowledge")
async def get_knowledge(
    q: Optional[str] = None,
    category: Optional[str] = None,
    tag: Optional[str] = None,
    status: Optional[str] = "published",
    current_user: User = Depends(get_current_user)
):
    """Get knowledge base articles with search and filtering"""
    query = {"status": status}

    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"content": {"$regex": q, "$options": "i"}},
            {"summary": {"$regex": q, "$options": "i"}},
            {"tags": {"$regex": q, "$options": "i"}}
        ]

    if category:
        query["category"] = category

    if tag:
        query["tags"] = {"$in": [tag]}

    knowledge = await database.knowledgebase.find(query).sort("created_at", -1).to_list(None)

    return [{
        "id": str(k["_id"]),
        "title": k.get("title", k.get("question", "")),  # Backward compatibility
        "content": k.get("content", k.get("answer", "")),  # Backward compatibility
        "summary": k.get("summary", ""),
        "category": k["category"],
        "tags": k.get("tags", []),
        "attachments": k.get("attachments", []),
        "links": k.get("links", []),
        "author": k.get("author", ""),
        "created_at": k.get("created_at"),
        "updated_at": k.get("updated_at"),
        "views": k.get("views", 0),
        "helpful_votes": k.get("helpful_votes", 0),
        "status": k.get("status", "published")
    } for k in knowledge]

@app.get("/knowledge/{article_id}")
async def get_knowledge_article(article_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific knowledge base article and increment view count"""
    try:
        # Increment view count
        await database.knowledgebase.update_one(
            {"_id": ObjectId(article_id)},
            {"$inc": {"views": 1}}
        )

        article = await database.knowledgebase.find_one({"_id": ObjectId(article_id)})
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")

        return {
            "id": str(article["_id"]),
            "title": article.get("title", article.get("question", "")),
            "content": article.get("content", article.get("answer", "")),
            "summary": article.get("summary", ""),
            "category": article["category"],
            "tags": article.get("tags", []),
            "attachments": article.get("attachments", []),
            "links": article.get("links", []),
            "author": article.get("author", ""),
            "created_at": article.get("created_at"),
            "updated_at": article.get("updated_at"),
            "views": article.get("views", 0),
            "helpful_votes": article.get("helpful_votes", 0),
            "status": article.get("status", "published")
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid article ID")

@app.post("/knowledge")
async def create_knowledge(
    title: str = Form(...),
    content: str = Form(...),
    summary: str = Form(...),
    category: str = Form(...),
    tags: str = Form(""),  # Comma-separated tags
    links: str = Form(""),  # JSON string of links
    status: str = Form("published"),
    files: List[UploadFile] = File([]),
    current_user: User = Depends(get_current_user)
):
    """Create a new knowledge base article with file attachments"""
    if current_user.role not in ["agent", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to create knowledge base articles")

    # Process tags
    tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()] if tags else []

    # Process links
    import json
    link_list = []
    if links:
        try:
            link_list = json.loads(links)
        except:
            link_list = []

    # Process file attachments
    attachments = []
    for file in files:
        if file.filename:
            # Generate unique filename
            file_extension = os.path.splitext(file.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = os.path.join(UPLOAD_DIR, unique_filename)

            # Save file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            attachments.append({
                "filename": file.filename,
                "stored_filename": unique_filename,
                "url": f"/uploads/{unique_filename}",
                "size": os.path.getsize(file_path),
                "content_type": file.content_type
            })

    # Create article
    article_data = {
        "title": title,
        "content": content,
        "summary": summary,
        "category": category,
        "tags": tag_list,
        "attachments": attachments,
        "links": link_list,
        "author": current_user.email,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "views": 0,
        "helpful_votes": 0,
        "status": status
    }

    result = await database.knowledgebase.insert_one(article_data)
    article_data["_id"] = str(result.inserted_id)
    article_data["id"] = str(result.inserted_id)

    return article_data

@app.put("/knowledge/{article_id}")
async def update_knowledge(
    article_id: str,
    title: str = Form(...),
    content: str = Form(...),
    summary: str = Form(...),
    category: str = Form(...),
    tags: str = Form(""),
    links: str = Form(""),
    status: str = Form("published"),
    files: List[UploadFile] = File([]),
    current_user: User = Depends(get_current_user)
):
    """Update an existing knowledge base article"""
    if current_user.role not in ["agent", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to update knowledge base articles")

    try:
        # Check if article exists
        existing_article = await database.knowledgebase.find_one({"_id": ObjectId(article_id)})
        if not existing_article:
            raise HTTPException(status_code=404, detail="Article not found")

        # Process tags
        tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()] if tags else []

        # Process links
        import json
        link_list = []
        if links:
            try:
                link_list = json.loads(links)
            except:
                link_list = []

        # Process new file attachments
        new_attachments = []
        for file in files:
            if file.filename:
                file_extension = os.path.splitext(file.filename)[1]
                unique_filename = f"{uuid.uuid4()}{file_extension}"
                file_path = os.path.join(UPLOAD_DIR, unique_filename)

                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)

                new_attachments.append({
                    "filename": file.filename,
                    "stored_filename": unique_filename,
                    "url": f"/uploads/{unique_filename}",
                    "size": os.path.getsize(file_path),
                    "content_type": file.content_type
                })

        # Combine existing and new attachments
        existing_attachments = existing_article.get("attachments", [])
        all_attachments = existing_attachments + new_attachments

        # Update article
        update_data = {
            "title": title,
            "content": content,
            "summary": summary,
            "category": category,
            "tags": tag_list,
            "attachments": all_attachments,
            "links": link_list,
            "updated_at": datetime.now(),
            "status": status
        }

        await database.knowledgebase.update_one(
            {"_id": ObjectId(article_id)},
            {"$set": update_data}
        )

        return {"message": "Article updated successfully", "id": article_id}

    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid article ID or update failed")

@app.delete("/knowledge/{article_id}")
async def delete_knowledge(article_id: str, current_user: User = Depends(get_current_user)):
    """Delete a knowledge base article"""
    if current_user.role not in ["agent", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete knowledge base articles")

    try:
        # Get article to delete associated files
        article = await database.knowledgebase.find_one({"_id": ObjectId(article_id)})
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")

        # Delete associated files
        for attachment in article.get("attachments", []):
            file_path = os.path.join(UPLOAD_DIR, attachment["stored_filename"])
            if os.path.exists(file_path):
                os.remove(file_path)

        # Delete article from database
        result = await database.knowledgebase.delete_one({"_id": ObjectId(article_id)})

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Article not found")

        return {"message": "Article deleted successfully"}

    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid article ID or deletion failed")

@app.post("/knowledge/{article_id}/vote")
async def vote_helpful(article_id: str, current_user: User = Depends(get_current_user)):
    """Vote an article as helpful"""
    try:
        result = await database.knowledgebase.update_one(
            {"_id": ObjectId(article_id)},
            {"$inc": {"helpful_votes": 1}}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Article not found")

        return {"message": "Vote recorded successfully"}

    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid article ID")

@app.delete("/knowledge/{article_id}/attachment/{filename}")
async def delete_attachment(
    article_id: str,
    filename: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a specific attachment from an article"""
    if current_user.role not in ["agent", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete attachments")

    try:
        # Get article
        article = await database.knowledgebase.find_one({"_id": ObjectId(article_id)})
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")

        # Find and remove attachment
        attachments = article.get("attachments", [])
        updated_attachments = []
        file_to_delete = None

        for attachment in attachments:
            if attachment["stored_filename"] == filename:
                file_to_delete = attachment
            else:
                updated_attachments.append(attachment)

        if not file_to_delete:
            raise HTTPException(status_code=404, detail="Attachment not found")

        # Delete file from filesystem
        file_path = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(file_path):
            os.remove(file_path)

        # Update article in database
        await database.knowledgebase.update_one(
            {"_id": ObjectId(article_id)},
            {"$set": {"attachments": updated_attachments, "updated_at": datetime.now()}}
        )

        return {"message": "Attachment deleted successfully"}

    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid article ID or deletion failed")

@app.get("/knowledge/categories")
async def get_categories(current_user: User = Depends(get_current_user)):
    """Get all unique categories"""
    categories = await database.knowledgebase.distinct("category")
    return {"categories": categories}

@app.get("/knowledge/tags")
async def get_tags(current_user: User = Depends(get_current_user)):
    """Get all unique tags"""
    # Get all articles and extract unique tags
    articles = await database.knowledgebase.find({}, {"tags": 1}).to_list(None)
    all_tags = []
    for article in articles:
        all_tags.extend(article.get("tags", []))
    unique_tags = list(set(all_tags))
    return {"tags": unique_tags}

# Category Management Endpoints

@app.get("/categories")
async def get_categories(current_user: User = Depends(get_current_user)):
    """Get all ticket categories"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get categories from database
    categories_cursor = await database.categories.find().to_list(None)
    categories = [cat["name"] for cat in categories_cursor]

    return {"categories": categories}

@app.post("/categories")
async def create_category(category: dict, current_user: User = Depends(get_current_user)):
    """Create a new category (admin/manager only)"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Check if category already exists
    existing = await database.categories.find_one({"name": category.get("name")})
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")

    # Save category to database
    result = await database.categories.insert_one({"name": category.get("name")})

    return {"message": "Category created successfully", "category": category, "id": str(result.inserted_id)}

@app.delete("/categories/{category_name}")
async def delete_category(category_name: str, current_user: User = Depends(get_current_user)):
    """Delete a category (admin/manager only)"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Decode URL-encoded category name
    decoded_category_name = category_name.replace('%20', ' ')

    # Delete category from database
    result = await database.categories.delete_one({"name": decoded_category_name})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")

    return {"message": "Category deleted successfully"}

@app.put("/categories/{category_name}")
async def update_category(category_name: str, category: dict, current_user: User = Depends(get_current_user)):
    """Update a category (admin/manager only)"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Decode URL-encoded category name
    decoded_category_name = category_name.replace('%20', ' ')

    # Update category in database
    result = await database.categories.update_one(
        {"name": decoded_category_name},
        {"$set": {"name": category.get("name", decoded_category_name)}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")

    return {"message": "Category updated successfully", "category": category}

@app.post("/chatbot/message")
async def chatbot_message(message: dict, current_user: User = Depends(get_current_user)):
    from chatbot_service import ChatbotService

    # Extract message text
    message_text = message.get("message", "")
    if not message_text:
        return {"response": "Please provide a message."}

    # Initialize chatbot service
    chatbot = ChatbotService(database)

    # Process the message
    response = await chatbot.process_message(message_text, current_user)

    return {"response": response}

# User Management Endpoints

@app.get("/users")
async def get_users(current_user: User = Depends(get_current_user)):
    """Get all users (admin only)"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    users = await database.users.find().to_list(None)
    # Convert ObjectId to string and exclude sensitive fields
    user_list = []
    for u in users:
        user_dict = {k: v for k, v in u.items() if k not in ["_id", "hashed_password"]}
        user_dict["id"] = str(u["_id"])
        # Ensure categories is always a list
        if "categories" not in user_dict:
            user_dict["categories"] = []
        elif not isinstance(user_dict["categories"], list):
            user_dict["categories"] = []
        user_list.append(user_dict)

    return user_list

@app.post("/users")
async def create_user(user_data: dict, current_user: User = Depends(get_current_user)):
    """Create a new user (admin/manager only)"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Check if user already exists
    existing_user = await database.users.find_one({"email": user_data.get("email")})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    user_dict = {
        "name": user_data.get("name"),
        "email": user_data.get("email"),
        "role": user_data.get("role"),
        "department_id": user_data.get("department_id"),
        "agent_level": user_data.get("agent_level"),
        "skills": user_data.get("skills", []),
        "categories": user_data.get("categories", []),
        "is_available": user_data.get("is_available", True),
        "max_concurrent_tickets": user_data.get("max_concurrent_tickets", 10),
        "hashed_password": get_password_hash(user_data.get("password")),
        "created_at": datetime.utcnow()
    }

    result = await database.users.insert_one(user_dict)
    user_dict["_id"] = str(result.inserted_id)

    return {"id": str(result.inserted_id), "message": "User created successfully"}

@app.put("/users/{user_id}")
async def update_user(user_id: str, update_data: dict, current_user: User = Depends(get_current_user)):
    """Update a user (admin/manager only)"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Remove password from update_data if present (should use separate endpoint)
    update_data.pop("password", None)
    update_data.pop("hashed_password", None)

    # Ensure categories is a list if provided
    if "categories" in update_data and not isinstance(update_data["categories"], list):
        update_data["categories"] = []

    result = await database.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "User updated successfully"}

@app.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_current_user)):
    """Delete a user (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete users")

    # Prevent deleting self
    if str(current_user.id) == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    result = await database.users.delete_one({"_id": ObjectId(user_id)})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "User deleted successfully"}

@app.get("/agents")
async def get_agents(current_user: User = Depends(get_current_user)):
    """Get all agents for assignment"""
    agents = await database.users.find({"role": "agent"}).to_list(None)
    return [{"id": str(a["_id"]), "name": a["name"], "email": a["email"], "skills": a.get("skills", []), "categories": a.get("categories", []), "agent_level": a.get("agent_level"), "is_available": a.get("is_available", True)} for a in agents]

@app.put("/agents/{agent_id}/skills")
async def update_agent_skills(agent_id: str, skills: List[str], current_user: User = Depends(get_current_user)):
    """Update agent skills (admin/manager only)"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await database.users.update_one(
        {"_id": ObjectId(agent_id)},
        {"$set": {"skills": skills}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Agent not found")

    return {"message": "Agent skills updated successfully"}

# Department Management Endpoints

@app.get("/departments")
async def get_departments(current_user: User = Depends(get_current_user)):
    """Get all departments"""
    departments = await database.departments.find().to_list(None)
    return [{"id": str(d["_id"]), **{k: v for k, v in d.items() if k != "_id"}} for d in departments]

@app.post("/departments")
async def create_department(department: dict, current_user: User = Depends(get_current_user)):
    """Create a new department (manager/admin only)"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    department["created_at"] = datetime.utcnow()
    result = await database.departments.insert_one(department)
    department["_id"] = str(result.inserted_id)

    return {"id": str(result.inserted_id), "message": "Department created successfully"}

# SLA Management Endpoints

@app.get("/sla/rules")
async def get_sla_rules(current_user: User = Depends(get_current_user)):
    """Get SLA rules"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    rules = await database.sla_rules.find().to_list(None)
    return [{"id": str(r["_id"]), **{k: v for k, v in r.items() if k != "_id"}} for r in rules]

@app.post("/sla/rules")
async def create_sla_rule(rule: dict, current_user: User = Depends(get_current_user)):
    """Create SLA rule (admin/manager only)"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await database.sla_rules.insert_one(rule)
    rule["_id"] = str(result.inserted_id)

    return {"id": str(result.inserted_id), "message": "SLA rule created successfully"}

@app.put("/sla/rules/{rule_id}")
async def update_sla_rule(rule_id: str, rule: dict, current_user: User = Depends(get_current_user)):
    """Update SLA rule (admin/manager only)"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await database.sla_rules.update_one(
        {"_id": ObjectId(rule_id)},
        {"$set": rule}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="SLA rule not found")

    return {"message": "SLA rule updated successfully"}

@app.delete("/sla/rules/{rule_id}")
async def delete_sla_rule(rule_id: str, current_user: User = Depends(get_current_user)):
    """Delete SLA rule (admin/manager only)"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await database.sla_rules.delete_one({"_id": ObjectId(rule_id)})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="SLA rule not found")

    return {"message": "SLA rule deleted successfully"}

@app.post("/sla/check")
async def check_sla_breaches(current_user: User = Depends(get_current_user)):
    """Manually trigger SLA check (admin/manager only)"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    await sla_service.check_sla_breaches()
    return {"message": "SLA check completed"}

# Ticket Status Management

@app.post("/requests/{request_id}/close")
async def close_ticket(
    request_id: str,
    status: str = Form("closed"),
    current_user: User = Depends(get_current_user)
):
    """Close or resolve a ticket"""
    request = await database.requests.find_one({"_id": ObjectId(request_id)})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    # Check permissions
    if current_user.role == "client" and request["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    if current_user.role not in ["agent", "manager", "admin"] and request["assigned_agent"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    update_data = {
        "status": status,
        "updated_at": datetime.utcnow()
    }

    if status == "resolved" or status == "closed":
        update_data["resolved_at"] = datetime.utcnow()
        if status == "closed":
            update_data["closed_at"] = datetime.utcnow()

        # Free up the agent - decrement ticket count
        if request.get("assigned_agent"):
            await database.users.update_one(
                {"_id": ObjectId(request["assigned_agent"])},
                {"$inc": {"current_ticket_count": -1}}
            )

            # Check if agent should return to active status after ticket closure
            updated_agent = await database.users.find_one({"_id": ObjectId(request["assigned_agent"])})
            if updated_agent and updated_agent.get("status") == "busy":
                # If agent was busy and now has capacity, mark as active
                current_count = updated_agent.get("current_ticket_count", 0)
                max_capacity = updated_agent.get("max_concurrent_tickets", 5)
                if current_count < max_capacity:
                    await database.users.update_one(
                        {"_id": ObjectId(request["assigned_agent"])},
                        {"$set": {"status": "active"}}
                    )
                    print(f"Agent {updated_agent['name']} returned to active status after ticket closure")

    await database.requests.update_one({"_id": ObjectId(request_id)}, {"$set": update_data})

    # Create timeline entry
    timeline_data = {
        "ticket_id": request_id,
        "user_id": str(current_user.id),
        "action_type": "status_changed",
        "description": f"Ticket {status}",
        "metadata": {"old_status": request.get("status"), "new_status": status},
        "created_at": datetime.utcnow()
    }
    await database.timeline.insert_one(timeline_data)

    # Create notification for the other party
    if current_user.role == "client":
        # Notify assigned agent
        if request.get("assigned_agent"):
            notification_data = {
                "user_id": request["assigned_agent"],
                "ticket_id": request_id,
                "type": "ticket_resolved" if status == "resolved" else "ticket_updated",
                "title": f"Ticket {status}",
                "message": f"Client has {status} ticket #{request_id[:8]}",
                "created_at": datetime.utcnow()
            }
            await database.notifications.insert_one(notification_data)
    else:
        # Notify client
        notification_data = {
            "user_id": request["user_id"],
            "ticket_id": request_id,
            "type": "ticket_resolved" if status == "resolved" else "ticket_updated",
            "title": f"Ticket {status}",
            "message": f"Your ticket #{request_id[:8]} has been {status}",
            "created_at": datetime.utcnow()
        }
        await database.notifications.insert_one(notification_data)

    return {"message": f"Ticket {status} successfully"}
    """Close or resolve a ticket"""
    request = await database.requests.find_one({"_id": ObjectId(request_id)})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    # Check permissions
    if current_user.role == "client" and request["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    if current_user.role not in ["agent", "manager", "admin"] and request["assigned_agent"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    update_data = {
        "status": status,
        "updated_at": datetime.utcnow()
    }

    if status == "resolved" or status == "closed":
        update_data["resolved_at"] = datetime.utcnow()
        if status == "closed":
            update_data["closed_at"] = datetime.utcnow()

        # Free up the agent - decrement ticket count
        if request.get("assigned_agent"):
            await database.users.update_one(
                {"_id": ObjectId(request["assigned_agent"])},
                {"$inc": {"current_ticket_count": -1}}
            )

            # Check if agent should return to active status after ticket closure
            updated_agent = await database.users.find_one({"_id": ObjectId(request["assigned_agent"])})
            if updated_agent and updated_agent.get("status") == "busy":
                # If agent was busy and now has capacity, mark as active
                current_count = updated_agent.get("current_ticket_count", 0)
                max_capacity = updated_agent.get("max_concurrent_tickets", 5)
                if current_count < max_capacity:
                    await database.users.update_one(
                        {"_id": ObjectId(request["assigned_agent"])},
                        {"$set": {"status": "active"}}
                    )
                    print(f"Agent {updated_agent['name']} returned to active status after ticket closure")

    await database.requests.update_one({"_id": ObjectId(request_id)}, {"$set": update_data})

    # Create timeline entry
    timeline_data = {
        "ticket_id": request_id,
        "user_id": str(current_user.id),
        "action_type": "status_changed",
        "description": f"Ticket {status}",
        "metadata": {"old_status": request.get("status"), "new_status": status},
        "created_at": datetime.utcnow()
    }
    await database.timeline.insert_one(timeline_data)

    # Create notification for the other party
    if current_user.role == "client":
        # Notify assigned agent
        if request.get("assigned_agent"):
            notification_data = {
                "user_id": request["assigned_agent"],
                "ticket_id": request_id,
                "type": "ticket_resolved" if status == "resolved" else "ticket_updated",
                "title": f"Ticket {status}",
                "message": f"Client has {status} ticket #{request_id[:8]}",
                "created_at": datetime.utcnow()
            }
            await database.notifications.insert_one(notification_data)
    else:
        # Notify client
        notification_data = {
            "user_id": request["user_id"],
            "ticket_id": request_id,
            "type": "ticket_resolved" if status == "resolved" else "ticket_updated",
            "title": f"Ticket {status}",
            "message": f"Your ticket #{request_id[:8]} has been {status}",
            "created_at": datetime.utcnow()
        }
        await database.notifications.insert_one(notification_data)

    return {"message": f"Ticket {status} successfully"}

# Analytics Dashboard Endpoints

@app.get("/analytics/dashboard-summary")
async def get_dashboard_summary(current_user: User = Depends(get_current_user)):
    """Get executive summary metrics for dashboard"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get total tickets
    total_tickets = await database.requests.count_documents({})

    # Get open tickets
    open_tickets = await database.requests.count_documents({"status": {"$in": ["open", "assigned", "in_progress"]}})

    # Get resolved today
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    resolved_today = await database.requests.count_documents({
        "status": {"$in": ["resolved", "closed"]},
        "updated_at": {"$gte": today}
    })

    # Get active agents
    active_agents = await database.users.count_documents({
        "role": "agent",
        "status": {"$in": ["active", "busy"]}
    })

    # Get escalated tickets
    escalated_count = await database.requests.count_documents({"escalated": True})

    # Calculate average resolution time (simplified - in hours)
    resolved_tickets = await database.requests.find(
        {"status": {"$in": ["resolved", "closed"]}, "created_at": {"$exists": True}, "updated_at": {"$exists": True}}
    ).to_list(None)

    avg_resolution_time = 0
    if resolved_tickets:
        total_hours = 0
        for ticket in resolved_tickets:
            if ticket.get("created_at") and ticket.get("updated_at"):
                time_diff = ticket["updated_at"] - ticket["created_at"]
                total_hours += time_diff.total_seconds() / 3600
        avg_resolution_time = round(total_hours / len(resolved_tickets), 1)

    # Calculate SLA compliance (simplified)
    sla_compliant = await database.requests.count_documents({
        "sla_breached": {"$ne": True},
        "status": {"$in": ["resolved", "closed"]}
    })
    total_resolved = len(resolved_tickets)
    sla_compliance = round((sla_compliant / total_resolved * 100), 1) if total_resolved > 0 else 0

    return {
        "total_tickets": total_tickets,
        "open_tickets": open_tickets,
        "resolved_today": resolved_today,
        "avg_resolution_time_hours": avg_resolution_time,
        "sla_compliance_percentage": sla_compliance,
        "active_agents": active_agents,
        "escalated_tickets": escalated_count
    }

@app.get("/analytics/ticket-status-distribution")
async def get_ticket_status_distribution(current_user: User = Depends(get_current_user)):
    """Get ticket distribution by status"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        {"$project": {"status": "$_id", "count": 1, "_id": 0}}
    ]

    result = await database.requests.aggregate(pipeline).to_list(None)

    # Ensure all statuses are represented
    status_counts = {item["status"]: item["count"] for item in result}
    all_statuses = ["open", "assigned", "in_progress", "resolved", "closed"]
    for status in all_statuses:
        if status not in status_counts:
            status_counts[status] = 0

    total = sum(status_counts.values())

    return {
        "distribution": [
            {"status": status, "count": count, "percentage": round(count/total*100, 1) if total > 0 else 0}
            for status, count in status_counts.items()
        ],
        "total": total
    }

@app.get("/analytics/category-breakdown")
async def get_category_breakdown(current_user: User = Depends(get_current_user)):
    """Get ticket breakdown by category"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$project": {"category": "$_id", "count": 1, "_id": 0}},
        {"$sort": {"count": -1}}
    ]

    result = await database.requests.aggregate(pipeline).to_list(None)
    total = sum(item["count"] for item in result)

    return {
        "categories": [
            {"category": item["category"] or "Uncategorized", "count": item["count"],
             "percentage": round(item["count"]/total*100, 1) if total > 0 else 0}
            for item in result
        ],
        "total": total
    }

@app.get("/analytics/agent-performance")
async def get_agent_performance(current_user: User = Depends(get_current_user)):
    """Get agent performance metrics"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get all agents
    agents = await database.users.find({"role": "agent"}).to_list(None)

    performance_data = []

    for agent in agents:
        agent_id = str(agent["_id"])
        agent_name = agent["name"]

        # Get tickets assigned to this agent
        agent_tickets = await database.requests.find({"assigned_agent": agent_id}).to_list(None)

        # Calculate metrics
        total_assigned = len(agent_tickets)
        resolved_tickets = [t for t in agent_tickets if t.get("status") in ["resolved", "closed"]]
        resolved_count = len(resolved_tickets)

        # Calculate average resolution time
        avg_resolution_time = 0
        if resolved_tickets:
            total_hours = 0
            for ticket in resolved_tickets:
                if ticket.get("created_at") and ticket.get("updated_at"):
                    time_diff = ticket["updated_at"] - ticket["created_at"]
                    total_hours += time_diff.total_seconds() / 3600
            avg_resolution_time = round(total_hours / len(resolved_tickets), 1)

        # Calculate SLA compliance for this agent
        sla_compliant = len([t for t in resolved_tickets if not t.get("sla_breached", False)])
        sla_percentage = round((sla_compliant / resolved_count * 100), 1) if resolved_count > 0 else 0

        # Current workload
        current_tickets = agent.get("current_ticket_count", 0)
        max_capacity = agent.get("max_concurrent_tickets", 5)
        status = agent.get("status", "active")

        performance_data.append({
            "agent_id": agent_id,
            "agent_name": agent_name,
            "total_assigned": total_assigned,
            "resolved_count": resolved_count,
            "avg_resolution_time_hours": avg_resolution_time,
            "sla_compliance_percentage": sla_percentage,
            "current_workload": current_tickets,
            "max_capacity": max_capacity,
            "status": status,
            "utilization_percentage": round((current_tickets / max_capacity * 100), 1) if max_capacity > 0 else 0
        })

    # Sort by resolution count descending
    performance_data.sort(key=lambda x: x["resolved_count"], reverse=True)

    return {"agents": performance_data}

@app.get("/analytics/ticket-trends")
async def get_ticket_trends(
    days: int = 30,
    group_by: str = "daily",  # daily, weekly, monthly
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get ticket trends over time with flexible grouping"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    # Build match conditions
    match_conditions = {"created_at": {"$gte": start_date, "$lte": end_date}}
    if category:
        match_conditions["category"] = category

    # Determine date format and grouping
    if group_by == "weekly":
        date_format = "%Y-%U"  # Year-Week
        period_label = "Week"
    elif group_by == "monthly":
        date_format = "%Y-%m"  # Year-Month
        period_label = "Month"
    else:  # daily
        date_format = "%Y-%m-%d"  # Year-Month-Day
        period_label = "Day"

    # Daily ticket creation trend
    pipeline_created = [
        {"$match": match_conditions},
        {"$group": {
            "_id": {"$dateToString": {"format": date_format, "date": "$created_at"}},
            "created": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]

    # Daily ticket resolution trend
    pipeline_resolved = [
        {"$match": {
            "updated_at": {"$gte": start_date, "$lte": end_date},
            "status": {"$in": ["resolved", "closed"]},
            **({"category": category} if category else {})
        }},
        {"$group": {
            "_id": {"$dateToString": {"format": date_format, "date": "$updated_at"}},
            "resolved": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]

    created_data = await database.requests.aggregate(pipeline_created).to_list(None)
    resolved_data = await database.requests.aggregate(pipeline_resolved).to_list(None)

    # Generate all periods in range
    periods = []
    current = start_date

    while current <= end_date:
        if group_by == "weekly":
            period_key = current.strftime("%Y-%U")
            current += timedelta(days=7)
        elif group_by == "monthly":
            period_key = current.strftime("%Y-%m")
            # Move to next month
            if current.month == 12:
                current = current.replace(year=current.year + 1, month=1, day=1)
            else:
                current = current.replace(month=current.month + 1, day=1)
        else:  # daily
            period_key = current.strftime("%Y-%m-%d")
            current += timedelta(days=1)

        if period_key not in [p["period"] for p in periods]:
            periods.append({"period": period_key, "created": 0, "resolved": 0})

    # Merge data
    trends = []
    for period in periods:
        period_key = period["period"]
        created_count = next((item["created"] for item in created_data if item["_id"] == period_key), 0)
        resolved_count = next((item["resolved"] for item in resolved_data if item["_id"] == period_key), 0)

        trends.append({
            "period": period_key,
            "created": created_count,
            "resolved": resolved_count,
            "net_change": resolved_count - created_count,
            "period_label": period_label
        })

    return {
        "trends": trends,
        "period_days": days,
        "group_by": group_by,
        "category_filter": category,
        "period_label": period_label
    }

@app.get("/analytics/sla-compliance")
async def get_sla_compliance(current_user: User = Depends(get_current_user)):
    """Get SLA compliance metrics"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Overall SLA compliance
    total_resolved = await database.requests.count_documents({"status": {"$in": ["resolved", "closed"]}})
    sla_compliant = await database.requests.count_documents({
        "status": {"$in": ["resolved", "closed"]},
        "sla_breached": {"$ne": True}
    })

    overall_compliance = round((sla_compliant / total_resolved * 100), 1) if total_resolved > 0 else 0

    # SLA by urgency level
    urgency_levels = ["urgent", "moderate", "mild"]
    sla_by_urgency = []

    for urgency in urgency_levels:
        resolved_by_urgency = await database.requests.count_documents({
            "status": {"$in": ["resolved", "closed"]},
            "urgency_level": urgency
        })
        compliant_by_urgency = await database.requests.count_documents({
            "status": {"$in": ["resolved", "closed"]},
            "urgency_level": urgency,
            "sla_breached": {"$ne": True}
        })

        compliance_pct = round((compliant_by_urgency / resolved_by_urgency * 100), 1) if resolved_by_urgency > 0 else 0

        sla_by_urgency.append({
            "urgency_level": urgency,
            "total_resolved": resolved_by_urgency,
            "compliant": compliant_by_urgency,
            "compliance_percentage": compliance_pct
        })

    # Recent SLA breaches (last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_breaches = await database.requests.count_documents({
        "sla_breached": True,
        "created_at": {"$gte": week_ago}
    })

    return {
        "overall_compliance": overall_compliance,
        "total_resolved": total_resolved,
        "sla_compliant": sla_compliant,
        "sla_breached": total_resolved - sla_compliant,
        "compliance_by_urgency": sla_by_urgency,
        "recent_breaches_7_days": recent_breaches
    }

@app.get("/analytics/priority-distribution")
async def get_priority_distribution(current_user: User = Depends(get_current_user)):
    """Get ticket distribution by priority and escalation status"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Priority distribution
    pipeline = [
        {"$group": {"_id": "$priority", "count": {"$sum": 1}}},
        {"$project": {"priority": "$_id", "count": 1, "_id": 0}},
        {"$sort": {"count": -1}}
    ]

    priority_data = await database.requests.aggregate(pipeline).to_list(None)
    total_tickets = sum(item["count"] for item in priority_data)

    # Escalation statistics
    total_escalated = await database.requests.count_documents({"escalated": True})
    escalation_rate = round((total_escalated / total_tickets * 100), 1) if total_tickets > 0 else 0

    # Priority with percentages
    priorities = []
    for item in priority_data:
        priority = item["priority"] or "unassigned"
        count = item["count"]
        percentage = round((count / total_tickets * 100), 1) if total_tickets > 0 else 0
        priorities.append({
            "priority": priority,
            "count": count,
            "percentage": percentage
        })

    return {
        "priorities": priorities,
        "escalation": {
            "total_escalated": total_escalated,
            "escalation_rate_percentage": escalation_rate,
            "total_tickets": total_tickets
        }
    }

# Reports Generation Endpoints

@app.post("/reports/generate")
async def generate_report(report_request: dict, current_user: User = Depends(get_current_user)):
    """Generate and return a report"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    report_type = report_request.get("type", "ticket_summary")
    date_range = report_request.get("date_range", "last_30_days")
    report_format = report_request.get("format", "pdf")

    # Calculate date range
    end_date = datetime.utcnow()
    if date_range == "last_7_days":
        start_date = end_date - timedelta(days=7)
    elif date_range == "last_30_days":
        start_date = end_date - timedelta(days=30)
    elif date_range == "last_90_days":
        start_date = end_date - timedelta(days=90)
    elif date_range == "last_quarter":
        start_date = end_date - timedelta(days=90)
    elif date_range == "last_year":
        start_date = end_date - timedelta(days=365)
    else:
        start_date = end_date - timedelta(days=30)

    # Generate report data based on type
    if report_type == "ticket_summary":
        report_data = await generate_ticket_summary_report(start_date, end_date)
    elif report_type == "sla_compliance":
        report_data = await generate_sla_compliance_report(start_date, end_date)
    elif report_type == "agent_productivity":
        report_data = await generate_agent_productivity_report(start_date, end_date)
    elif report_type == "ticket_trends":
        report_data = await generate_ticket_trends_report(start_date, end_date)
    else:
        raise HTTPException(status_code=400, detail="Invalid report type")

    # For now, return JSON data (in production, generate PDF/Excel)
    # This is a placeholder - actual PDF/Excel generation would require additional libraries
    return {
        "report_type": report_type,
        "date_range": f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
        "generated_at": datetime.utcnow().isoformat(),
        "generated_by": current_user.email,
        "data": report_data,
        "format": report_format,
        "note": "PDF/Excel generation requires additional libraries. Returning JSON data for now."
    }

async def generate_ticket_summary_report(start_date, end_date):
    """Generate ticket summary report data"""
    # Get total tickets in date range
    total_tickets = await database.requests.count_documents({
        "created_at": {"$gte": start_date, "$lte": end_date}
    })

    # Get status distribution
    status_pipeline = [
        {"$match": {"created_at": {"$gte": start_date, "$lte": end_date}}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_data = await database.requests.aggregate(status_pipeline).to_list(None)

    # Get category breakdown
    category_pipeline = [
        {"$match": {"created_at": {"$gte": start_date, "$lte": end_date}}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    category_data = await database.requests.aggregate(category_pipeline).to_list(None)

    # Calculate average resolution time
    resolved_tickets = await database.requests.find({
        "status": {"$in": ["resolved", "closed"]},
        "created_at": {"$gte": start_date, "$lte": end_date},
        "updated_at": {"$exists": True}
    }).to_list(None)

    avg_resolution_time = 0
    if resolved_tickets:
        total_hours = 0
        for ticket in resolved_tickets:
            if ticket.get("created_at") and ticket.get("updated_at"):
                time_diff = ticket["updated_at"] - ticket["created_at"]
                total_hours += time_diff.total_seconds() / 3600
        avg_resolution_time = round(total_hours / len(resolved_tickets), 1)

    # SLA compliance
    sla_compliant = len([t for t in resolved_tickets if not t.get("sla_breached", False)])
    sla_percentage = round((sla_compliant / len(resolved_tickets) * 100), 1) if resolved_tickets else 0

    return {
        "total_tickets": total_tickets,
        "status_distribution": {item["_id"]: item["count"] for item in status_data},
        "category_breakdown": {item["_id"] or "Uncategorized": item["count"] for item in category_data},
        "average_resolution_time_hours": avg_resolution_time,
        "sla_compliance_percentage": sla_percentage,
        "resolved_tickets": len(resolved_tickets)
    }

async def generate_sla_compliance_report(start_date, end_date):
    """Generate SLA compliance report data"""
    # Get resolved tickets in date range
    resolved_tickets = await database.requests.find({
        "status": {"$in": ["resolved", "closed"]},
        "created_at": {"$gte": start_date, "$lte": end_date}
    }).to_list(None)

    total_resolved = len(resolved_tickets)
    sla_compliant = len([t for t in resolved_tickets if not t.get("sla_breached", False)])
    overall_compliance = round((sla_compliant / total_resolved * 100), 1) if total_resolved > 0 else 0

    # SLA by urgency
    urgency_stats = {}
    for ticket in resolved_tickets:
        urgency = ticket.get("urgency_level", "mild")
        if urgency not in urgency_stats:
            urgency_stats[urgency] = {"total": 0, "compliant": 0}

        urgency_stats[urgency]["total"] += 1
        if not ticket.get("sla_breached", False):
            urgency_stats[urgency]["compliant"] += 1

    sla_by_urgency = {}
    for urgency, stats in urgency_stats.items():
        sla_by_urgency[urgency] = {
            "total_resolved": stats["total"],
            "compliant": stats["compliant"],
            "compliance_percentage": round((stats["compliant"] / stats["total"] * 100), 1) if stats["total"] > 0 else 0
        }

    # SLA breaches by day
    breach_pipeline = [
        {"$match": {
            "sla_breached": True,
            "created_at": {"$gte": start_date, "$lte": end_date}
        }},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    breach_trends = await database.requests.aggregate(breach_pipeline).to_list(None)

    return {
        "overall_compliance": overall_compliance,
        "total_resolved": total_resolved,
        "sla_compliant": sla_compliant,
        "sla_breached": total_resolved - sla_compliant,
        "compliance_by_urgency": sla_by_urgency,
        "breach_trends": {item["_id"]: item["count"] for item in breach_trends}
    }

async def generate_agent_productivity_report(start_date, end_date):
    """Generate agent productivity report data"""
    # Get all agents
    agents = await database.users.find({"role": "agent"}).to_list(None)

    agent_stats = []
    for agent in agents:
        agent_id = str(agent["_id"])

        # Get tickets assigned to this agent in date range
        agent_tickets = await database.requests.find({
            "assigned_agent": agent_id,
            "created_at": {"$gte": start_date, "$lte": end_date}
        }).to_list(None)

        total_assigned = len(agent_tickets)
        resolved_tickets = [t for t in agent_tickets if t["status"] in ["resolved", "closed"]]
        resolved_count = len(resolved_tickets)

        # Calculate average resolution time
        avg_time = 0
        if resolved_tickets:
            total_hours = sum(2 for _ in resolved_tickets)  # Simplified to 2 hours each
            avg_time = round(total_hours / len(resolved_tickets), 1)

        # SLA compliance for this agent
        sla_compliant = len([t for t in resolved_tickets if not t.get("sla_breached", False)])
        sla_percentage = round((sla_compliant / resolved_count * 100), 1) if resolved_count > 0 else 0

        # Utilization (simplified - based on current capacity)
        current_count = agent.get("current_ticket_count", 0)
        max_capacity = agent.get("max_concurrent_tickets", 5)
        utilization = round((current_count / max_capacity * 100), 1) if max_capacity > 0 else 0

        agent_stats.append({
            "agent_name": agent["name"],
            "total_assigned": total_assigned,
            "resolved_count": resolved_count,
            "avg_resolution_time_hours": avg_time,
            "sla_compliance_percentage": sla_percentage,
            "current_workload": current_count,
            "max_capacity": max_capacity,
            "utilization_percentage": utilization,
            "categories": agent.get("categories", [])
        })

    # Sort by resolved count
    agent_stats.sort(key=lambda x: x["resolved_count"], reverse=True)

    return {"agents": agent_stats}

async def generate_ticket_trends_report(start_date, end_date):
    """Generate ticket trends report data"""
    # Daily ticket creation and resolution trends
    date_range = []
    current_date = start_date
    while current_date <= end_date:
        date_range.append(current_date.strftime("%Y-%m-%d"))
        current_date += timedelta(days=1)

    trends = []
    for date_str in date_range:
        date_start = datetime.strptime(date_str, "%Y-%m-%d")
        date_end = date_start + timedelta(days=1)

        # Created tickets
        created = await database.requests.count_documents({
            "created_at": {"$gte": date_start, "$lt": date_end}
        })

        # Resolved tickets
        resolved = await database.requests.count_documents({
            "status": {"$in": ["resolved", "closed"]},
            "updated_at": {"$gte": date_start, "$lt": date_end}
        })

        trends.append({
            "date": date_str,
            "created": created,
            "resolved": resolved,
            "net_change": resolved - created
        })

    # Calculate summary statistics
    total_created = sum(t["created"] for t in trends)
    total_resolved = sum(t["resolved"] for t in trends)
    avg_daily_created = round(total_created / len(trends), 1)
    avg_daily_resolved = round(total_resolved / len(trends), 1)

    # Peak days
    peak_created = max(trends, key=lambda x: x["created"])
    peak_resolved = max(trends, key=lambda x: x["resolved"])

    return {
        "trends": trends,
        "summary": {
            "total_created": total_created,
            "total_resolved": total_resolved,
            "avg_daily_created": avg_daily_created,
            "avg_daily_resolved": avg_daily_resolved,
            "peak_created_day": peak_created["date"],
            "peak_created_count": peak_created["created"],
            "peak_resolved_day": peak_resolved["date"],
            "peak_resolved_count": peak_resolved["resolved"]
        }
    }

# Chatbot Analytics Endpoints

@app.get("/analytics/chatbot-summary")
async def get_chatbot_summary(current_user: User = Depends(get_current_user)):
    """Get chatbot interaction summary for analytics"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Total interactions
    total_interactions = await database.chatbot_interactions.count_documents({})

    # Interactions by feedback type
    feedback_pipeline = [
        {"$group": {"_id": "$user_feedback", "count": {"$sum": 1}}},
        {"$project": {"feedback": "$_id", "count": 1, "_id": 0}}
    ]
    feedback_data = await database.chatbot_interactions.aggregate(feedback_pipeline).to_list(None)

    # Resolution rate (interactions where user marked as helpful)
    resolved_count = await database.chatbot_interactions.count_documents({"resolved_by_chatbot": True})
    resolution_rate = round((resolved_count / total_interactions * 100), 1) if total_interactions > 0 else 0

    # Ticket creation rate
    ticket_created_count = await database.chatbot_interactions.count_documents({"ticket_created": True})
    ticket_creation_rate = round((ticket_created_count / total_interactions * 100), 1) if total_interactions > 0 else 0

    # Most used knowledge base articles
    kb_usage_pipeline = [
        {"$match": {"kb_article_id": {"$ne": None}}},
        {"$group": {"_id": "$kb_article_id", "title": {"$first": "$kb_article_title"}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    kb_usage = await database.chatbot_interactions.aggregate(kb_usage_pipeline).to_list(None)

    # Daily interaction trends (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    daily_pipeline = [
        {"$match": {"created_at": {"$gte": thirty_days_ago}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    daily_trends = await database.chatbot_interactions.aggregate(daily_pipeline).to_list(None)

    return {
        "total_interactions": total_interactions,
        "resolution_rate_percentage": resolution_rate,
        "ticket_creation_rate_percentage": ticket_creation_rate,
        "feedback_distribution": {item["feedback"]: item["count"] for item in feedback_data},
        "top_kb_articles": [
            {"article_id": item["_id"], "title": item["title"], "usage_count": item["count"]}
            for item in kb_usage
        ],
        "daily_trends": {item["_id"]: item["count"] for item in daily_trends}
    }

@app.get("/analytics/chatbot-efficiency")
async def get_chatbot_efficiency(
    days: int = 30,
    group_by: str = "daily",
    current_user: User = Depends(get_current_user)
):
    """Get chatbot efficiency metrics compared to manual ticket creation"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get date ranges for comparison
    now = datetime.utcnow()
    start_date = now - timedelta(days=days)

    # Total tickets created in date range
    total_tickets = await database.requests.count_documents({
        "created_at": {"$gte": start_date}
    })

    # Tickets created via chatbot
    chatbot_tickets = await database.chatbot_interactions.count_documents({
        "ticket_created": True,
        "created_at": {"$gte": start_date}
    })

    # Chatbot resolution rate
    total_chatbot_queries = await database.chatbot_interactions.count_documents({
        "created_at": {"$gte": start_date}
    })

    resolved_by_chatbot = await database.chatbot_interactions.count_documents({
        "resolved_by_chatbot": True,
        "created_at": {"$gte": start_date}
    })

    resolution_rate = round((resolved_by_chatbot / total_chatbot_queries * 100), 1) if total_chatbot_queries > 0 else 0

    # Average time saved per resolved query (estimated)
    # Assuming manual ticket resolution takes 2 hours, chatbot resolution takes 5 minutes
    time_saved_per_resolution = 2 * 60 - 5  # minutes
    total_time_saved = resolved_by_chatbot * time_saved_per_resolution

    # Cost savings (estimated - assuming $50/hour agent cost)
    hourly_rate = 50
    cost_saved_per_resolution = (time_saved_per_resolution / 60) * hourly_rate
    total_cost_saved = resolved_by_chatbot * cost_saved_per_resolution

    # Get chatbot interaction trends
    if group_by == "weekly":
        date_format = "%Y-%U"
        period_label = "Week"
    elif group_by == "monthly":
        date_format = "%Y-%m"
        period_label = "Month"
    else:  # daily
        date_format = "%Y-%m-%d"
        period_label = "Day"

    # Chatbot queries trend
    chatbot_trend_pipeline = [
        {"$match": {"created_at": {"$gte": start_date}}},
        {"$group": {
            "_id": {"$dateToString": {"format": date_format, "date": "$created_at"}},
            "total_queries": {"$sum": 1},
            "resolved": {"$sum": {"$cond": ["$resolved_by_chatbot", 1, 0]}},
            "tickets_created": {"$sum": {"$cond": ["$ticket_created", 1, 0]}}
        }},
        {"$sort": {"_id": 1}}
    ]
    chatbot_trends = await database.chatbot_interactions.aggregate(chatbot_trend_pipeline).to_list(None)

    # Manual ticket creation trend (excluding chatbot-created tickets)
    manual_trend_pipeline = [
        {"$match": {
            "created_at": {"$gte": start_date},
            "category": {"$ne": "Chatbot Generated"}  # Assuming chatbot tickets have this category
        }},
        {"$group": {
            "_id": {"$dateToString": {"format": date_format, "date": "$created_at"}},
            "manual_tickets": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    manual_trends = await database.requests.aggregate(manual_trend_pipeline).to_list(None)

    # Generate periods and merge data
    periods = []
    current = start_date
    while current <= now:
        if group_by == "weekly":
            period_key = current.strftime("%Y-%U")
            current += timedelta(days=7)
        elif group_by == "monthly":
            period_key = current.strftime("%Y-%m")
            if current.month == 12:
                current = current.replace(year=current.year + 1, month=1, day=1)
            else:
                current = current.replace(month=current.month + 1, day=1)
        else:  # daily
            period_key = current.strftime("%Y-%m-%d")
            current += timedelta(days=1)

        if period_key not in [p["period"] for p in periods]:
            periods.append({"period": period_key, "chatbot_queries": 0, "chatbot_resolved": 0, "manual_tickets": 0})

    # Merge chatbot data
    for period in periods:
        chatbot_data = next((item for item in chatbot_trends if item["_id"] == period["period"]), {})
        manual_data = next((item for item in manual_trends if item["_id"] == period["period"]), {})

        period["chatbot_queries"] = chatbot_data.get("total_queries", 0)
        period["chatbot_resolved"] = chatbot_data.get("resolved", 0)
        period["manual_tickets"] = manual_data.get("manual_tickets", 0)
        period["period_label"] = period_label

    return {
        "period_days": days,
        "group_by": group_by,
        "total_tickets_created": total_tickets,
        "tickets_from_chatbot": chatbot_tickets,
        "chatbot_ticket_percentage": round((chatbot_tickets / total_tickets * 100), 1) if total_tickets > 0 else 0,
        "total_chatbot_queries": total_chatbot_queries,
        "queries_resolved_by_chatbot": resolved_by_chatbot,
        "chatbot_resolution_rate_percentage": resolution_rate,
        "estimated_time_saved_minutes": total_time_saved,
        "estimated_cost_saved_usd": round(total_cost_saved, 2),
        "trends": periods,
        "assumptions": {
            "manual_resolution_time_minutes": 120,
            "chatbot_resolution_time_minutes": 5,
            "agent_hourly_rate_usd": hourly_rate
        }
    }