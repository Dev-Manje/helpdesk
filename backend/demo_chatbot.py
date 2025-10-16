import asyncio
import json
from chatbot_service import ChatbotService
from database import database
from models import User

class MockDatabase:
    """Mock database for demo purposes when MongoDB is not available"""
    def __init__(self):
        self.knowledge_data = [
            {
                "_id": "1",
                "question": "How to reset password?",
                "answer": "Go to settings and click 'Reset Password'. Follow the email instructions.",
                "category": "Account"
            },
            {
                "_id": "2", 
                "question": "Computer not starting",
                "answer": "Check power cable, try different outlet, contact IT support if issue persists.",
                "category": "IT"
            },
            {
                "_id": "3",
                "question": "How to connect to WiFi?",
                "answer": "1. Click the WiFi icon in system tray\n2. Select your network\n3. Enter password\n4. Click Connect\nIf issues persist, restart your computer and try again.",
                "category": "Network"
            },
            {
                "_id": "4",
                "question": "Outlook not receiving emails",
                "answer": "1. Check internet connection\n2. Verify email settings\n3. Check spam/junk folder\n4. Restart Outlook\n5. Contact IT if problem continues.",
                "category": "Email"
            }
        ]
        self.requests_data = []
        self.agents_data = [{"_id": "agent1", "user_id": "agent_user_1", "available": True}]
        
    class MockCollection:
        def __init__(self, data):
            self.data = data
            
        async def find(self, query=None):
            return MockCursor(self.data)
            
        async def insert_one(self, doc):
            doc["_id"] = f"new_id_{len(self.data)}"
            self.data.append(doc)
            return MockResult(doc["_id"])
            
        async def find_one(self, query):
            return self.data[0] if self.data else None
            
        async def update_one(self, query, update):
            return MockResult("updated")
    
    class MockCursor:
        def __init__(self, data):
            self.data = data
            
        def limit(self, n):
            return self
            
        def sort(self, field, order):
            return self
            
        async def to_list(self, length):
            return self.data
    
    class MockResult:
        def __init__(self, inserted_id):
            self.inserted_id = inserted_id
            self.modified_count = 1
    
    @property
    def knowledgebase(self):
        return self.MockCollection(self.knowledge_data)
        
    @property
    def requests(self):
        return self.MockCollection(self.requests_data)
        
    @property
    def agents(self):
        return self.MockCollection(self.agents_data)

async def demo_chatbot():
    print("🤖 HelpMate Chatbot Demo")
    print("=" * 50)
    print("This demo shows the chatbot's capabilities:")
    print("• Intent detection")
    print("• Knowledge base search")
    print("• Automatic ticket creation")
    print("• Escalation handling")
    print("=" * 50)
    
    # Create a test user
    test_user = User(
        _id="demo_user_id",
        name="Demo User",
        email="demo@example.com",
        role="user"
    )
    
    # Use mock database for demo
    mock_db = MockDatabase()
    chatbot = ChatbotService(mock_db)
    
    # Demo conversations
    conversations = [
        {
            "scenario": "Greeting",
            "message": "Hello"
        },
        {
            "scenario": "Password Reset Request",
            "message": "I forgot my password"
        },
        {
            "scenario": "Computer Issue",
            "message": "My computer won't start"
        },
        {
            "scenario": "Network Problem",
            "message": "I can't connect to WiFi"
        },
        {
            "scenario": "Software Issue",
            "message": "Outlook is not working"
        },
        {
            "scenario": "Escalation Request",
            "message": "I want to speak to an agent"
        },
        {
            "scenario": "Knowledge Base Query",
            "message": "How do I reset my password?"
        },
        {
            "scenario": "Complex Issue",
            "message": "My laptop is very slow and Excel keeps crashing"
        }
    ]
    
    for i, conv in enumerate(conversations, 1):
        print(f"\n🔹 Scenario {i}: {conv['scenario']}")
        print(f"User: {conv['message']}")
        
        try:
            response = await chatbot.process_message(conv['message'], test_user)
            print(f"Bot: {response}")
        except Exception as e:
            print(f"Bot: I'm experiencing technical difficulties. Error: {e}")
        
        print("-" * 40)
    
    print("\n✅ Demo completed!")
    print("\nKey Features Demonstrated:")
    print("• ✅ Intent Recognition (greeting, password, computer, network, software, escalation)")
    print("• ✅ Knowledge Base Integration")
    print("• ✅ Automatic Ticket Creation")
    print("• ✅ Contextual Responses")
    print("• ✅ Escalation Handling")

if __name__ == "__main__":
    asyncio.run(demo_chatbot())
