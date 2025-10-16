# Agent Status and Load-Based Round Robin Assignment

## Current Implementation Review

### Agent Assignment Logic (main.py)
```python
async def assign_agent_to_ticket(ticket_id: str, required_skills: List[str], ticket_category: Optional[str] = None) -> Optional[str]:
    # Find agents with matching skills
    skill_query = {"role": "agent", "is_available": True}
    if required_skills:
        skill_query["skills"] = {"$in": required_skills}

    agents = await database.users.find(skill_query).to_list(None)

    if not agents:
        # Fallback: find any available agent
        agents = await database.users.find({"role": "agent", "is_available": True}).to_list(None)

    if not agents:
        return None

    # Simple assignment: pick first available agent
    assigned_agent = agents[0]
```

### Issues Identified
1. **No agent status field**: Currently uses `is_available` boolean
2. **No category-based filtering**: Assignment doesn't consider agent categories
3. **No load balancing**: Always picks first agent, no round robin
4. **No capacity limits**: No `max_concurrent_tickets` enforcement

## Enhanced Agent Assignment Design

### 1. Agent Status Field
**New field**: `status` in users collection
**Values**: 
- `"active"` - Available for ticket assignment
- `"inactive"` - Not available for assignment
- `"busy"` - At capacity, not available for new assignments
- `"offline"` - Logged out or unavailable

### 2. Agent Categories Field
**Existing field**: `categories` array
**Usage**: Filter agents by ticket category expertise
**Example**: `["Hardware Issues", "Software Issues"]`

### 3. Load Balancing Algorithm
**Current**: First available agent
**Enhanced**: Round robin with load balancing

#### Algorithm Steps:
1. **Filter by status**: Only `status: "active"` agents
2. **Filter by category**: Agents with matching `categories`
3. **Filter by capacity**: `current_ticket_count < max_concurrent_tickets`
4. **Sort by load**: Order by `current_ticket_count` ascending
5. **Round robin**: Use `last_assigned_at` for tie-breaking
6. **Fallback**: If no category matches, use general agents

### 4. Assignment Process

#### Primary Assignment (Category Match)
```javascript
// Find agents with matching category and status
const categoryAgents = await db.users.find({
  role: "agent",
  status: "active",
  categories: ticketCategory,
  current_ticket_count: { $lt: "$max_concurrent_tickets" }
}).sort({
  current_ticket_count: 1,  // Lightest load first
  last_assigned_at: 1       // Oldest assignment first (round robin)
}).limit(1);
```

#### Fallback Assignment (General Agents)
```javascript
// If no category match, find general agents
const generalAgents = await db.users.find({
  role: "agent", 
  status: "active",
  current_ticket_count: { $lt: "$max_concurrent_tickets" }
}).sort({
  current_ticket_count: 1,
  last_assigned_at: 1
}).limit(1);
```

#### Assignment Update
```javascript
// Update assigned agent
await db.requests.updateOne(
  { _id: ticketId },
  { 
    $set: { 
      assigned_agent: agentId,
      status: "assigned"
    }
  }
);

// Update agent load
await db.users.updateOne(
  { _id: agentId },
  { 
    $inc: { current_ticket_count: 1 },
    $set: { last_assigned_at: new Date() }
  }
);
```

## Database Schema Updates

### Users Collection
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  role: String,
  status: String, // "active", "inactive", "busy", "offline"
  categories: [String], // Ticket categories agent handles
  current_ticket_count: Number, // Current active tickets
  max_concurrent_tickets: Number, // Capacity limit
  last_assigned_at: Date, // For round robin
  department_id: ObjectId,
  // ... other fields
}
```

### Requests Collection
```javascript
{
  _id: ObjectId,
  category: String, // Used for agent matching
  assigned_agent: ObjectId,
  status: String,
  // ... other fields
}
```

## Implementation Phases

### Phase 1: Schema Updates
1. Add `status` field to users (default: "active")
2. Ensure `categories` field exists
3. Add `current_ticket_count`, `max_concurrent_tickets`, `last_assigned_at`

### Phase 2: Assignment Algorithm
1. Update `assign_agent_to_ticket()` function
2. Implement category-based filtering
3. Add load balancing logic
4. Add capacity checking

### Phase 3: Status Management
1. Add API endpoints for status updates
2. Update agent availability logic
3. Add status change triggers

### Phase 4: Testing & Monitoring
1. Test assignment distribution
2. Monitor load balancing effectiveness
3. Add logging for assignment decisions

## Benefits

1. **Fair Distribution**: Round robin prevents agent overload
2. **Category Expertise**: Tickets go to specialized agents
3. **Capacity Management**: Prevents over-assignment
4. **Status Control**: Manual control over agent availability
5. **Scalability**: Algorithm works with any number of agents

## Edge Cases Handled

1. **No available agents**: Ticket remains unassigned
2. **All agents at capacity**: No assignment until capacity frees up
3. **No category matches**: Falls back to general agents
4. **Agent status changes**: Real-time status updates
5. **Department constraints**: Future enhancement for department-based assignment

This design ensures intelligent, fair, and efficient ticket assignment based on agent expertise, availability, and current workload.