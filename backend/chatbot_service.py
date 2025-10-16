import re
import asyncio
from typing import List, Dict, Optional
from datetime import datetime
from models import User, RequestCreate, ChatbotInteraction
from bson import ObjectId
import uuid


class ChatbotService:
    def __init__(self, database):
        self.database = database
        self.current_session = None  # Track current conversation session
        
        # Define intent patterns
        self.intent_patterns = {
            'greeting': [
                r'\b(hi|hello|hey|good morning|good afternoon|good evening)\b',
                r'\bgreetings?\b'
            ],
            'help_request': [
                r'\b(help|support|assistance|problem|issue|trouble)\b',
                r'\b(can\'t|cannot|unable to|won\'t|will not)\b',
                r'\b(not working|broken|error|bug|fail)\b',
                r'\b(how to|how do i|how can i)\b',
                r'\b(need help with|help with)\b'
            ],
            'password_reset': [
                r'\b(password|pass|login|sign in|authentication)\b.*\b(reset|forgot|forgotten|change|recover)\b',
                r'\b(forgot|forgotten|lost)\b.*\b(password|pass|login)\b',
                r'\b(reset|change|recover)\b.*\b(password|pass|login)\b',
                r'\b(how do i|how to)\b.*\b(reset|change)\b.*\b(password|pass|login)\b'
            ],
            'computer_issues': [
                r'\b(computer|pc|laptop|desktop|machine)\b.*\b(not working|broken|slow|freeze|crash|start|boot|won\'t start|will not start)\b',
                r'\b(blue screen|bsod|restart|reboot|shutdown)\b',
                r'\b(hardware|software)\b.*\b(problem|issue|error)\b',
                r'\b(laptop|computer|pc)\b.*\b(slow|running slow|very slow)\b',
                r'\b(my computer|my laptop|my pc)\b.*\b(won\'t|will not|can\'t|cannot)\b'
            ],
            'network_issues': [
                r'\b(internet|network|wifi|connection|connectivity)\b.*\b(down|slow|not working|problem|issue)\b',
                r'\b(can\'t connect|cannot connect|no internet|no network)\b'
            ],
            'software_issues': [
                r'\b(application|app|software|program)\b.*\b(not working|crash|error|freeze|slow)\b',
                r'\b(microsoft|office|excel|word|outlook|teams)\b.*\b(problem|issue|error|not working|crash|crashing|keeps crashing)\b',
                r'\b(excel|word|outlook|teams|office)\b.*\b(crash|crashing|keeps crashing|not working|won\'t open|will not open)\b',
                r'\b(outlook|excel|word|teams|office)\b.*\b(is not working|not working)\b',
                r'\b(teams)\b.*\b(won\'t open|will not open|won\'t start)\b'
            ],
            'escalate': [
                r'\b(escalate|human|agent|person|speak to|talk to)\b',
                r'\b(not helpful|doesn\'t help|can\'t help|unable to help)\b',
                r'\b(manager|supervisor|senior)\b'
            ],
            'create_ticket': [
                r'\b(create|submit|open|file)\b.*\b(ticket|request|case)\b',
                r'\b(new ticket|new request|report issue)\b'
            ],
            'status_check': [
                r'\b(status|check|track|update)\b.*\b(ticket|request|case)\b',
                r'\b(my tickets|my requests|ticket status)\b'
            ]
        }
        
        # Define responses
        self.responses = {
            'greeting': [
                "Hello! I'm HelpMate, your IT support assistant. How can I help you today?",
                "Hi there! I'm here to help with your IT support needs. What can I assist you with?",
                "Good day! I'm HelpMate. Please describe your issue and I'll try to help or connect you with an agent."
            ],
            'password_reset': [
                "I can help you with password reset! Here's what you can try:\n1. Go to the login page and click 'Forgot Password'\n2. Enter your email address\n3. Check your email for reset instructions\n4. If you don't receive an email, contact IT support.\n\nWould you like me to create a ticket for further assistance?"
            ],
            'computer_issues': [
                "I understand you're having computer issues. Here are some basic troubleshooting steps:\n1. Try restarting your computer\n2. Check all cable connections\n3. Run Windows Update\n4. Check for any error messages\n\nIf these don't help, I can create a support ticket for you. Would you like me to do that?"
            ],
            'network_issues': [
                "Network connectivity issues can be frustrating. Let's try these steps:\n1. Check if your WiFi is connected\n2. Try disconnecting and reconnecting to WiFi\n3. Restart your router/modem\n4. Check if other devices have internet access\n\nIf the problem persists, I can escalate this to our network team. Shall I create a ticket?"
            ],
            'software_issues': [
                "Software problems can often be resolved with these steps:\n1. Close and restart the application\n2. Check for software updates\n3. Restart your computer\n4. Try running the software as administrator\n\nIf the issue continues, I can create a support ticket. Would you like me to help with that?"
            ],
            'escalate': [
                "I understand you'd like to speak with a human agent. I'll create a support ticket and assign it to our team. Please provide a brief description of your issue."
            ],
            'default': [
                "I'm here to help! Could you please describe your issue in more detail? I can assist with:\n• Password resets\n• Computer problems\n• Network issues\n• Software troubles\n• Creating support tickets\n\nOr type 'escalate' to speak with a human agent."
            ]
        }

    async def process_message(self, message: str, user: User) -> str:
        """Process user message and return appropriate response"""
        message_lower = message.lower().strip()

        # Initialize session if not exists
        if not self.current_session:
            self.current_session = str(uuid.uuid4())

        # Handle user feedback responses
        if message_lower in ['yes', 'y', 'helpful', 'resolved', 'thank you', 'thanks']:
            if user.id:
                await self._log_interaction(user.id, "", None, None, 'helpful', True, False)
            return "Great! I'm glad I could help. Is there anything else I can assist you with?"
        elif message_lower in ['no', 'n', 'not helpful', 'try again', 'different']:
            if user.id:
                await self._log_interaction(user.id, "", None, None, 'not_helpful', False, False)
            return "I understand. Could you please provide more details about your issue or rephrase your question?"
        elif message_lower in ['ticket', 'create ticket', 'support ticket', 'yes please']:
            if user.id:
                await self._log_interaction(user.id, "", None, None, 'ticket_created', False, True)
            return self._handle_ticket_creation_request()

        # Always search knowledge base first for any query
        kb_response = await self._search_knowledge_base(message_lower)
        if kb_response:
            # Extract article info for logging (this is a simplified extraction)
            article_info = self._extract_article_info(kb_response)
            if user.id:
                await self._log_interaction(user.id, message, article_info.get('id'), article_info.get('title'), 'kb_shown', False, False)
            return f"{kb_response}\n\n---\n\nWas this helpful?\n• Reply 'yes' if this resolved your issue\n• Reply 'no' to try a different search\n• Reply 'ticket' to create a support ticket"

        # Detect intent for fallback responses
        intent = self._detect_intent(message_lower)

        # Handle different intents when no KB results found
        if intent == 'greeting':
            return self._get_response('greeting')

        elif intent in ['password_reset', 'computer_issues', 'network_issues', 'software_issues']:
            return f"{self._get_response(intent)}\n\n---\n\nWould you like me to create a support ticket for further assistance?\n• Reply 'yes' to create a ticket\n• Reply 'no' to ask something else"

        elif intent == 'escalate':
            return await self._handle_escalation(message, user)

        elif intent == 'create_ticket':
            return self._handle_ticket_creation_request()

        elif intent == 'status_check':
            return await self._check_ticket_status(user)

        elif intent == 'help_request':
            return "I couldn't find specific help for that. Would you like me to create a support ticket?\n• Reply 'yes' to create a ticket\n• Reply 'no' to ask something else"

        else:
            return "I'm not sure how to help with that. Would you like me to create a support ticket?\n• Reply 'yes' to create a ticket\n• Reply 'no' to ask something else"

    def _detect_intent(self, message: str) -> str:
        """Detect user intent from message"""
        # Check specific intents first (more specific patterns)
        priority_intents = ['password_reset', 'computer_issues', 'network_issues', 'software_issues', 'escalate', 'create_ticket', 'status_check', 'greeting']

        for intent in priority_intents:
            if intent in self.intent_patterns:
                patterns = self.intent_patterns[intent]
                for pattern in patterns:
                    if re.search(pattern, message, re.IGNORECASE):
                        return intent

        # Check general help_request last
        if 'help_request' in self.intent_patterns:
            patterns = self.intent_patterns['help_request']
            for pattern in patterns:
                if re.search(pattern, message, re.IGNORECASE):
                    return 'help_request'

        return 'unknown'

    def _get_response(self, intent: str) -> str:
        """Get response for given intent"""
        responses = self.responses.get(intent, self.responses['default'])
        return responses[0] if isinstance(responses, list) else responses

    async def _search_knowledge_base(self, query: str) -> Optional[str]:
        """Search knowledge base for relevant articles, prioritizing by helpful votes"""
        try:
            # Search in questions and answers
            knowledge = await self.database.knowledgebase.find({
                "$or": [
                    {"question": {"$regex": query, "$options": "i"}},
                    {"answer": {"$regex": query, "$options": "i"}},
                    {"category": {"$regex": query, "$options": "i"}}
                ]
            }).to_list(None)  # Get all matches, not just limited

            if knowledge:
                # Sort by helpful votes (descending) to prioritize most helpful articles
                knowledge_sorted = sorted(knowledge, key=lambda x: x.get('helpful_votes', 0), reverse=True)
                best_match = knowledge_sorted[0]  # Most helpful article

                # Get the article content (support both old and new formats)
                question = best_match.get('question') or best_match.get('title', 'Article')
                answer = best_match.get('answer') or best_match.get('content', 'No content available')
                helpful_votes = best_match.get('helpful_votes', 0)

                # Add helpfulness indicator
                helpful_indicator = ""
                if helpful_votes > 0:
                    helpful_indicator = f" (👍 {helpful_votes} people found this helpful)"

                return f"📚 **{question}**{helpful_indicator}\n\n{answer}"

            # Try keyword matching if no direct matches
            keywords = self._extract_keywords(query)
            if keywords:
                for keyword in keywords:
                    knowledge = await self.database.knowledgebase.find({
                        "$or": [
                            {"question": {"$regex": keyword, "$options": "i"}},
                            {"answer": {"$regex": keyword, "$options": "i"}},
                            {"title": {"$regex": keyword, "$options": "i"}},
                            {"content": {"$regex": keyword, "$options": "i"}}
                        ]
                    }).to_list(None)

                    if knowledge:
                        # Sort by helpful votes and pick the best
                        knowledge_sorted = sorted(knowledge, key=lambda x: x.get('helpful_votes', 0), reverse=True)
                        match = knowledge_sorted[0]

                        question = match.get('question') or match.get('title', 'Article')
                        answer = match.get('answer') or match.get('content', 'No content available')
                        helpful_votes = match.get('helpful_votes', 0)

                        helpful_indicator = ""
                        if helpful_votes > 0:
                            helpful_indicator = f" (👍 {helpful_votes} people found this helpful)"

                        return f"📚 **{question}**{helpful_indicator}\n\n{answer}"

            return None
        except Exception as e:
            print(f"Knowledge base search error: {e}")
            return None

    def _extract_keywords(self, text: str) -> List[str]:
        """Extract relevant keywords from text"""
        # Common IT keywords
        keywords = []
        it_terms = [
            'password', 'login', 'computer', 'laptop', 'network', 'wifi', 'internet',
            'email', 'outlook', 'office', 'excel', 'word', 'teams', 'software',
            'application', 'error', 'crash', 'slow', 'freeze', 'restart', 'reboot',
            'update', 'install', 'printer', 'scanner', 'vpn', 'security'
        ]

        words = text.split()
        for word in words:
            clean_word = re.sub(r'[^\w]', '', word.lower())
            if clean_word in it_terms and len(clean_word) > 3:
                keywords.append(clean_word)

        return keywords[:3]  # Return top 3 keywords

    async def _log_interaction(self, user_id: str, query: str, kb_article_id: Optional[str],
                              kb_article_title: Optional[str], feedback: str,
                              resolved_by_chatbot: bool, ticket_created: bool):
        """Log chatbot interaction for analytics"""
        try:
            interaction_data = {
                "user_id": user_id,
                "user_query": query,
                "kb_article_id": kb_article_id,
                "kb_article_title": kb_article_title,
                "user_feedback": feedback,
                "resolved_by_chatbot": resolved_by_chatbot,
                "ticket_created": ticket_created,
                "session_id": self.current_session,
                "created_at": datetime.utcnow()
            }
            await self.database.chatbot_interactions.insert_one(interaction_data)
        except Exception as e:
            print(f"Error logging chatbot interaction: {e}")

    def _extract_article_info(self, kb_response: str) -> Dict[str, Optional[str]]:
        """Extract article ID and title from KB response for logging"""
        # This is a simplified extraction - in production, you might want to modify
        # the KB response format to include structured data
        lines = kb_response.split('\n')
        title = ""
        article_id = None

        for line in lines:
            if line.startswith('📚 **') and '**' in line:
                # Extract title from markdown format
                title_part = line.split('**')[1]
                if '(' in title_part:
                    title = title_part.split('(')[0].strip()
                else:
                    title = title_part.strip()
                break

        return {'id': article_id, 'title': title}

    def _handle_ticket_creation_request(self) -> str:
        """Handle ticket creation request by returning a special response"""
        return "SHOW_TICKET_FORM"  # Special response to trigger form display

    async def _handle_escalation(self, message: str, user: User) -> str:
        """Handle escalation request by creating a ticket"""
        try:
            # Create a new support ticket
            ticket_data = {
                "user_id": str(user.id),
                "title": "Chatbot Escalation Request",
                "description": f"User requested escalation. Original message: {message}",
                "category": "General",
                "priority": "medium",
                "status": "open",
                "created_at": datetime.utcnow()
            }
            
            result = await self.database.requests.insert_one(ticket_data)
            ticket_id = str(result.inserted_id)
            
            # Try to assign to an available agent
            agent = await self.database.agents.find_one({"available": True})
            if agent:
                await self.database.requests.update_one(
                    {"_id": result.inserted_id}, 
                    {"$set": {"assigned_agent": agent["user_id"], "status": "assigned"}}
                )
                await self.database.agents.update_one(
                    {"_id": agent["_id"]}, 
                    {"$set": {"available": False}}
                )
                
                return f"✅ I've created ticket #{ticket_id} and assigned it to an agent. You should hear back from our support team soon. Is there anything else I can help you with in the meantime?"
            else:
                return f"✅ I've created ticket #{ticket_id} for you. Our support team will review it and get back to you as soon as possible. Is there anything else I can help you with?"
                
        except Exception as e:
            print(f"Error creating escalation ticket: {e}")
            return "I apologize, but I'm having trouble creating a support ticket right now. Please try again later or contact support directly."

    async def _check_ticket_status(self, user: User) -> str:
        """Check user's ticket status"""
        try:
            tickets = await self.database.requests.find(
                {"user_id": str(user.id)}
            ).sort("created_at", -1).limit(5).to_list(None)
            
            if not tickets:
                return "You don't have any support tickets yet. Would you like me to create one for you?"
            
            response = "📋 **Your Recent Tickets:**\n\n"
            for ticket in tickets:
                ticket_id = str(ticket["_id"])[-6:]  # Last 6 chars for readability
                status = ticket.get("status", "unknown").title()
                title = ticket.get("title", "No title")
                created = ticket.get("created_at", "Unknown date")
                
                response += f"🎫 **#{ticket_id}** - {title}\n"
                response += f"   Status: {status} | Created: {created.strftime('%Y-%m-%d %H:%M') if isinstance(created, datetime) else created}\n\n"
            
            response += "Would you like me to help you with anything else?"
            return response
            
        except Exception as e:
            print(f"Error checking ticket status: {e}")
            return "I'm having trouble accessing your ticket information right now. Please try again later."
